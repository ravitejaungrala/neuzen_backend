// backend/routes/hrAIAnalysis.js - UPDATED
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  uploadAndAnalyzeResume,
  analyzeResumeForHR,
  getCandidateAIInsights,
  generateInterviewQuestions,
  compareCandidates,
  quickAnalyzeResume,
  getScreeningInsights
} from '../controllers/hrAIAnalysisController.js';

const router = express.Router();

// All routes require HR role
router.use(protect);
router.use(restrictTo('hr'));

// Resume upload and analysis
router.post('/upload-analyze', uploadAndAnalyzeResume);
router.post('/quick-analyze', quickAnalyzeResume);

// Candidate-specific analysis
router.post('/analyze-resume/:candidateId', analyzeResumeForHR);
router.get('/insights/:candidateId', getCandidateAIInsights);

// Add screening endpoint
router.get('/insights/screening', getScreeningInsights);

// Generate interview questions
router.post('/interview-questions/:candidateId', generateInterviewQuestions);

// Compare candidates
router.post('/compare-candidates', compareCandidates);

export default router;
