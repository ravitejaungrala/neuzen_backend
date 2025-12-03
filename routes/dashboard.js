// backend/routes/dashboard.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { 
  getHRDashboard, 
  getHRDashboardStats 
} from '../controllers/hrDashboardController.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// HR Dashboard endpoints
router.get('/hr', restrictTo('hr'), getHRDashboard);
router.get('/hr/stats', restrictTo('hr'), getHRDashboardStats);

export default router;