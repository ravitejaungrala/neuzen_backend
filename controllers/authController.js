// backend/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';

// ================== OTP SERVICE ==================
const otpStore = new Map();

const OTPService = {
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  
  storeOTP: (identifier, otp, type = 'general') => {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(identifier, { 
      otp, 
      expiresAt,
      attempts: 0,
      type: type,
      verified: false
    });
    console.log(`✅ OTP stored for ${identifier}: ${otp} (Type: ${type})`);
  },
  
  verifyOTP: (identifier, otp, type = null) => {
    const stored = otpStore.get(identifier);
    
    if (!stored) {
      console.log(`❌ OTP not found for identifier: ${identifier}`);
      return { valid: false, message: 'OTP not found or expired' };
    }
    
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(identifier);
      console.log(`❌ OTP expired for identifier: ${identifier}`);
      return { valid: false, message: 'OTP has expired' };
    }
    
    if (stored.attempts >= 3) {
      otpStore.delete(identifier);
      console.log(`❌ Too many attempts for identifier: ${identifier}`);
      return { valid: false, message: 'Too many attempts' };
    }
    
    if (type && stored.type !== type) {
      console.log(`❌ OTP type mismatch: Expected ${type}, got ${stored.type}`);
      return { valid: false, message: 'Invalid OTP type' };
    }
    
    if (stored.otp !== otp) {
      stored.attempts += 1;
      otpStore.set(identifier, stored);
      console.log(`❌ Invalid OTP attempt for ${identifier}: ${otp} (Expected: ${stored.otp})`);
      return { valid: false, message: 'Invalid OTP' };
    }
    
    // Mark as verified
    stored.verified = true;
    otpStore.set(identifier, stored);
    
    // For login OTPs, delete immediately. For reset OTPs, keep for final step
    if (type === 'login') {
      otpStore.delete(identifier);
      console.log(`✅ Login OTP verified and deleted for ${identifier}`);
    } else {
      console.log(`✅ Reset OTP verified (kept for final step) for ${identifier}`);
    }
    
    return { 
      valid: true, 
      message: 'OTP verified successfully', 
      data: stored 
    };
  },
  
  // Special function for password reset final step
  consumeResetOTP: (identifier, otp) => {
    const stored = otpStore.get(identifier);
    
    if (!stored) {
      console.log(`❌ Reset OTP not found for identifier: ${identifier}`);
      return { valid: false, message: 'OTP not found or expired' };
    }
    
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(identifier);
      console.log(`❌ Reset OTP expired for identifier: ${identifier}`);
      return { valid: false, message: 'OTP has expired' };
    }
    
    if (stored.type !== 'reset') {
      console.log(`❌ Not a reset OTP for identifier: ${identifier}`);
      return { valid: false, message: 'Invalid OTP type' };
    }
    
    if (!stored.verified) {
      console.log(`❌ Reset OTP not verified yet for ${identifier}`);
      return { valid: false, message: 'OTP needs to be verified first' };
    }
    
    if (stored.otp !== otp) {
      console.log(`❌ Reset OTP mismatch for ${identifier}: ${otp} (Expected: ${stored.otp})`);
      return { valid: false, message: 'Invalid OTP' };
    }
    
    // Finally delete the OTP after successful password reset
    otpStore.delete(identifier);
    console.log(`✅ Reset OTP consumed and deleted for ${identifier}`);
    
    return { 
      valid: true, 
      message: 'OTP validated successfully' 
    };
  },
  
  debugOTPStore: () => {
    console.log('\n🔍 ========== OTP STORE DEBUG ==========');
    console.log(`Total OTPs in store: ${otpStore.size}`);
    otpStore.forEach((value, key) => {
      const remaining = Math.max(0, Math.floor((value.expiresAt - Date.now()) / 1000));
      console.log(`Identifier: ${key}`);
      console.log(`  OTP: ${value.otp}`);
      console.log(`  Type: ${value.type}`);
      console.log(`  Verified: ${value.verified}`);
      console.log(`  Expires in: ${remaining} seconds`);
      console.log(`  Attempts: ${value.attempts}`);
    });
    console.log('🔍 ====================================\n');
  }
};

// ================== TOKEN FUNCTIONS ==================
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      companyName: user.companyName,
      avatar: user.avatar,
      isVerified: user.isVerified,
      profile: user.profile,
      preferences: user.preferences
    }
  });
};

// ================== CONTROLLER FUNCTIONS ==================

