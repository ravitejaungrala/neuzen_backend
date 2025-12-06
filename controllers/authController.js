// backend/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Company from '../models/Company.js';

// ================== EMAIL SERVICE ==================
const createTransporter = () => {
  try {
    // Development mode: Always use console logging
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
      console.log('📧 Using console-only email service');
      return {
        sendMail: async (mailOptions) => {
          console.log('📧 [CONSOLE EMAIL LOG]:');
          console.log('To:', mailOptions.to);
          console.log('Subject:', mailOptions.subject);
          
          // Extract OTP from email content for logging
          if (mailOptions.html && mailOptions.html.includes('OTP')) {
            const otpMatch = mailOptions.html.match(/\b\d{6}\b/);
            if (otpMatch) {
              console.log(`🔑 [OTP FOR ${mailOptions.to}]: ${otpMatch[0]}`);
            }
          }
          
          return { messageId: 'console-log-' + Date.now() };
        }
      };
    }

    // Production: Try to use real SMTP if configured
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    return null;
  }
};

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log(`📧 [NO SMTP]: Email would be sent to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      return { success: true, message: 'Console logged' };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@hiregen.ai',
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${subject}`);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Email error to ${to}:`, error.message);
    console.log(`📧 [FALLBACK LOG FOR ${to}]: ${subject}`);
    return { success: false, error: error.message };
  }
};

const EmailService = {
  sendWelcomeEmail: async (email, name) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to HireGen AI!</h2>
          <p>Hello ${name},</p>
          <p>Your account has been created successfully.</p>
          <p>Thank you for joining our platform!</p>
        </div>
      `;
      const result = await sendEmail(email, 'Welcome to HireGen AI!', html);
      
      if (result.success) {
        console.log(`✅ Welcome email logged for ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Welcome email error:', error);
      return false;
    }
  },

  sendOTP: async (email, name, otp) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Login OTP</h2>
          <p>Hello ${name},</p>
          <p>Your OTP for login is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP expires in 10 minutes.</p>
        </div>
      `;
      
      const result = await sendEmail(email, `Your OTP: ${otp}`, html);
      
      // Always log OTP to console
      console.log('\n📧 ========== EMAIL OTP ==========');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 User: ${name}`);
      console.log(`🔑 OTP: ${otp}`);
      console.log(`⏱️ Expires: 10 minutes`);
      console.log('📧 ===============================\n');
      
      return true;
    } catch (error) {
      console.error('OTP email error:', error);
      console.log(`📧 [ERROR OTP FOR ${email}]: ${otp}`);
      return false;
    }
  },

  sendPasswordResetOTP: async (email, name, otp) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset OTP</h2>
          <p>Hello ${name},</p>
          <p>Your password reset OTP is:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP expires in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `;
      
      const result = await sendEmail(email, 'Password Reset OTP', html);
      
      console.log('\n🔐 ========== PASSWORD RESET OTP ==========');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 User: ${name}`);
      console.log(`🔑 OTP: ${otp}`);
      console.log(`⏱️ Expires: 10 minutes`);
      console.log('🔐 =======================================\n');
      
      return true;
    } catch (error) {
      console.error('Password reset OTP error:', error);
      console.log(`🔐 [PASSWORD RESET OTP FOR ${email}]: ${otp}`);
      return false;
    }
  }
};

// ================== OTP SERVICE ==================
const otpStore = new Map();

const OTPService = {
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  
  storeOTP: (identifier, otp) => {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(identifier, { 
      otp, 
      expiresAt,
      attempts: 0
    });
    console.log(`✅ OTP stored for ${identifier}: ${otp}`);
  },
  
  verifyOTP: (identifier, otp) => {
    const stored = otpStore.get(identifier);
    
    if (!stored) {
      return { valid: false, message: 'OTP not found or expired' };
    }
    
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(identifier);
      return { valid: false, message: 'OTP has expired' };
    }
    
    if (stored.attempts >= 3) {
      otpStore.delete(identifier);
      return { valid: false, message: 'Too many attempts' };
    }
    
    if (stored.otp !== otp) {
      stored.attempts += 1;
      otpStore.set(identifier, stored);
      return { valid: false, message: 'Invalid OTP' };
    }
    
    otpStore.delete(identifier);
    return { valid: true, message: 'OTP verified successfully' };
  },
  
  getRemainingTime: (identifier) => {
    const stored = otpStore.get(identifier);
    if (!stored) return 0;
    return Math.max(0, Math.floor((stored.expiresAt - Date.now()) / 1000));
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

    // Send welcome email async
    EmailService.sendWelcomeEmail(email, fullName).catch(console.error);

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

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Mobile login failed'
    });
  }
};

// Request OTP for email
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
    OTPService.storeOTP(email, otp);

    // Send OTP email (logs to console in development)
    await EmailService.sendOTP(email, user.fullName, otp);

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        email: email,
        otp: otp,
        note: 'Check browser console (F12) for OTP details'
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

    const verification = OTPService.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'OTP verification failed'
    });
  }
};

// Request OTP for phone
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
    const identifier = `phone-${mobile}`;
    OTPService.storeOTP(identifier, otp);

    // Log OTP to console
    console.log('\n📱 ========== MOBILE OTP ==========');
    console.log(`📞 Phone: ${countryCode || '+91'} ${mobile}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log('📱 ================================\n');

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        mobile: mobile,
        countryCode: countryCode || '+91',
        otp: otp,
        note: 'Check browser console (F12) for OTP details'
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

    const identifier = `phone-${mobile}`;
    const verification = OTPService.verifyOTP(identifier, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Phone OTP verification error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'OTP verification failed'
    });
  }
};

