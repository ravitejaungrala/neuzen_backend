// backend/routes/auth.js
import express from 'express';
import {
  register,
  login,
  loginWithPhone, // NEW
  requestOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/login-with-phone', loginWithPhone); // NEW ROUTE
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

export default router;
