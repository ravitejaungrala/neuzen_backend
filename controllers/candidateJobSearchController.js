// backend/controllers/jobSearchController.js
import Job from '../models/Job.js';
import User from '../models/User.js';
import Application from '../models/Application.js';

// Get all jobs for public/candidate browsing
export const getJobsForCandidate = async (req, res) => {
  try {
    const userId = req.user?.id; // Optional: user might not be logged in
    const { 
      search, 
      location, 
      type, 
      minExperience, 
      maxSalary,
      category,
      page = 1, 
      limit = 20 
    } = req.query;
    
    console.log('Job search request from user:', userId, 'Query:', req.query);
    
    // Build query for active public jobs
    let query = { 
      status: 'active',
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    };
    
    // Apply filters
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'requiredSkills.name': searchRegex },
        { companyName: searchRegex },
        { location: searchRegex }
      ];
    }
    
    if (location && location.trim()) {
      query.location = { $regex: location.trim(), $options: 'i' };
    }
    
    if (type && type.trim()) {
      query.type = type.trim();
    }
    
    if (minExperience && !isNaN(minExperience)) {
      query['experience.min'] = { $lte: parseInt(minExperience) };
    }
    
    if (maxSalary && !isNaN(maxSalary)) {
      query['salary.max'] = { $gte: parseInt(maxSalary) };
    }
    
    if (category && category.trim()) {
      query.category = { $regex: category.trim(), $options: 'i' };
    }
    
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await Job.countDocuments(query);
    
    // Get jobs with sorting (newest first)
    const jobs = await Job.find(query)
      .sort({ createdAt: -1, 'metrics.views': -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Initialize arrays for user-specific data
    let savedJobIds = [];
    let appliedJobs = [];
    
    // Get user-specific data if user is logged in
    if (userId) {
      try {
        const user = await User.findById(userId).select('savedJobs profile');
        savedJobIds = user?.savedJobs || [];
        
        // Get user's applications for these jobs
        appliedJobs = await Application.find({
          candidateId: userId,
          jobId: { $in: jobs.map(job => job._id) }
        });
      } catch (userError) {
        console.log('User data fetch error (non-critical):', userError.message);
      }
    }
    
    const appliedJobMap = new Map();
    appliedJobs.forEach(app => {
      appliedJobMap.set(app.jobId.toString(), app.status);
    });
    
    // Format jobs with match scores and user-specific data
    const formattedJobs = jobs.map(job => {
      // Calculate basic match score (simplified for public access)
      let matchScore = 0;
      let skillsMatch = 0;
      
      // If user is logged in and has skills, calculate match score
      if (userId) {
        // This would require user skills from profile
        // For now, use a random score between 60-95
        matchScore = Math.floor(Math.random() * 35) + 60;
      } else {
        // Default score for non-logged in users
        matchScore = Math.floor(Math.random() * 20) + 70;
      }
      
      // Format company data
      const companyData = {
        name: job.companyName || job.company?.name || 'Company',
        logo: job.company?.logo || null
      };
      
      // Format salary
      const salaryData = job.salary || { min: 0, max: 0, currency: 'USD' };
      if (salaryData.currency === 'INR') {
        salaryData.formatted = `₹${salaryData.min.toLocaleString()} - ₹${salaryData.max.toLocaleString()}`;
      } else {
        salaryData.formatted = `$${salaryData.min.toLocaleString()} - $${salaryData.max.toLocaleString()}`;
      }
      
      // Format experience
      const experienceText = job.experience?.min === 0 
        ? 'Fresher' 
        : `${job.experience?.min || 0}+ years`;
      
      // Get required skills
      const requiredSkills = job.requiredSkills?.map(s => s.name) || [];
      
      return {
        _id: job._id,
        title: job.title,
        company: companyData,
        companyName: companyData.name,
        location: job.location || 'Remote',
        type: job.type || 'full-time',
        salary: salaryData,
        experience: {
          min: job.experience?.min || 0,
          max: job.experience?.max || 0,
          text: experienceText
        },
        requiredSkills: requiredSkills,
        description: job.description || '',
        shortDescription: job.shortDescription || job.description?.substring(0, 150) + '...',
        category: job.category || 'General',
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        isSaved: savedJobIds.includes(job._id.toString()),
        hasApplied: appliedJobMap.has(job._id.toString()),
        applicationStatus: appliedJobMap.get(job._id.toString()),
        matchScore: matchScore,
        metrics: {
          views: job.metrics?.views || 0,
          applications: job.metrics?.applications || 0
        }
      };
    });
    
    // Sort by match score if user is logged in
    if (userId) {
      formattedJobs.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    res.json({
      status: 'success',
      data: {
        jobs: formattedJobs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
        filters: {
          search: search || '',
          location: location || '',
          type: type || '',
          minExperience: minExperience || '',
          maxSalary: maxSalary || '',
          category: category || ''
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching jobs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get job details (public or authenticated)
export const getJobDetailsForCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional
    
    console.log('Fetching job details for ID:', id, 'User:', userId);
    
    // Find job and populate company data if it exists
    const job = await Job.findById(id)
      .populate('company', 'name logo description website');
    
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    // Check if user has applied
    let application = null;
    let isSaved = false;
    
    if (userId) {
      try {
        application = await Application.findOne({
          candidateId: userId,
          jobId: id
        });
        
        const user = await User.findById(userId);
        isSaved = user?.savedJobs?.includes(id) || false;
      } catch (userError) {
        console.log('User data fetch error:', userError.message);
      }
    }
    
    // Increment view count
    await Job.findByIdAndUpdate(id, {
      $inc: { 'metrics.views': 1 }
    });
    
    // Format job data
    const formattedJob = {
      _id: job._id,
      title: job.title,
      description: job.description,
      company: {
        _id: job.company?._id,
        name: job.company?.name || job.companyName,
        logo: job.company?.logo,
        description: job.company?.description,
        website: job.company?.website
      },
      companyName: job.company?.name || job.companyName,
      location: job.location,
      type: job.type,
      experience: job.experience || { min: 0, max: 0 },
      salary: job.salary || { min: 0, max: 0, currency: 'USD' },
      requiredSkills: job.requiredSkills?.map(s => s.name) || [],
      preferredSkills: job.preferredSkills || [],
      responsibilities: job.responsibilities || [],
      benefits: job.benefits || [],
      category: job.category,
      applicationProcess: job.applicationProcess || {
        requiresCoverLetter: false,
        requiresResume: true,
        questions: []
      },
      metadata: {
        views: (job.metrics?.views || 0) + 1, // Include the new view
        applications: job.metrics?.applications || 0
      },
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      hasApplied: !!application,
      applicationStatus: application?.status,
      isSaved: isSaved
    };
    
    // Get similar jobs (based on category or skills)
    let similarJobs = [];
    try {
      similarJobs = await Job.find({
        _id: { $ne: id },
        status: 'active',
        $or: [
          { category: job.category },
          { 'requiredSkills.name': { $in: job.requiredSkills?.map(s => s.name).slice(0, 3) || [] } },
          { type: job.type }
        ]
      })
      .limit(3)
      .select('title companyName location type salary experience metrics')
      .sort({ 'metrics.applications': -1, createdAt: -1 });
      
      similarJobs = similarJobs.map(j => ({
        _id: j._id,
        title: j.title,
        company: { name: j.companyName },
        location: j.location,
        type: j.type,
        salary: j.salary,
        matchScore: Math.floor(Math.random() * 20) + 70
      }));
    } catch (similarError) {
      console.log('Similar jobs fetch error:', similarError.message);
    }
    
    res.json({
      status: 'success',
      data: {
        job: formattedJob,
        similarJobs
      }
    });
  } catch (error) {
    console.error('Get job details error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching job details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Apply for job (requires authentication)
export const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id; // Required for application
    const { coverLetter, answers } = req.body;
    
    console.log('Job application request:', { jobId, userId });
    
    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Authentication required to apply for jobs' 
      });
    }
    
    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    if (job.status !== 'active') {
      return res.status(400).json({ 
        status: 'error',
        message: 'This job is no longer accepting applications' 
      });
    }
    
    // Check if already applied
    const existingApplication = await Application.findOne({
      candidateId: userId,
      jobId: jobId
    });
    
    if (existingApplication) {
      return res.status(400).json({ 
        status: 'error',
        message: 'You have already applied for this job' 
      });
    }
    
    // Get user for match score calculation
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Calculate match score (simplified)
    const candidateSkills = user.profile?.skills?.map(s => s.name) || [];
    const candidateExperience = user.profile?.experience?.length || 0;
    
    const requiredSkills = job.requiredSkills?.map(s => s.name) || [];
    const matchedSkills = requiredSkills.filter(skill => 
      candidateSkills.some(candidateSkill => 
        candidateSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    );
    
    const skillMatch = requiredSkills.length > 0 
      ? (matchedSkills.length / requiredSkills.length) * 70 
      : 50;
    
    const expMin = job.experience?.min || 0;
    const experienceMatch = candidateExperience >= expMin
      ? 30 
      : expMin > 0 ? (candidateExperience / expMin) * 30 : 30;
    
    const matchScore = Math.min(100, Math.max(0, Math.round(skillMatch + experienceMatch)));
    
    // Create application
    const application = new Application({
      candidateId: userId,
      jobId: jobId,
      coverLetter: coverLetter || '',
      answers: answers || [],
      status: 'applied',
      matchScore: matchScore,
      appliedAt: new Date()
    });
    
    await application.save();
    
    // Update job metrics
    await Job.findByIdAndUpdate(jobId, {
      $inc: { 'metrics.applications': 1 }
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully!',
      data: {
        application: {
          _id: application._id,
          jobId: application.jobId,
          jobTitle: job.title,
          companyName: job.companyName,
          status: application.status,
          matchScore: application.matchScore,
          appliedAt: application.appliedAt
        }
      }
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error applying for job',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Save job (requires authentication)
export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    
    console.log('Save job request:', { jobId, userId });
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    // Initialize savedJobs array if not exists
    if (!user.savedJobs) {
      user.savedJobs = [];
    }
    
    // Check if already saved
    if (user.savedJobs.includes(jobId)) {
      return res.json({
        status: 'success',
        message: 'Job already saved',
        data: { isSaved: true }
      });
    }
    
    // Add to saved jobs
    user.savedJobs.push(jobId);
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Job saved successfully',
      data: { isSaved: true }
    });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error saving job',
      error: error.message 
    });
  }
};

// Unsave job (requires authentication)
export const unsaveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Check if job is saved
    if (!user.savedJobs || !user.savedJobs.includes(jobId)) {
      return res.json({
        status: 'success',
        message: 'Job not in saved list',
        data: { isSaved: false }
      });
    }
    
    // Remove from saved jobs
    user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Job removed from saved list',
      data: { isSaved: false }
    });
  } catch (error) {
    console.error('Unsave job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error unsaving job',
      error: error.message 
    });
  }
};

