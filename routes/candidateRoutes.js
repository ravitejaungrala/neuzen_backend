import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

// Import Candidate controllers
import { 
  getCandidateDashboard,
  getCandidateDashboardStats 
} from '../controllers/candidateDashboardController.js';

import { 
  getCandidateProfile,
  updateCandidateProfile,
  uploadCandidateResume,  getAIAnalysisReport
} from '../controllers/candidateProfileController.js';

import { 
  getJobsForCandidate,
  getJobDetailsForCandidate,
  applyForJob,
  getSavedJobs,
  saveJob,
  unsaveJob,
  getJobMatches
} from '../controllers/candidateJobSearchController.js';
import { 
  getAIAnalysis, 
  generateAIAnalysis 
} from '../controllers/aiAnalysisController.js';
import { 
  getCandidateApplications,
  getCandidateApplicationById,
  withdrawCandidateApplication
} from '../controllers/candidateApplicationController.js';

import { 
  getCandidateNotifications,
  markCandidateNotificationAsRead
} from '../controllers/candidateNotificationController.js';

const router = express.Router();

// All Candidate routes require authentication and Candidate role
router.use(protect);
router.use(restrictTo('candidate'));

// Candidate Dashboard
router.get('/dashboard', getCandidateDashboard);
router.get('/dashboard/stats', getCandidateDashboardStats);

// Candidate Profile
router.get('/profile', getCandidateProfile);
router.put('/profile', updateCandidateProfile);
router.post('/upload-resume', 
  upload.single('resume'),
  uploadCandidateResume
);
router.get('/ai-analysis-report', getAIAnalysisReport); // ✅ NEW: AI Analysis Report
// Candidate Job Search
router.get('/jobs', getJobsForCandidate);
router.get('/jobs/saved', getSavedJobs);
router.get('/jobs/matches', getJobMatches);
router.get('/jobs/:id', getJobDetailsForCandidate);
router.post('/jobs/:jobId/apply', applyForJob);
router.post('/jobs/:jobId/save', saveJob);
router.delete('/jobs/:jobId/save', unsaveJob);

// Candidate Applications
router.get('/applications', getCandidateApplications);
router.get('/applications/:id', getCandidateApplicationById);
router.delete('/applications/:id', withdrawCandidateApplication);
// AI Analysis Routes
router.get('/ai-analysis', getAIAnalysis);
router.post('/ai-analysis/generate', generateAIAnalysis);
router.get('/ai-analysis/latest', getAIAnalysis); // Alias for latest
// Candidate Notifications
router.get('/notifications', getCandidateNotifications);
router.patch('/notifications/:id/read', markCandidateNotificationAsRead);

export default router;