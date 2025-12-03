// backend/routes/communicationRoutes.js - UPDATED
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  sendWhatsAppMessage,
  sendEmailToCandidate,
  scheduleInterview,
  sendOfferLetter,
  markAsSelected,
  rejectCandidate,
  getCandidateCommunications,
  testEmail  // Add this import
} from '../controllers/communicationController.js';

const router = express.Router();

// All routes require HR authentication
router.use(protect);
router.use(restrictTo('hr'));

// Communication endpoints
router.post('/candidate/:candidateId/whatsapp', sendWhatsAppMessage);
router.post('/candidate/:candidateId/email', sendEmailToCandidate);
router.post('/candidate/:candidateId/schedule-interview', scheduleInterview);
router.post('/candidate/:candidateId/send-offer', sendOfferLetter);
router.post('/candidate/:candidateId/select', markAsSelected);
router.post('/candidate/:candidateId/reject', rejectCandidate);
router.get('/candidate/:candidateId/communications', getCandidateCommunications);
router.post('/test-email', testEmail); // Add test endpoint

export default router;