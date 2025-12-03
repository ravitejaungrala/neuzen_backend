// backend/routes/hrAIAnalysis.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  analyzeCandidateForJob,
  batchAnalyzeCandidatesForJob,
  getCandidateAIInsights,
  getJobAnalysis,
  generateInterviewQuestions
} from '../controllers/hrAIAnalysisCandidateController.js';

const router = express.Router();

// All routes require HR authentication
router.use(protect);
router.use(restrictTo('hr'));

// AI analysis endpoints
router.get('/candidate/:candidateId/job/:jobId/analyze', analyzeCandidateForJob);
router.post('/job/:jobId/batch-analyze', batchAnalyzeCandidatesForJob);
router.get('/candidate/:candidateId/insights', getCandidateAIInsights);
router.get('/job/:jobId/analysis', getJobAnalysis);
router.get('/candidate/:candidateId/job/:jobId/questions', generateInterviewQuestions);

export default router;