// backend/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Company from '../models/Company.js';

// Mock email service
const EmailService = {
  sendWelcomeEmail: async (email, name) => {
    console.log(`Welcome email sent to ${email} for ${name}`);
    return true;
  },
  sendOTP: async (email, name, otp) => {
    console.log(`OTP ${otp} sent to ${email} for ${name}`);
    return true;
  },
  sendPasswordReset: async (email, name, resetURL) => {
    console.log(`Password reset link sent to ${email}: ${resetURL}`);
    return true;
  }
};

// Mock OTP service
const OTPService = {
  generateOTP: () => Math.floor(100000 + Math.random() * 900000).toString(),
  storeOTP: (email, otp) => {
    console.log(`OTP stored for ${email}: ${otp}`);
  },
  verifyOTP: (email, otp) => {
    console.log(`Verifying OTP for ${email}: ${otp}`);
    return { valid: true, message: 'OTP verified successfully' };
  },
  getRemainingTime: (email) => 600
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret-key', { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Remove password from output
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

// Register user
export const register = async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const { fullName, email, mobile, password, companyName, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobile }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or mobile already exists' 
      });
    }

    // Validate role-specific requirements
    if (role === 'hr' && !companyName) {
      return res.status(400).json({
        message: 'Company name is required for HR professionals'
      });
    }

    console.log('Creating new user...');
    
    // Create user
    const user = new User({
      fullName,
      email,
      mobile,
      password,
      companyName: role === 'hr' ? companyName : undefined,
      role
    });

    console.log('User object created, saving to database...');
    
    // Save user to database
    await user.save();
    
    console.log('User saved successfully with ID:', user._id);

    // Create company for HR users
    if (role === 'hr' && companyName) {
      try {
        const company = new Company({
          name: companyName,
          createdBy: user._id,
          team: [{
            user: user._id,
            role: 'admin',
            permissions: ['all']
          }],
          stats: {
            totalJobs: 0,
            activeJobs: 0,
            totalCandidates: 0,
            totalHires: 0,
            avgTimeToHire: 0
          }
        });
        
        await company.save();
        console.log('Company created for HR user:', company._id);
      } catch (companyError) {
        console.error('Error creating company:', companyError);
        // Don't fail registration if company creation fails
      }
    }

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(email, fullName);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    // Send response immediately after successful save
    createSendToken(user, 201, res);
    
  } catch (error) {
    console.error('Registration error details:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation Error',
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User with this email or mobile already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Error creating user account',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Login user with email/password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account has been deactivated' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// NEW: Login with mobile number (for OTP)
export const loginWithPhone = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ 
        message: 'Mobile number is required' 
      });
    }

    // Find user by mobile number
    const user = await User.findOne({ mobile });
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No account found with this mobile number. Please sign up first.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated' 
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error logging in with mobile',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Request OTP for email
export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found with this email' 
      });
    }

    // Generate and store OTP
    const otp = OTPService.generateOTP();
    OTPService.storeOTP(email, otp);

    // Send OTP via email
    await EmailService.sendOTP(email, user.fullName, otp);

    res.json({ 
      message: 'OTP sent successfully to your email',
      remainingTime: OTPService.getRemainingTime(email)
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ 
      message: 'Error sending OTP',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Verify OTP for email
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        message: 'Email and OTP are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Verify OTP
    const verification = OTPService.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        message: verification.message 
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      message: 'Error verifying OTP',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
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
      data: {
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
          preferences: user.preferences,
          applications: user.applications,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, mobile, companyName, avatar, preferences, profile } = req.body;
    
    const updateData = {
      fullName,
      mobile,
      ...(req.user.role === 'hr' && { companyName }),
      avatar,
      preferences,
      profile
    };

    // Remove password field to avoid triggering password hashing
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        companyName: user.companyName,
        avatar: user.avatar,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Current password and new password are required' 
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Check current password
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Current password is incorrect' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found with this email' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save reset token to user
    await User.updateOne(
      { _id: user._id },
      {
        passwordResetToken,
        passwordResetExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
      }
    );

    // Send email with reset link
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await EmailService.sendPasswordReset(email, user.fullName, resetURL);

    res.json({
      status: 'success',
      message: 'Password reset token sent to your email!'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error sending password reset email',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Token and password are required' 
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Token is invalid or has expired' 
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
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
        message: 'Refresh token is required' 
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User belonging to this token no longer exists' 
      });
    }

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      status: 'error',
      message: 'Invalid refresh token',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
  }
};
