import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

// Get candidate dashboard data
export const getCandidateDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with profile
    const user = await User.findById(userId).select('fullName email profile savedJobs');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Get applications
    const applications = await Application.find({ candidateId: userId });
    
    // Calculate stats
    const stats = {
      totalApplications: applications.length,
      interviewsScheduled: applications.filter(app => 
        ['interview', 'interview_scheduled'].includes(app.status)
      ).length,
      profileCompleteness: calculateProfileCompleteness(user),
      profileViews: Math.floor(Math.random() * 50) + 20,
      matchScore: calculateBestMatchScore(user)
    };
    
    // Get recommended jobs (based on skills)
    const recommendedJobs = await getRecommendedJobs(user);
    
    // Get recent activity
    const recentActivity = await Application.find({ candidateId: userId })
      .populate({
        path: 'jobId',
        select: 'title company',
        populate: {
          path: 'company',
          select: 'name logo'
        }
      })
      .sort({ appliedAt: -1 })
      .limit(5)
      .then(apps => apps.map(app => ({
        _id: app._id,
        type: 'application_update',
        message: `Applied for ${app.jobId?.title || 'job'}`,
        createdAt: app.appliedAt,
        metadata: {
          jobId: app.jobId?._id,
          status: app.status
        }
      })));
    
    res.json({
      status: 'success',
      data: {
        stats,
        matchedJobs: recommendedJobs,
        recentActivity,
        applications: applications.slice(0, 3).map(app => ({
          _id: app._id,
          jobId: {
            title: app.jobId?.title || 'Job',
            company: { name: app.jobId?.company?.name || 'Company' }
          },
          status: app.status,
          appliedAt: app.appliedAt
        }))
      }
    });
  } catch (error) {
    console.error('Candidate dashboard error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate dashboard data',
      error: error.message 
    });
  }
};

// Get candidate dashboard stats
export const getCandidateDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const applications = await Application.find({ candidateId: userId });
    
    const stats = {
      totalApplications: applications.length,
      activeApplications: applications.filter(app => 
        !['rejected', 'withdrawn', 'accepted'].includes(app.status)
      ).length,
      interviewsScheduled: applications.filter(app => 
        ['interview', 'interview_scheduled'].includes(app.status)
      ).length,
      profileViews: Math.floor(Math.random() * 50) + 10,
      matchScore: Math.floor(Math.random() * 30) + 70,
      lastApplication: applications.length > 0 ? 
        applications[0].appliedAt : null
    };

    res.json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    console.error('Candidate dashboard stats error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate dashboard stats',
      error: error.message 
    });
  }
};

// Helper function to get recommended jobs
async function getRecommendedJobs(user) {
  try {
    const candidateSkills = user.profile?.skills?.map(s => s.name) || [];
    
    if (candidateSkills.length === 0) {
      return [];
    }
    
    // Find jobs that match candidate's skills
    const jobs = await Job.find({
      status: 'active',
      visibility: 'public',
      'requiredSkills.name': { $in: candidateSkills }
    })
    .populate('company', 'name logo')
    .limit(5);
    
    // Calculate match scores
    const jobsWithScores = jobs.map(job => {
      const requiredSkills = job.requiredSkills?.map(s => s.name) || [];
      const matchedSkills = requiredSkills.filter(skill => 
        candidateSkills.includes(skill)
      );
      
      const matchScore = requiredSkills.length > 0 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;
      
      return {
        _id: job._id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        salary: job.salary,
        matchScore,
        isSaved: user.savedJobs?.includes(job._id) || false
      };
    })
    .filter(job => job.matchScore >= 60)
    .sort((a, b) => b.matchScore - a.matchScore);
    
    return jobsWithScores;
  } catch (error) {
    console.error('Get recommended jobs error:', error);
    return [];
  }
}

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user) {
  if (!user) return 0;
  
  let score = 0;
  if (user.fullName) score += 15;
  if (user.email) score += 10;
  if (user.mobile) score += 10;
  if (user.profile?.location) score += 10;
  if (user.profile?.bio) score += 10;
  if (user.profile?.skills?.length > 0) score += 15;
  if (user.profile?.experience?.length > 0) score += 15;
  if (user.profile?.education?.length > 0) score += 15;
  if (user.profile?.resume?.url) score += 10;
  
  return Math.min(score, 100);
}

// Helper function to calculate best match score
function calculateBestMatchScore(user) {
  const completeness = calculateProfileCompleteness(user);
  return Math.round(completeness * 0.8 + Math.random() * 20);
}