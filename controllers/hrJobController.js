import Job from '../models/Job.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';
import User from '../models/User.js'; // Added missing import
import aiService from '../services/aiService.js'; // Fixed import

// Create job (HR only)
export const createJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      companyName,
      location,
      type,
      experience,
      salary,
      requiredSkills,
      responsibilities = [],
      requirements = [],
      benefits = [],
      applicationDeadline,
      settings
    } = req.body;

    if (req.user.role !== 'hr') {
      return res.status(403).json({ 
        status: 'error',
        message: 'Only HR users can post jobs' 
      });
    }

    // Get or create company
    let company = await Company.findOne({ 'team.user': userId });
    
    if (!company) {
      company = new Company({
        name: companyName || req.user.companyName || `${req.user.fullName}'s Company`,
        createdBy: userId,
        team: [{
          user: userId,
          role: 'admin',
          permissions: ['all']
        }],
        stats: {
          totalJobs: 0,
          activeJobs: 0,
          totalCandidates: 0,
          totalHires: 0,
          avgTimeToHire: 0
        }
      });
      await company.save();
    }

    // Create job with companyName
    const job = new Job({
      title,
      description: description || `We are looking for a ${title} to join our team at ${companyName || company.name}.`,
      shortDescription: (description || '').substring(0, 200) + '...',
      company: company._id,
      companyName: companyName || company.name,
      location: location || 'Remote',
      type: type || 'full-time',
      experience: experience || { min: 0, max: 5 },
      salary: salary || { min: 50000, max: 100000, currency: 'USD' },
      requiredSkills: requiredSkills.map(skill => ({
        name: skill,
        level: 'intermediate',
        isRequired: true
      })),
      responsibilities: responsibilities.length > 0 ? responsibilities : [
        'Develop and maintain software applications',
        'Collaborate with team members',
        'Write clean, maintainable code'
      ],
      requirements: requirements.length > 0 ? requirements : [
        'Relevant experience in the field',
        'Strong problem-solving skills',
        'Good communication abilities'
      ],
      benefits: benefits.length > 0 ? benefits : [
        'Competitive salary',
        'Health insurance',
        'Flexible work hours'
      ],
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      settings: settings || {
        autoScreening: true,
        minMatchScore: 60,
        notifyOnApplication: true
      },
      hiringManager: userId,
      status: 'active'
    });

    await job.save();

    // Update company stats
    company.stats.totalJobs += 1;
    company.stats.activeJobs += 1;
    await company.save();

    res.status(201).json({
      status: 'success',
      message: 'Job created successfully!',
      data: {
        job: {
          ...job.toObject(),
          company: {
            _id: company._id,
            name: company.name
          }
        }
      }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error creating job',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all jobs for HR
export const getAllHRJobs = async (req, res) => {
  try {
    const { status, type, location, search, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    // HR sees company jobs
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.json({
        status: 'success',
        data: {
          jobs: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0
        }
      });
    }

    let query = { company: company._id };

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'requiredSkills.name': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Get jobs with pagination
    const jobs = await Job.find(query)
      .populate('company', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Job.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        jobs,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get HR jobs error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching HR jobs',
      error: error.message 
    });
  }
};

// Get HR job by ID
export const getHRJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const job = await Job.findById(id)
      .populate('company', 'name logo description website');

    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }

    // For HR, check if job belongs to their company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company || job.company.toString() !== company._id.toString()) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Not authorized to view this job' 
      });
    }

    res.json({
      status: 'success',
      data: {
        job
      }
    });
  } catch (error) {
    console.error('Get HR job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching HR job',
      error: error.message 
    });
  }
};

// Update job (HR only)
export const updateHRJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job belongs to company
    if (job.company.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    // Update job
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'company' && key !== 'createdAt') {
        job[key] = updates[key];
      }
    });

    await job.save();

    res.json({
      status: 'success',
      message: 'Job updated successfully!',
      data: {
        job
      }
    });
  } catch (error) {
    console.error('Update HR job error:', error);
    res.status(500).json({ 
      message: 'Error updating HR job',
      error: error.message 
    });
  }
};

// Delete job (HR only)
export const deleteHRJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if job belongs to company
    if (job.company.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    // Soft delete by updating status
    job.status = 'archived';
    await job.save();

    // Update company stats
    company.stats.activeJobs -= 1;
    await company.save();

    res.json({
      status: 'success',
      message: 'Job archived successfully!'
    });
  } catch (error) {
    console.error('Delete HR job error:', error);
    res.status(500).json({ 
      message: 'Error deleting HR job',
      error: error.message 
    });
  }
};

// Generate job description using AI (HR only)
export const generateJobDescriptionAI = async (req, res) => {
  try {
    const { title, requiredSkills, experience, companyName, tone = 'professional' } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Job title is required' });
    }

    // Use AI service to generate job description
    const generatedDescription = await aiService.generateJobDescription({
      title,
      skills: requiredSkills || [],
      experience: experience || 3,
      companyName: companyName || 'our company',
      tone
    });

    res.json({
      status: 'success',
      data: {
        description: generatedDescription
      }
    });
  } catch (error) {
    console.error('Generate job description error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating job description',
      error: error.message 
    });
  }
};


// backend/controllers/hrJobController.js - Add this function
export const getHRJobApplications = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Company not found' 
      });
    }

    // Check if job belongs to company
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }

    if (job.company.toString() !== company._id.toString()) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Not authorized to view applications for this job' 
      });
    }

    // Get applications
    const applications = await Application.find({ jobId: id })
      .populate('candidateId', 'fullName email mobile avatar')
      .sort({ appliedAt: -1 });

    res.json({
      status: 'success',
      data: {
        applications: applications || []
      }
    });
  } catch (error) {
    console.error('Get HR job applications error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching HR job applications',
      error: error.message 
    });
  }
};