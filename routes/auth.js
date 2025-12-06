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
  
  // Password Reset (CONSOLE-ONLY)
  forgotPassword,           // Request password reset OTP (console only)
  verifyPasswordResetOTP,   // Verify reset OTP
  resetPassword,            // Reset password with OTP
  
  // Profile Management
  getProfile,
  updateProfile,
  changePassword,
  
  // Token Management
  refreshToken,
  logout,
  
  // Validation
  checkEmail,
  checkMobile,
  
  // Testing
  testEmail
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ================== PUBLIC ROUTES ==================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth API is working',
    timestamp: new Date().toISOString()
  });
});

// Registration & Basic Login
router.post('/register', register);
router.post('/login', login);
router.post('/login-with-phone', loginWithPhone);

// OTP Authentication Routes (CONSOLE-ONLY)
router.post('/request-otp', requestOTP);                // Request email OTP (console only)
router.post('/verify-otp', verifyOTP);                  // Verify email OTP
router.post('/request-phone-otp', requestPhoneOTP);     // Request mobile OTP (console only)
router.post('/verify-phone-otp', verifyPhoneOTP);       // Verify mobile OTP

// Password Reset Routes (CONSOLE-ONLY - NO EMAIL/SMS)
router.post('/forgot-password', forgotPassword);            // Request password reset OTP
router.post('/verify-reset-otp', verifyPasswordResetOTP);   // Verify reset OTP
router.post('/reset-password', resetPassword);              // Reset password with OTP

// Token Management
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Validation
router.get('/check-email', checkEmail);
router.get('/check-mobile', checkMobile);

// Testing
router.post('/test-email', testEmail);

// ================== PROTECTED ROUTES ==================
// All routes below require authentication

// Profile Management
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// 404 handler for undefined auth routes
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Auth route ${req.originalUrl} not found`
  });
});

export default router;
