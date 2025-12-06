// backend/routes/auth.js
import express from 'express';
import {
  register,
  login,
  loginWithPhone,
  requestOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  checkEmail,
  checkMobile,
  requestPhoneOTP,
  verifyPhoneOTP,
  testEmail,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPasswordWithOTP
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/login-with-phone', loginWithPhone);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/request-phone-otp', requestPhoneOTP);
router.post('/verify-phone-otp', verifyPhoneOTP);
router.post('/forgot-password', requestPasswordResetOTP); // Updated to OTP-based
router.post('/verify-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password', resetPasswordWithOTP); // Updated to OTP-based
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/test-email', testEmail);
router.get('/check-email', checkEmail);
router.get('/check-mobile', checkMobile);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

export default router;
