// routes/testimonialRoutes.js
import express from 'express';
import { getHRTestimonials } from '../controllers/hrTestimonialController.js';

const router = express.Router();

// Add console log to verify this executes
console.log('Testimonial routes module loaded');

// Public testimonials endpoint
router.get('/testimonials', (req, res) => {
  console.log('Testimonials endpoint hit');
  getHRTestimonials(req, res);
});

export default router;  // Make sure this is exported