// Register user
export const register = async (req, res) => {
  try {
    const { fullName, email, mobile, password, companyName, role } = req.body;

    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'All fields are required' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobile }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        status: 'error',
        message: 'User already exists' 
      });
    }

    const user = new User({
      fullName,
      email,
      mobile,
      password,
      companyName: role === 'hr' ? companyName : undefined,
      role: role || 'candidate'
    });

    await user.save();

    if (role === 'hr' && companyName) {
      try {
        const company = new Company({
          name: companyName,
          createdBy: user._id,
          team: [{ user: user._id, role: 'admin' }]
        });
        await company.save();
      } catch (error) {
        console.log('Note: Company creation optional');
      }
    }

    console.log('\n🎉 ========== NEW REGISTRATION ==========');
    console.log(`👤 User: ${fullName}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📞 Mobile: ${mobile}`);
    console.log(`🎯 Role: ${role}`);
    console.log('🎉 =====================================\n');

    createSendToken(user, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error creating account'
    });
  }
};

// Login with email/password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email and password required' 
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Login successful for ${email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Login failed'
    });
  }
};

// Login with mobile number
export const loginWithPhone = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile number required' 
      });
    }

    const user = await User.findOne({ mobile });
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found. Please sign up.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Mobile login successful for ${mobile}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Mobile login failed'
    });
  }
};

// Request OTP for email (LOGIN)
export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const otp = OTPService.generateOTP();
    const identifier = `login-email-${email}`;
    OTPService.storeOTP(identifier, otp, 'login');

    console.log('\n📧 ========== EMAIL LOGIN OTP ==========');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`🔐 Identifier: ${identifier}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log('📧 =====================================\n');

    OTPService.debugOTPStore();

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        email: email,
        otp: otp,
        note: 'Check server console for OTP'
      }
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to generate OTP'
    });
  }
};

// Verify OTP for email
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email and OTP required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const identifier = `login-email-${email}`;
    console.log(`🔍 Verifying login OTP for identifier: ${identifier}`);
    
    const verification = OTPService.verifyOTP(identifier, otp, 'login');
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Email OTP login successful for ${email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'OTP verification failed'
    });
  }
};

// Request OTP for phone (LOGIN)
export const requestPhoneOTP = async (req, res) => {
  try {
    const { mobile, countryCode } = req.body;

    if (!mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile number required' 
      });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found. Please sign up.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const otp = OTPService.generateOTP();
    const identifier = `login-phone-${mobile}`;
    OTPService.storeOTP(identifier, otp, 'login');

    console.log('\n📱 ========== MOBILE LOGIN OTP ==========');
    console.log(`📞 Phone: ${countryCode || '+91'} ${mobile}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`🔐 Identifier: ${identifier}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log('📱 =====================================\n');

    OTPService.debugOTPStore();

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        mobile: mobile,
        countryCode: countryCode || '+91',
        otp: otp,
        note: 'Check server console for OTP'
      }
    });
  } catch (error) {
    console.error('Phone OTP request error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to generate OTP'
    });
  }
};

// Verify phone OTP
export const verifyPhoneOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile and OTP required' 
      });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const identifier = `login-phone-${mobile}`;
    console.log(`🔍 Verifying login OTP for identifier: ${identifier}`);
    
    const verification = OTPService.verifyOTP(identifier, otp, 'login');
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Mobile OTP login successful for ${mobile}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Phone OTP verification error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'OTP verification failed'
    });
  }
};

// Password Reset - Request OTP
export const forgotPassword = async (req, res) => {
  try {
    console.log('🔍 Forgot password request:', req.body);
    
    const { email, mobile, countryCode = '+91' } = req.body;

    // Check if at least one identifier is provided
    if (!email && !mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please provide either email or mobile number' 
      });
    }

    let user;
    let identifier;
    let contactInfo;
    let method;
    
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ 
          status: 'error',
          message: 'User with this email not found' 
        });
      }
      identifier = `reset-email-${email}`;
      contactInfo = email;
      method = 'email';
    } else {
      user = await User.findOne({ mobile });
      if (!user) {
        return res.status(404).json({ 
          status: 'error',
          message: 'User with this mobile number not found' 
        });
      }
      identifier = `reset-phone-${mobile}`;
      contactInfo = `${countryCode} ${mobile}`;
      method = 'mobile';
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account deactivated' 
      });
    }

    const otp = OTPService.generateOTP();
    OTPService.storeOTP(identifier, otp, 'reset');

    // Log OTP to console
    console.log('\n🔐 ========== PASSWORD RESET OTP ==========');
    console.log(`📝 Method: ${method}`);
    console.log(`📧 Contact: ${contactInfo}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`🔐 Identifier: ${identifier}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log(`💡 Note: This OTP will be kept for verification step`);
    console.log('🔐 =======================================\n');

    OTPService.debugOTPStore();

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        method: method,
        contact: method === 'email' ? email : mobile,
        countryCode: method === 'mobile' ? countryCode : undefined,
        otp: otp,
        identifier: identifier,
        note: 'OTP available in server console only'
      }
    });
  } catch (error) {
    console.error('Password reset OTP error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to generate OTP'
    });
  }
};

// Verify password reset OTP
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    console.log('🔍 Verify reset OTP request:', req.body);
    
    const { email, mobile, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ 
        status: 'error',
        message: 'OTP required' 
      });
    }

    let identifier;
    let user;
    
    if (email) {
      identifier = `reset-email-${email}`;
      user = await User.findOne({ email });
    } else if (mobile) {
      identifier = `reset-phone-${mobile}`;
      user = await User.findOne({ mobile });
    } else {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email or mobile required' 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    console.log(`🔍 Verifying reset OTP for identifier: ${identifier}`);
    
    const verification = OTPService.verifyOTP(identifier, otp, 'reset');
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    console.log(`✅ Reset OTP verified for ${email || mobile} (OTP kept for final step)`);

    res.json({
      status: 'success',
      message: 'OTP verified successfully',
      data: {
        verified: true,
        identifier: identifier,
        user: {
          id: user._id,
          email: user.email,
          mobile: user.mobile,
          fullName: user.fullName
        }
      }
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'OTP verification failed'
    });
  }
};

// Reset password with OTP
export const resetPassword = async (req, res) => {
  try {
    console.log('🔍 Reset password request:', req.body);
    
    const { email, mobile, otp, password } = req.body;

    if (!otp || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'OTP and password required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Password must be at least 6 characters' 
      });
    }

    let identifier;
    let user;
    
    if (email) {
      identifier = `reset-email-${email}`;
      user = await User.findOne({ email });
    } else if (mobile) {
      identifier = `reset-phone-${mobile}`;
      user = await User.findOne({ mobile });
    } else {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email or mobile required' 
      });
    }

    if (!user) {
      console.log(`❌ User not found for ${email || mobile}`);
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    console.log(`🔍 Final OTP consumption for identifier: ${identifier}`);
    
    // Use the consumeResetOTP function for the final step
    const verification = OTPService.consumeResetOTP(identifier, otp);
    if (!verification.valid) {
      console.log(`❌ Reset OTP consumption failed: ${verification.message}`);
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    // Update password
    user.password = password;
    await user.save();

    console.log(`✅ Password reset successful for ${email || mobile}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`📞 Mobile: ${user.mobile}`);

    OTPService.debugOTPStore();

    res.json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to get profile'
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Change password (authenticated user)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Both passwords required' 
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Current password incorrect' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Refresh token required' 
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      status: 'error',
      message: 'Invalid refresh token'
    });
  }
};

