// backend/routes/jobs.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { 
  getJobsForCandidate,
  getJobDetailsForCandidate,
  applyForJob,
  saveJob,
  unsaveJob,
  getSavedJobs,
  getJobMatches
} from '../controllers/candidateJobSearchController.js';
import { 
  createJob, 
  getAllHRJobs, 
  getHRJobById, 
  updateHRJob, 
  deleteHRJob,
  generateJobDescriptionAI,
  getHRJobApplications
} from '../controllers/hrJobController.js';
const router = express.Router();

// Public routes (no authentication required)
router.get('/', getJobsForCandidate); // Browse jobs
router.get('/:id', getJobDetailsForCandidate); // View job details

// Protected routes (authentication required)
router.use(protect);
router.get('/saved', getSavedJobs); // Get saved jobs
router.get('/matches', getJobMatches); // Get job matches
router.post('/:jobId/apply', applyForJob); // Apply for job
router.post('/:jobId/save', saveJob); // Save job
router.delete('/:jobId/save', unsaveJob); // Unsave job
router.use(protect);

// HR Job management endpoints
router.post('/', restrictTo('hr'), createJob);
router.get('/my-jobs', restrictTo('hr'), getAllHRJobs);
router.post('/generate-description', restrictTo('hr'), generateJobDescriptionAI);
router.get('/:id', restrictTo('hr'), getHRJobById);
router.put('/:id', restrictTo('hr'), updateHRJob);
router.delete('/:id', restrictTo('hr'), deleteHRJob);
router.get('/:id/applications', restrictTo('hr'), getHRJobApplications);
export default router;