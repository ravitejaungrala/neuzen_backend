import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

// Get all applications for candidate
export const getCandidateApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = { candidateId: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const applications = await Application.find(query)
      .populate({
        path: 'jobId',
        select: 'title company location type salary',
        populate: {
          path: 'company',
          select: 'name logo'
        }
      })
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Application.countDocuments(query);
    
    // Get status counts
    const allApplications = await Application.find({ candidateId: userId });
    const statusCounts = {
      all: allApplications.length,
      applied: allApplications.filter(app => app.status === 'applied').length,
      shortlisted: allApplications.filter(app => app.status === 'shortlisted').length,
      interview: allApplications.filter(app => app.status === 'interview').length,
      rejected: allApplications.filter(app => app.status === 'rejected').length,
      accepted: allApplications.filter(app => app.status === 'accepted').length
    };
    
    res.json({
      status: 'success',
      data: {
        applications,
        statusCounts,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get candidate applications error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate applications',
      error: error.message 
    });
  }
};

// Get candidate application by ID
export const getCandidateApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const application = await Application.findOne({
      _id: id,
      candidateId: userId
    })
    .populate({
      path: 'jobId',
      select: 'title description company location type salary requirements benefits',
      populate: {
        path: 'company',
        select: 'name logo description website'
      }
    });
    
    if (!application) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Application not found' 
      });
    }
    
    res.json({
      status: 'success',
      data: {
        application
      }
    });
  } catch (error) {
    console.error('Get candidate application error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate application',
      error: error.message 
    });
  }
};

// Withdraw application (candidate)
export const withdrawCandidateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const application = await Application.findOne({
      _id: id,
      candidateId: userId
    });
    
    if (!application) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Application not found' 
      });
    }
    
    if (application.status === 'withdrawn') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Application already withdrawn' 
      });
    }
    
    application.status = 'withdrawn';
    await application.save();
    
    res.json({
      status: 'success',
      message: 'Application withdrawn successfully',
      data: {
        application
      }
    });
  } catch (error) {
    console.error('Withdraw candidate application error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error withdrawing candidate application',
      error: error.message 
    });
  }
};