// Get saved jobs (requires authentication)
export const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    const user = await User.findById(userId).select('savedJobs');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    const savedJobIds = user.savedJobs || [];
    const skip = (page - 1) * limit;
    
    // Get saved jobs
    const jobs = await Job.find({
      _id: { $in: savedJobIds },
      status: 'active'
    })
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
    
    const total = savedJobIds.length;
    
    // Check which jobs user has applied for
    const applications = await Application.find({
      candidateId: userId,
      jobId: { $in: jobs.map(job => job._id) }
    });
    
    const appliedJobMap = new Map();
    applications.forEach(app => {
      appliedJobMap.set(app.jobId.toString(), app.status);
    });
    
    const jobsWithStatus = jobs.map(job => {
      const salaryData = job.salary || { min: 0, max: 0, currency: 'USD' };
      const salaryFormatted = salaryData.currency === 'INR' 
        ? `₹${salaryData.min.toLocaleString()} - ₹${salaryData.max.toLocaleString()}`
        : `$${salaryData.min.toLocaleString()} - $${salaryData.max.toLocaleString()}`;
      
      return {
        ...job.toObject(),
        salary: {
          ...salaryData,
          formatted: salaryFormatted
        },
        hasApplied: appliedJobMap.has(job._id.toString()),
        applicationStatus: appliedJobMap.get(job._id.toString()),
        isSaved: true
      };
    });
    
    res.json({
      status: 'success',
      data: {
        jobs: jobsWithStatus,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching saved jobs',
      error: error.message 
    });
  }
};