// Logout
export const logout = (req, res) => {
  res.json({
    status: 'success',
    message: 'Logged out'
  });
};

// Check email exists
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email required' 
      });
    }

    const user = await User.findOne({ email }).select('_id');
    
    res.json({
      status: 'success',
      data: {
        exists: !!user,
        email: email
      }
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to check email'
    });
  }
};

// Check mobile exists
export const checkMobile = async (req, res) => {
  try {
    const { mobile } = req.query;

    if (!mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile required' 
      });
    }

    const user = await User.findOne({ mobile }).select('_id');
    
    res.json({
      status: 'success',
      data: {
        exists: !!user,
        mobile: mobile
      }
    });
  } catch (error) {
    console.error('Check mobile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to check mobile'
    });
  }
};

// Debug OTP store
export const debugOTPStore = (req, res) => {
  const otps = Array.from(otpStore.entries()).map(([key, value]) => ({
    identifier: key,
    otp: value.otp,
    type: value.type,
    verified: value.verified,
    expiresAt: new Date(value.expiresAt).toISOString(),
    attempts: value.attempts,
    remainingTime: Math.max(0, Math.floor((value.expiresAt - Date.now()) / 1000))
  }));
  
  console.log('\n🔍 ========== OTP STORE DEBUG ==========');
  console.log(`Total OTPs: ${otpStore.size}`);
  otpStore.forEach((value, key) => {
    const remaining = Math.max(0, Math.floor((value.expiresAt - Date.now()) / 1000));
    console.log(`${key}: ${value.otp} (${value.type}, verified: ${value.verified}, ${remaining}s left)`);
  });
  console.log('🔍 ====================================\n');
  
  res.json({
    status: 'success',
    count: otpStore.size,
    otps: otps,
    timestamp: new Date().toISOString()
  });
};

// Test email endpoint
// export const testEmail = async (req, res) => {
//   try {
//     const { email } = req.body;
    
//     if (!email) {
//       return res.status(400).json({ 
//         status: 'error',
//         message: 'Email required' 
//       });
//     }
    
//     const otp = '123456';
    
//     console.log('\n🧪 ========== TEST EMAIL ==========');
//     console.log(`📧 Email: ${email}`);
//     console.log(`🔑 Test OTP: ${otp}`);
//     console.log('🧪 ===============================\n');
    
//     res.json({
//       status: 'success',
//       message: 'Test OTP logged to console',
//       data: {
//         email: email,
//         otp: otp,
//         environment: process.env.NODE_ENV
//       }
//     });
//   } catch (error) {
//     console.error('Test email error:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Test failed',
//       error: error.message
//     });
//   }
};
