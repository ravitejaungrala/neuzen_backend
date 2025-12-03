// backend/middleware/company.js
import Company from '../models/Company.js';

export const ensureCompanyExists = async (req, res, next) => {
  try {
    if (req.user.role !== 'hr') {
      return next();
    }

    // Check if company exists for this HR user
    let company = await Company.findOne({ 'team.user': req.user.id });
    
    if (!company) {
      // Create a new company for this HR user
      company = new Company({
        name: req.user.companyName || `${req.user.fullName}'s Company`,
        createdBy: req.user.id,
        team: [{
          user: req.user.id,
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
      console.log('Created new company for user:', req.user.id);
    }
    
    req.company = company;
    next();
  } catch (error) {
    console.error('Company middleware error:', error);
    res.status(500).json({ 
      message: 'Error checking company',
      error: error.message 
    });
  }
};