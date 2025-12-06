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
  checkMobile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/login-with-phone', loginWithPhone);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/check-email', checkEmail);
router.get('/check-mobile', checkMobile);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

export default router;
