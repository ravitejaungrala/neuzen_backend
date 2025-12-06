// backend/routes/auth.js
import express from 'express';
import {
  // Registration & Login
  register,
  login,
  loginWithPhone,
  
  // OTP Authentication
  requestOTP,
  verifyOTP,
  requestPhoneOTP,
  verifyPhoneOTP,
  
  // Password Management
  forgotPassword,           // OTP-based password reset
  resetPassword,            // Token-based (for compatibility)
  requestPasswordResetOTP,  // OTP-based password reset (explicit)
  verifyPasswordResetOTP,   // Verify reset OTP
  resetPasswordWithOTP,     // Reset with OTP
  changePassword,           // Authenticated password change
  
  // Token Management
  refreshToken,
  logout,
  
  // Profile Management
  getProfile,
  updateProfile,
  
  // Validation
  checkEmail,
  checkMobile,
  
  // Testing
  testEmail
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ================== PUBLIC ROUTES ==================

// Registration & Basic Login
router.post('/register', register);
router.post('/login', login);
router.post('/login-with-phone', loginWithPhone);

// OTP Authentication Routes
router.post('/request-otp', requestOTP);                // Request email OTP
router.post('/verify-otp', verifyOTP);                  // Verify email OTP
router.post('/request-phone-otp', requestPhoneOTP);     // Request mobile OTP
router.post('/verify-phone-otp', verifyPhoneOTP);       // Verify mobile OTP

// Password Reset Routes
router.post('/forgot-password', forgotPassword);            // Request password reset OTP
router.post('/verify-reset-otp', verifyPasswordResetOTP);   // Verify reset OTP
router.post('/reset-password', resetPasswordWithOTP);       // Reset password with OTP

// Legacy endpoints (kept for compatibility)
router.post('/reset-password-legacy', resetPassword);       // Old token-based reset

// Token Management
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Validation
router.get('/check-email', checkEmail);
router.get('/check-mobile', checkMobile);

// Testing
router.post('/test-email', testEmail);

// ================== PROTECTED ROUTES ==================
// All routes below require authentication (use your existing protect middleware)

// Profile Management
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
