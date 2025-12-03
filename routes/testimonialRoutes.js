// backend/routes/publicRoutes.js
import express from 'express';
import { getHRTestimonials } from '../controllers/hrTestimonialController.js';

const router = express.Router();

// Public testimonials endpoint - no authentication required
router.get('/testimonials', getHRTestimonials);

export default router;