// Request password reset OTP
export const requestPasswordResetOTP = async (req, res) => {
  try {
    const { email, mobile, countryCode = '+91', method = 'email' } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email or mobile required' 
      });
    }

    let user;
    let identifier;
    let contactInfo;
    
    if (method === 'email') {
      user = await User.findOne({ email });
      identifier = `reset-email-${email}`;
      contactInfo = email;
    } else {
      user = await User.findOne({ mobile });
      identifier = `reset-phone-${mobile}`;
      contactInfo = `${countryCode} ${mobile}`;
    }

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
    OTPService.storeOTP(identifier, otp);

    // Log OTP to console
    console.log('\n🔐 ========== PASSWORD RESET OTP ==========');
    console.log(`📝 Method: ${method}`);
    console.log(`📧 Contact: ${contactInfo}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log('🔐 =======================================\n');

    // Try to send email if method is email
    if (method === 'email') {
      await EmailService.sendPasswordResetOTP(email, user.fullName, otp);
    }

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        [method === 'email' ? 'email' : 'mobile']: method === 'email' ? email : mobile,
        countryCode: method === 'mobile' ? countryCode : undefined,
        otp: otp,
        note: 'Check browser console (F12) for OTP details'
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
    const { email, mobile, countryCode = '+91', otp } = req.body;

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

    const verification = OTPService.verifyOTP(identifier, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    res.json({
      status: 'success',
      message: 'OTP verified successfully',
      data: {
        verified: true,
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
export const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, mobile, countryCode = '+91', otp, password } = req.body;

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
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Verify OTP one more time
    const verification = OTPService.verifyOTP(identifier, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    // Update password
    user.password = password;
    await user.save();

    console.log(`✅ Password reset successful for ${email || mobile}`);

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

// Old forgot password (token-based - kept for compatibility)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // For compatibility, use OTP method
    const otp = OTPService.generateOTP();
    const identifier = `reset-email-${email}`;
    OTPService.storeOTP(identifier, otp);

    console.log('\n🔐 ========== PASSWORD RESET OTP ==========');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User: ${user.fullName}`);
    console.log(`🔑 OTP: ${otp}`);
    console.log(`⏱️ Expires: 10 minutes`);
    console.log('🔐 =======================================\n');

    await EmailService.sendPasswordResetOTP(email, user.fullName, otp);

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        email: email,
        otp: otp,
        note: 'Check browser console (F12) for OTP details'
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to process request'
    });
  }
};

// Old reset password (token-based - kept for compatibility)
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // For compatibility with old links
    if (token && password) {
      // This is a simplified version - in production, you'd verify the token
      return res.json({
        status: 'success',
        message: 'Use OTP reset method for better security'
      });
    }

    return res.status(400).json({ 
      status: 'error',
      message: 'Use OTP reset method' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to reset password'
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

// Test email endpoint
export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email required' 
      });
    }
    
    const otp = '123456';
    
    console.log('\n🧪 ========== TEST EMAIL ==========');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Test OTP: ${otp}`);
    console.log('🧪 ===============================\n');
    
    res.json({
      status: 'success',
      message: 'Test OTP logged to console',
      data: {
        email: email,
        otp: otp,
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Test failed',
      error: error.message
    });
  }
};
