// backend/controllers/authController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import Company from '../models/Company.js';

// ================== EMAIL SERVICE CONFIGURATION ==================
// Create transporter for sending emails
const createTransporter = () => {
  try {
    // Check if SMTP credentials are available
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured. Emails will be logged to console only.');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
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
    console.error('Error creating email transporter:', error);
    return null;
  }
};

// ================== EMAIL SERVICE ==================
const EmailService = {
  sendWelcomeEmail: async (email, name) => {
    try {
      const transporter = createTransporter();
      
      if (!transporter) {
        console.log(`[Mock] Welcome email would be sent to ${email} for ${name}`);
        return true;
      }
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🎉 Welcome to HireGen AI - Your AI-Powered Hiring Partner!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 40px 30px; text-align: center; }
              .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 20px; }
              .features { margin: 30px 0; }
              .feature-item { display: flex; align-items: flex-start; margin-bottom: 15px; }
              .feature-icon { background: #fef3c7; color: #d97706; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; }
              .feature-text { flex: 1; color: #4b5563; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer; }
              .footer { background: #f3f4f6; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
              .social-links { margin-top: 20px; }
              .social-link { display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; }
              .security-note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px; font-size: 14px; }
              @media (max-width: 600px) { .content { padding: 25px 20px; } .header { padding: 30px 20px; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">HireGen AI</div>
                <h1>Welcome to the Future of Hiring!</h1>
              </div>
              <div class="content">
                <div class="welcome-text">Hello ${name},</div>
                <p>Thank you for joining HireGen AI! We're excited to help you transform your hiring process with AI-powered intelligence.</p>
                
                <div class="features">
                  <div class="feature-item">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-text">
                      <strong>AI-Powered Matching</strong><br>
                      Get intelligent candidate recommendations based on job requirements
                    </div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">⚡</div>
                    <div class="feature-text">
                      <strong>Fast Screening</strong><br>
                      Automate resume screening and save 80% of your time
                    </div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-icon">📊</div>
                    <div class="feature-text">
                      <strong>Advanced Analytics</strong><br>
                      Get insights into your hiring pipeline and make data-driven decisions
                    </div>
                  </div>
                </div>

                <div class="button-container">
                  <a href="${process.env.FRONTEND_URL || 'https://hiregenai.com'}/dashboard" class="button">Go to Dashboard</a>
                </div>

                <div class="security-note">
                  <strong>🔒 Account Security Tip:</strong> Always keep your login credentials secure and enable two-factor authentication for added security.
                </div>

                <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'https://hiregenai.com'}/help" style="color: #f97316;">help center</a> or contact our support team.</p>
                
                <p>Best regards,<br><strong>The HireGen AI Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} HireGen AI. All rights reserved.</p>
                <p>This email was sent to ${email} as part of your HireGen AI account.</p>
                <div class="social-links">
                  <a href="https://twitter.com/hiregenai" class="social-link">Twitter</a>
                  <a href="https://linkedin.com/company/hiregenai" class="social-link">LinkedIn</a>
                  <a href="https://hiregenai.com" class="social-link">Website</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Welcome email failed:', error);
      // Don't fail the registration if email fails
      return false;
    }
  },

  sendOTP: async (email, name, otp) => {
    try {
      const transporter = createTransporter();
      
      if (!transporter) {
        console.log(`[Mock] OTP ${otp} would be sent to ${email} for ${name}`);
        return true;
      }
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: `🔐 Your OTP for HireGen AI Login: ${otp}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 40px 30px; text-align: center; }
              .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .otp-container { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px dashed #f59e0b; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
              .otp-code { font-size: 48px; font-weight: bold; letter-spacing: 10px; color: #92400e; font-family: monospace; margin: 15px 0; }
              .otp-label { color: #78350f; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
              .timer { background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center; margin: 20px 0; color: #6b7280; font-size: 14px; }
              .timer strong { color: #ef4444; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 25px 0; border-radius: 4px; }
              .footer { background: #f3f4f6; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
              @media (max-width: 600px) { 
                .content { padding: 25px 20px; } 
                .header { padding: 30px 20px; }
                .otp-code { font-size: 36px; letter-spacing: 8px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">HireGen AI</div>
                <h1>Login Verification Code</h1>
              </div>
              <div class="content">
                <p>Hello ${name},</p>
                <p>You've requested to log in to your HireGen AI account. Use the verification code below:</p>
                
                <div class="otp-container">
                  <div class="otp-label">Your One-Time Password</div>
                  <div class="otp-code">${otp}</div>
                  <div class="otp-label">Valid for 10 minutes</div>
                </div>

                <div class="timer">
                  ⏰ <strong>This code will expire in 10 minutes</strong>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Alert:</strong><br>
                  • Never share this code with anyone<br>
                  • Our team will never ask for your verification code<br>
                  • This code can only be used once
                </div>

                <p>If you didn't request this code, please ignore this email or contact our support team immediately.</p>
                
                <p>Need help? <a href="${process.env.FRONTEND_URL || 'https://hiregenai.com'}/support" style="color: #f97316; text-decoration: none;">Contact Support</a></p>
                
                <p>Best regards,<br><strong>The HireGen AI Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} HireGen AI. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email}: ${info.messageId}, OTP: ${otp}`);
      return true;
    } catch (error) {
      console.error('❌ OTP email failed:', error);
      // Fallback to console log
      console.log(`[Fallback] OTP for ${email}: ${otp}`);
      return false;
    }
  },

  sendPasswordReset: async (email, name, resetURL) => {
    try {
      const transporter = createTransporter();
      
      if (!transporter) {
        console.log(`[Mock] Password reset link would be sent to ${email}: ${resetURL}`);
        return true;
      }
      
      const mailOptions = {
        from: `"HireGen AI" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🔒 Reset Your HireGen AI Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 40px 30px; text-align: center; }
              .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 16px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; border: none; cursor: pointer; }
              .url-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; font-family: monospace; font-size: 14px; color: #4b5563; border: 1px solid #e5e7eb; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 25px 0; border-radius: 4px; }
              .timer { background: #f3f4f6; padding: 12px; border-radius: 8px; text-align: center; margin: 20px 0; color: #6b7280; font-size: 14px; }
              .timer strong { color: #ef4444; }
              .footer { background: #f3f4f6; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
              @media (max-width: 600px) { .content { padding: 25px 20px; } .header { padding: 30px 20px; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">HireGen AI</div>
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello ${name},</p>
                <p>We received a request to reset your password for your HireGen AI account. Click the button below to create a new password:</p>
                
                <div class="button-container">
                  <a href="${resetURL}" class="button">Reset Password</a>
                </div>

                <div class="timer">
                  ⏰ <strong>This link will expire in 10 minutes</strong>
                </div>

                <p>If the button doesn't work, copy and paste this URL into your browser:</p>
                <div class="url-box">${resetURL}</div>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong><br>
                  • This link can only be used once<br>
                  • If you didn't request a password reset, ignore this email<br>
                  • For security reasons, this link will expire in 10 minutes
                </div>

                <p>If you're still having trouble, please contact our support team.</p>
                
                <p>Best regards,<br><strong>The HireGen AI Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} HireGen AI. All rights reserved.</p>
                <p>This is an automated message, please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Password reset email failed:', error);
      // Fallback to console log
      console.log(`[Fallback] Password reset link for ${email}: ${resetURL}`);
      return false;
    }
  }
};

// ================== OTP SERVICE ==================
// In-memory OTP store (use Redis in production)
const otpStore = new Map();

const OTPService = {
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  
  storeOTP: (email, otp) => {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { 
      otp, 
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ OTP stored for ${email}: ${otp}, expires at ${new Date(expiresAt).toLocaleTimeString()}`);
  },
  
  verifyOTP: (email, otp) => {
    const stored = otpStore.get(email);
    
    if (!stored) {
      console.log(`❌ OTP verification failed for ${email}: OTP not found`);
      return { valid: false, message: 'OTP not found or expired. Please request a new OTP.' };
    }
    
    // Check if OTP has expired
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      console.log(`❌ OTP verification failed for ${email}: OTP expired`);
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
    }
    
    // Check attempts (max 3 attempts)
    if (stored.attempts >= 3) {
      otpStore.delete(email);
      console.log(`❌ OTP verification failed for ${email}: Too many attempts`);
      return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }
    
    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts += 1;
      otpStore.set(email, stored);
      console.log(`❌ OTP verification failed for ${email}: Invalid OTP, attempt ${stored.attempts}/3`);
      return { valid: false, message: `Invalid OTP. You have ${3 - stored.attempts} attempt(s) left.` };
    }
    
    // Remove OTP after successful verification
    otpStore.delete(email);
    console.log(`✅ OTP verified successfully for ${email}`);
    return { valid: true, message: 'OTP verified successfully' };
  },
  
  getRemainingTime: (email) => {
    const stored = otpStore.get(email);
    if (!stored) return 0;
    
    const remaining = Math.max(0, Math.floor((stored.expiresAt - Date.now()) / 1000));
    return remaining;
  },
  
  // Cleanup expired OTPs periodically (optional)
  cleanupExpiredOTPs: () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [email, data] of otpStore.entries()) {
      if (now > data.expiresAt) {
        otpStore.delete(email);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(() => OTPService.cleanupExpiredOTPs(), 5 * 60 * 1000);

// ================== TOKEN GENERATION ==================
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'fallback-secret-key-change-in-production', 
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'hiregen-ai',
      audience: 'hiregen-ai-users'
    }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-change-in-production', 
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'hiregen-ai',
      audience: 'hiregen-ai-users'
    }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Remove password from output
  user.password = undefined;

  // Set cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Set cookies
  res.cookie('jwt', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);

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
      preferences: user.preferences,
      lastLogin: user.lastLogin
    }
  });
};

