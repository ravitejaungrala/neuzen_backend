// backend/routes/analytics.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { 
  getHRAnalytics, 
  exportHRAnalytics 
} from '../controllers/hrAnalyticsController.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// HR Analytics endpoints
router.get('/', restrictTo('hr'), getHRAnalytics);
router.get('/export', restrictTo('hr'), exportHRAnalytics);

export default router;