// Get job matches/recommendations (requires authentication)
export const getJobMatches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    const user = await User.findById(userId).select('profile savedJobs');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    const candidateSkills = user.profile?.skills?.map(s => s.name) || [];
    const savedJobIds = user.savedJobs || [];
    
    // Get active jobs
    const jobs = await Job.find({ 
      status: 'active',
      $or: [
        { visibility: 'public' },
        { visibility: { $exists: false } }
      ]
    })
    .limit(parseInt(limit) * 3); // Get more to filter later
    
    // Calculate match scores and filter
    const matchedJobs = jobs.map(job => {
      const requiredSkills = job.requiredSkills?.map(s => s.name) || [];
      const matchedSkills = requiredSkills.filter(skill => 
        candidateSkills.some(candidateSkill => 
          candidateSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(candidateSkill.toLowerCase())
        )
      );
      
      // Calculate match score
      let matchScore = 0;
      if (requiredSkills.length > 0) {
        matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
      } else {
        matchScore = 70 + Math.floor(Math.random() * 30);
      }
      
      // Format salary
      const salaryData = job.salary || { min: 0, max: 0, currency: 'USD' };
      const salaryFormatted = salaryData.currency === 'INR' 
        ? `₹${salaryData.min.toLocaleString()} - ₹${salaryData.max.toLocaleString()}`
        : `$${salaryData.min.toLocaleString()} - $${salaryData.max.toLocaleString()}`;
      
      return {
        ...job.toObject(),
        salary: {
          ...salaryData,
          formatted: salaryFormatted
        },
        matchScore,
        isSaved: savedJobIds.includes(job._id.toString())
      };
    })
    .filter(job => job.matchScore >= 60)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, parseInt(limit));
    
    res.json({
      status: 'success',
      data: {
        jobs: matchedJobs,
        total: matchedJobs.length
      }
    });
  } catch (error) {
    console.error('Get job matches error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching job matches',
      error: error.message 
    });
  }
};