// ================== AUTH CONTROLLERS ==================

// Register user
export const register = async (req, res) => {
  try {
    console.log('📝 Registration request received:', { 
      ...req.body, 
      password: '[HIDDEN]' 
    });
    
    const { fullName, email, mobile, password, companyName, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !mobile || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Full name, email, mobile and password are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please enter a valid email address' 
      });
    }

    // Mobile validation (basic)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please enter a valid 10-digit mobile number' 
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobile }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        status: 'error',
        message: 'User with this email or mobile number already exists' 
      });
    }

    // Validate role-specific requirements
    if (role === 'hr' && !companyName) {
      return res.status(400).json({
        status: 'error',
        message: 'Company name is required for HR professionals'
      });
    }

    console.log('👤 Creating new user...');
    
    // Create user
    const user = new User({
      fullName,
      email,
      mobile,
      password,
      companyName: role === 'hr' ? companyName : undefined,
      role: role || 'candidate',
      isVerified: true, // Auto-verify for now
      isActive: true,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        jobAlerts: {
          active: true,
          frequency: 'weekly'
        },
        privacy: {
          profileVisibility: 'connections_only',
          resumeVisibility: true
        }
      }
    });

    console.log('💾 Saving user to database...');
    
    // Save user to database
    await user.save();
    
    console.log('✅ User saved successfully with ID:', user._id);

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
          },
          settings: {
            autoScreening: true,
            aiMatching: true,
            notifications: true
          }
        });
        
        await company.save();
        console.log('🏢 Company created for HR user:', company._id);
      } catch (companyError) {
        console.error('⚠️ Error creating company:', companyError);
        // Don't fail registration if company creation fails
      }
    }

    // Send welcome email (async, don't wait for it)
    setTimeout(async () => {
      try {
        await EmailService.sendWelcomeEmail(email, fullName);
      } catch (emailError) {
        console.error('⚠️ Welcome email failed:', emailError);
      }
    }, 0);

    // Send response
    createSendToken(user, 201, res);
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        status: 'error',
        message: 'Validation Error',
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        status: 'error',
        message: 'User with this email or mobile number already exists' 
      });
    }

    res.status(500).json({ 
      status: 'error',
      message: 'Error creating user account. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        status: 'error',
        message: 'Please provide email and password' 
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ User logged in: ${email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error logging in. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login with mobile number (for OTP)
export const loginWithPhone = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile number is required' 
      });
    }

    // Mobile validation
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please enter a valid 10-digit mobile number' 
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
        message: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ Mobile login successful: ${mobile}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('❌ Mobile login error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error logging in with mobile. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Email is required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please enter a valid email address' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No account found with this email. Please sign up first.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Generate and store OTP
    const otp = OTPService.generateOTP();
    OTPService.storeOTP(email, otp);

    // Send OTP via email (async)
    setTimeout(async () => {
      try {
        await EmailService.sendOTP(email, user.fullName, otp);
      } catch (emailError) {
        console.error('⚠️ OTP email failed:', emailError);
      }
    }, 0);

    const remainingTime = OTPService.getRemainingTime(email);

    res.json({
      status: 'success',
      message: 'OTP sent successfully to your email!',
      data: {
        remainingTime,
        email: email
      }
    });
  } catch (error) {
    console.error('❌ OTP request error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error sending OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Email and OTP are required' 
      });
    }

    // OTP validation
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please enter a valid 6-digit OTP' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Verify OTP
    const verification = OTPService.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ 
        status: 'error',
        message: verification.message 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`✅ OTP verification successful for: ${email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error verifying OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('savedJobs', 'title company location')
      .populate('applications.jobId', 'title company status');
    
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
          profile: user.profile || {},
          preferences: user.preferences || {},
          savedJobs: user.savedJobs || [],
          applications: user.applications || [],
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, mobile, companyName, avatar, preferences, profile } = req.body;
    
    // Build update object
    const updateData = {};
    
    if (fullName) updateData.fullName = fullName;
    if (mobile) updateData.mobile = mobile;
    if (req.user.role === 'hr' && companyName) updateData.companyName = companyName;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = preferences;
    if (profile) updateData.profile = profile;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { 
        new: true,
        runValidators: true,
        select: '-password -__v'
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
      data: {
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
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Password length validation
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        status: 'error',
        message: 'New password must be at least 6 characters long' 
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

    // Check if new password is same as old
    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'New password cannot be the same as current password' 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No account found with this email' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated. Please contact support.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save reset token to user with expiration
    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send email with reset link (async)
    setTimeout(async () => {
      try {
        await EmailService.sendPasswordReset(email, user.fullName, resetURL);
      } catch (emailError) {
        console.error('⚠️ Password reset email failed:', emailError);
      }
    }, 0);

    console.log(`✅ Password reset token generated for: ${email}`);

    res.json({
      status: 'success',
      message: 'Password reset link sent to your email!',
      data: {
        email: email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error sending password reset email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Password must be at least 6 characters long' 
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

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for: ${user.email}`);

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error resetting password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key-change-in-production'
    );
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User belonging to this token no longer exists' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Account has been deactivated' 
      });
    }

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid refresh token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error',
        message: 'Refresh token has expired' 
      });
    }

    res.status(500).json({ 
      status: 'error',
      message: 'Error refreshing token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout (optional - clears cookies)
export const logout = async (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error logging out'
    });
  }
};

// Check if email exists
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email is required' 
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
    console.error('❌ Check email error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error checking email'
    });
  }
};

// Check if mobile exists
export const checkMobile = async (req, res) => {
  try {
    const { mobile } = req.query;

    if (!mobile) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Mobile number is required' 
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
    console.error('❌ Check mobile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error checking mobile number'
    });
  }
};
