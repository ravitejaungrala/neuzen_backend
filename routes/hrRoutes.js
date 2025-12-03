import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { ensureCompanyExists } from '../middleware/company.js';
// Import HR controllers
import { 
  getHRDashboard,
  getHRDashboardStats 
} from '../controllers/hrDashboardController.js';

import { 
  getHRAnalytics,
  exportHRAnalytics 
} from '../controllers/hrAnalyticsController.js';

import { 
  getAllCandidates,
  getCandidateById,
  createCandidateFromResume,
  updateCandidateStatus,
  getCandidatesByStage
} from '../controllers/hrCandidateController.js';

// import { 
//   createJob,
//   getAllHRJobs,
//   getHRJobById,
//   updateHRJob,
//   deleteHRJob,
//   generateJobDescriptionAI,
//   getHRJobApplications
// } from '../controllers/hrJobController.js';
import { 
  getHRJobApplications 
} from '../controllers/hrJobController.js';
import { 
  getAllHRApplications,
 
  getHRApplicationById,
  updateApplicationStatus,
  addApplicationNote,
  scheduleInterview,
  sendOfferLetter,
  rejectApplication
} from '../controllers/hrApplicationController.js';

import { 
  getHRSettings,
  updateHRProfile,
  updateHRCompanySettings,
  uploadHRProfilePicture
} from '../controllers/hrSettingsController.js';
// backend/routes/hrRoutes.js - Add these imports and routes
import {
  getHRTestimonials,
  updateUserTestimonial,
  getUserTestimonial
} from '../controllers/hrTestimonialController.js';


const router = express.Router();

// All HR routes require authentication and HR role
router.use(protect);
router.use(restrictTo('hr'));
router.use(ensureCompanyExists);

// HR Dashboard
router.get('/dashboard', getHRDashboard);
router.get('/dashboard/stats', getHRDashboardStats);
router.get('/jobs/:id/applications', getHRJobApplications);
// Add these routes to the router
router.get('/testimonials', getHRTestimonials); // Public endpoint
router.get('/testimonials/my', getUserTestimonial); // Get user's testimonial
router.put('/testimonials', updateUserTestimonial); // Update user's testimonial
// HR Analytics
router.get('/analytics', getHRAnalytics);
router.get('/analytics/export', exportHRAnalytics);

// HR Candidates
router.get('/candidates', getAllCandidates);
router.get('/candidates/:id', getCandidateById);

router.post('/candidates/from-resume', 
  upload.single('resume'), 
  createCandidateFromResume
);
router.patch('/candidates/:id/status', updateCandidateStatus);
router.get('/candidates/stage/:stage', getCandidatesByStage);
// HR Jobs
// router.get('/jobs', getAllHRJobs);
// router.get('/jobs/:id', getHRJobById);
// router.post('/jobs', createJob);
// router.put('/jobs/:id', updateHRJob);
// router.delete('/jobs/:id', deleteHRJob);
// router.post('/jobs/generate-description', generateJobDescriptionAI);
// router.get('/jobs/:id/applications', getHRJobApplications);

// HR Applications
router.get('/applications', getAllHRApplications);
router.get('/applications/:id', getHRApplicationById);
router.patch('/applications/:id/status', updateApplicationStatus);
router.post('/applications/:id/notes', addApplicationNote);
router.post('/applications/:id/schedule-interview', scheduleInterview);
router.post('/applications/:id/send-offer', sendOfferLetter);
router.post('/applications/:id/reject', rejectApplication);

// HR Settings
router.get('/settings', getHRSettings);
router.put('/settings/profile', updateHRProfile);
router.put('/settings/company', updateHRCompanySettings);
router.post('/settings/upload-avatar', 
  upload.single('avatar'),
  uploadHRProfilePicture
);

export default router;