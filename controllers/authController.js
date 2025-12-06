// backend/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Company from '../models/Company.js';

// ================== EMAIL SERVICE ==================
const createTransporter = () => {
  try {
    // Development mode: Use mock emails if configured
    if (process.env.ENABLE_MOCK_EMAILS === 'true') {
      console.log('📧 Using mock email service (development mode)');
      return {
        sendMail: async (mailOptions) => {
          console.log('📧 [MOCK EMAIL]:', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            html: mailOptions.html ? 'HTML email content' : mailOptions.text
          });
          
          // Store OTP in console for development
          if (mailOptions.subject?.includes('OTP')) {
            const otpMatch = mailOptions.html?.match(/\d{6}/);
            if (otpMatch) {
              console.log(`🔑 [DEV OTP]: ${otpMatch[0]} sent to ${mailOptions.to}`);
            }
          }
          
          return { messageId: 'mock-message-id-' + Date.now() };
        }
      };
    }

    // Production: Use real SMTP
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('⚠️ SMTP credentials not configured. Using mock emails.');
      return {
        sendMail: async (mailOptions) => {
          console.log('📧 [NO SMTP CONFIG]: Email would be sent to:', mailOptions.to);
          console.log('📧 Subject:', mailOptions.subject);
          return { messageId: 'no-smtp-config-' + Date.now() };
        }
      };
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
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

const EmailService = {
  sendWelcomeEmail: async (email, name) => {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🎉 Welcome to HireGen AI!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome ${name}!</h2>
            <p>Thank you for joining HireGen AI.</p>
            <p>Start exploring AI-powered hiring today.</p>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      return false;
    }
  },

  sendOTP: async (email, name, otp) => {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `Your OTP: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${name},</h2>
            <p>Your OTP for HireGen AI login is:</p>
            <h1 style="color: #f97316; font-size: 48px; letter-spacing: 10px;">${otp}</h1>
            <p>This OTP is valid for 10 minutes.</p>
            <p><strong>Note:</strong> Never share this OTP with anyone.</p>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email}: ${otp}`);
      return true;
    } catch (error) {
      console.error('❌ OTP email failed:', error);
      return false;
    }
  },

  sendPasswordReset: async (email, name, resetURL) => {
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hello ${name},</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetURL}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link expires in 10 minutes.</p>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Password reset email failed:', error);
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

    // Send OTP email
    const emailSent = await EmailService.sendOTP(email, user.fullName, otp);
    
    if (!emailSent && process.env.NODE_ENV === 'development') {
      console.log(`🔑 [DEV OTP FOR ${email}]: ${otp}`);
    }

    res.json({
      status: 'success',
      message: 'OTP sent successfully',
      data: {
        remainingTime: OTPService.getRemainingTime(email),
        email: email,
        // In development, return OTP for testing
        ...(process.env.NODE_ENV === 'development' && { otp: otp })
      }
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to send OTP'
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

// Request OTP for phone (development/testing)
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

    console.log(`📱 [DEV PHONE OTP FOR ${countryCode}${mobile}]: ${otp}`);

    res.json({
      status: 'success',
      message: 'OTP generated successfully',
      data: {
        otp: otp, // Always return OTP for development
        mobile: mobile,
        countryCode: countryCode,
        note: 'Development mode - OTP shown for testing'
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

// Change password
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

// Forgot password
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

    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await EmailService.sendPasswordReset(email, user.fullName, resetURL);

    res.json({
      status: 'success',
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to send reset email'
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

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
        message: 'Invalid or expired token' 
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
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
    const success = await EmailService.sendOTP(email, 'Test User', otp);
    
    res.json({
      status: 'success',
      message: success ? 'Test email sent' : 'Test email failed',
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
      message: 'Test email failed',
      error: error.message
    });
  }
};
