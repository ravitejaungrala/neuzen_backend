import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

// Get comprehensive analytics data for HR
export const getHRAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;
    
    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.json({
        status: 'success',
        data: {
          analytics: getDefaultAnalytics()
        }
      });
    }

    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get company jobs
    const jobs = await Job.find({ 
      company: company._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const jobIds = jobs.map(job => job._id);
    
    // Get applications within date range
    let applications = [];
    if (jobIds.length > 0) {
      applications = await Application.find({ 
        jobId: { $in: jobIds },
        appliedAt: { $gte: startDate, $lte: endDate }
      }).populate('candidateId', 'profile');
    }
    
    // Get candidates
    const candidateIds = [...new Set(applications.map(app => app.candidateId?._id).filter(id => id))];
    const candidates = candidateIds.length > 0 ? 
      await Candidate.find({ userId: { $in: candidateIds } }).populate('userId') : [];
    
    // Calculate overview
    const overview = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'active').length,
      totalCandidates: candidates.length,
      applicationsReceived: applications.length,
      interviewsConducted: applications.filter(app => 
        ['interview', 'interview_scheduled', 'interview_completed'].includes(app.status)
      ).length,
      offersSent: applications.filter(app => app.status === 'offer_sent').length,
      hires: applications.filter(app => app.status === 'accepted').length,
      avgTimeToHire: calculateAverageTimeToHire(applications),
      applicationToHireRate: applications.length > 0 ? 
        ((applications.filter(app => app.status === 'accepted').length / applications.length) * 100).toFixed(1) : '0.0',
      candidateSatisfaction: calculateCandidateSatisfaction(applications)
    };
    
    // Candidate funnel
    const candidateFunnel = [
      { 
        stage: 'Applied', 
        count: applications.filter(app => app.status === 'applied').length, 
        percentage: 100 
      },
      { 
        stage: 'Screened', 
        count: applications.filter(app => app.status === 'under_review').length, 
        percentage: applications.length > 0 ? 
          Math.round((applications.filter(app => app.status === 'under_review').length / applications.length) * 100) : 0 
      },
      { 
        stage: 'Shortlisted', 
        count: applications.filter(app => app.status === 'shortlisted').length, 
        percentage: applications.length > 0 ? 
          Math.round((applications.filter(app => app.status === 'shortlisted').length / applications.length) * 100) : 0 
      },
      { 
        stage: 'Interview', 
        count: applications.filter(app => ['interview', 'interview_scheduled'].includes(app.status)).length, 
        percentage: applications.length > 0 ? 
          Math.round((applications.filter(app => ['interview', 'interview_scheduled'].includes(app.status)).length / applications.length) * 100) : 0 
      },
      { 
        stage: 'Offer', 
        count: applications.filter(app => app.status === 'offer_sent').length, 
        percentage: applications.length > 0 ? 
          Math.round((applications.filter(app => app.status === 'offer_sent').length / applications.length) * 100) : 0 
      },
      { 
        stage: 'Hired', 
        count: applications.filter(app => app.status === 'accepted').length, 
        percentage: applications.length > 0 ? 
          Math.round((applications.filter(app => app.status === 'accepted').length / applications.length) * 100) : 0 
      }
    ];

    // Skills distribution
    const skillCounts = {};
    candidates.forEach(candidate => {
      if (candidate.userId?.profile?.skills) {
        candidate.userId.profile.skills.forEach(skill => {
          const skillName = typeof skill === 'string' ? skill : skill.name;
          skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
        });
      }
    });
    
    const skillsDistribution = Object.entries(skillCounts)
      .map(([skill, count]) => ({
        skill,
        count,
        percentage: Math.round((count / candidates.length) * 100) || 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Job performance
    const jobPerformance = [];
    for (const job of jobs.slice(0, 10)) {
      const jobApplications = applications.filter(app => 
        app.jobId && app.jobId.toString() === job._id.toString()
      );
      const hired = jobApplications.filter(app => app.status === 'accepted').length;
      const interviewed = jobApplications.filter(app => 
        ['interview', 'interview_scheduled', 'interview_completed'].includes(app.status)
      ).length;
      
      jobPerformance.push({
        jobTitle: job.title,
        applications: jobApplications.length,
        shortlisted: jobApplications.filter(app => app.status === 'shortlisted').length,
        interviewed,
        hired,
        conversionRate: jobApplications.length > 0 ? 
          ((hired / jobApplications.length) * 100).toFixed(1) : '0.0',
        timeToFill: calculateJobTimeToFill(job, applications),
        status: job.status
      });
    }

    // Time series data
    const timeSeries = [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyApplications = applications.filter(app => {
        if (!app.appliedAt) return false;
        const appDate = new Date(app.appliedAt).toISOString().split('T')[0];
        return appDate === dateStr;
      });
      
      const dailyInterviews = applications.filter(app => {
        if (!app.interviewDate) return false;
        const interviewDate = new Date(app.interviewDate).toISOString().split('T')[0];
        return interviewDate === dateStr;
      });
      
      const dailyHires = applications.filter(app => {
        if (!app.updatedAt || app.status !== 'accepted') return false;
        const hireDate = new Date(app.updatedAt).toISOString().split('T')[0];
        return hireDate === dateStr;
      });
      
      timeSeries.push({
        date: dateStr,
        applications: dailyApplications.length,
        interviews: dailyInterviews.length,
        hires: dailyHires.length,
        offers: applications.filter(app => {
          if (!app.updatedAt || app.status !== 'offer_sent') return false;
          const offerDate = new Date(app.updatedAt).toISOString().split('T')[0];
          return offerDate === dateStr;
        }).length
      });
    }

    // Source analysis
    const sourceAnalysis = {
      direct: applications.filter(app => app.source === 'direct' || !app.source).length,
      linkedin: applications.filter(app => app.source === 'linkedin').length,
      indeed: applications.filter(app => app.source === 'indeed').length,
      naukri: applications.filter(app => app.source === 'naukri').length,
      referral: applications.filter(app => app.source === 'referral').length,
      other: applications.filter(app => 
        app.source && !['direct', 'linkedin', 'indeed', 'naukri', 'referral'].includes(app.source)
      ).length
    };

    // Candidate quality metrics
    const candidateQuality = {
      avgMatchScore: calculateAverageMatchScore(applications),
      topSkills: skillsDistribution.slice(0, 5),
      experienceDistribution: {
        '0-2 years': candidates.filter(c => 
          (c.userId?.profile?.experience?.length || 0) <= 2
        ).length,
        '3-5 years': candidates.filter(c => 
          (c.userId?.profile?.experience?.length || 0) >= 3 && 
          (c.userId?.profile?.experience?.length || 0) <= 5
        ).length,
        '6-10 years': candidates.filter(c => 
          (c.userId?.profile?.experience?.length || 0) >= 6 && 
          (c.userId?.profile?.experience?.length || 0) <= 10
        ).length,
        '10+ years': candidates.filter(c => 
          (c.userId?.profile?.experience?.length || 0) > 10
        ).length
      }
    };

    // Hiring efficiency
    const hiringEfficiency = {
      avgScreeningTime: calculateAverageScreeningTime(applications),
      avgInterviewTime: calculateAverageInterviewTime(applications),
      interviewToOfferRatio: applications.filter(app => 
        ['interview', 'interview_scheduled', 'interview_completed'].includes(app.status)
      ).length > 0 ? 
        (applications.filter(app => app.status === 'offer_sent').length / 
         applications.filter(app => 
           ['interview', 'interview_scheduled', 'interview_completed'].includes(app.status)
         ).length * 100).toFixed(1) : '0.0',
      offerAcceptanceRate: applications.filter(app => app.status === 'offer_sent').length > 0 ?
        (applications.filter(app => app.status === 'accepted').length / 
         applications.filter(app => app.status === 'offer_sent').length * 100).toFixed(1) : '0.0'
    };

    const analytics = {
      overview,
      candidateFunnel,
      skillsDistribution,
      jobPerformance,
      timeSeries,
      sourceAnalysis,
      candidateQuality,
      hiringEfficiency,
      period,
      generatedAt: new Date()
    };
    
    res.json({
      status: 'success',
      data: {
        analytics
      }
    });
    
  } catch (error) {
    console.error('Get HR analytics error:', error);
    res.status(500).json({ 
      message: 'Error fetching HR analytics',
      error: error.message 
    });
  }
};

// Export analytics data
export const exportHRAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'csv', period = '30d' } = req.query;
    
    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

    const jobs = await Job.find({ 
      company: company._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const jobIds = jobs.map(job => job._id);
    
    const applications = jobIds.length > 0 ? 
      await Application.find({ 
        jobId: { $in: jobIds },
        appliedAt: { $gte: startDate, $lte: endDate }
      }).populate('candidateId', 'fullName email')
        .populate('jobId', 'title') : [];

    if (format === 'csv') {
      const headers = ['Date', 'Candidate Name', 'Candidate Email', 'Job Title', 'Status', 'Applied Date', 'Source', 'Match Score'];
      const rows = applications.map(app => [
        new Date().toLocaleDateString(),
        app.candidateId?.fullName || 'Unknown',
        app.candidateId?.email || 'No email',
        app.jobId?.title || 'Unknown',
        app.status,
        new Date(app.appliedAt).toLocaleDateString(),
        app.source || 'direct',
        app.matchScore || 'N/A'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } else {
      // JSON export
      const analyticsData = {
        company: company.name,
        period,
        startDate,
        endDate,
        totalJobs: jobs.length,
        totalApplications: applications.length,
        applications,
        summary: {
          hired: applications.filter(app => app.status === 'accepted').length,
          interviewed: applications.filter(app => 
            ['interview', 'interview_scheduled', 'interview_completed'].includes(app.status)
          ).length,
          shortlisted: applications.filter(app => app.status === 'shortlisted').length,
          rejected: applications.filter(app => app.status === 'rejected').length
        }
      };
      
      res.json({
        status: 'success',
        data: analyticsData
      });
    }
  } catch (error) {
    console.error('Export HR analytics error:', error);
    res.status(500).json({ 
      message: 'Error exporting HR analytics data',
      error: error.message 
    });
  }
};

// Helper functions
function calculateAverageTimeToHire(applications) {
  const hiredApplications = applications.filter(app => 
    app.status === 'accepted' && app.appliedAt && app.updatedAt
  );
  
  if (hiredApplications.length === 0) return 0;
  
  const totalDays = hiredApplications.reduce((sum, app) => {
    const appliedDate = new Date(app.appliedAt);
    const hiredDate = new Date(app.updatedAt);
    const days = Math.ceil((hiredDate - appliedDate) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / hiredApplications.length);
}

function calculateCandidateSatisfaction(applications) {
  const respondedApplications = applications.filter(app => 
    ['shortlisted', 'interview', 'offer_sent', 'accepted', 'rejected'].includes(app.status)
  );
  
  if (applications.length === 0) return 0;
  
  return Math.round((respondedApplications.length / applications.length) * 100);
}

function calculateJobTimeToFill(job, applications) {
  const jobApplications = applications.filter(app => 
    app.jobId && app.jobId.toString() === job._id.toString() && app.status === 'accepted'
  );
  
  if (jobApplications.length === 0 || !job.createdAt) return 0;
  
  const firstHire = jobApplications.reduce((earliest, app) => {
    const hireDate = new Date(app.updatedAt);
    return hireDate < earliest ? hireDate : earliest;
  }, new Date());
  
  const jobStartDate = new Date(job.createdAt);
  const days = Math.ceil((firstHire - jobStartDate) / (1000 * 60 * 60 * 24));
  return days;
}

function calculateAverageMatchScore(applications) {
  const scoredApplications = applications.filter(app => app.matchScore);
  
  if (scoredApplications.length === 0) return 0;
  
  const totalScore = scoredApplications.reduce((sum, app) => sum + app.matchScore, 0);
  return Math.round(totalScore / scoredApplications.length);
}

function calculateAverageScreeningTime(applications) {
  const screenedApplications = applications.filter(app => 
    app.status === 'shortlisted' && app.appliedAt && app.updatedAt
  );
  
  if (screenedApplications.length === 0) return 0;
  
  const totalHours = screenedApplications.reduce((sum, app) => {
    const appliedDate = new Date(app.appliedAt);
    const screenedDate = new Date(app.updatedAt);
    const hours = (screenedDate - appliedDate) / (1000 * 60 * 60);
    return sum + hours;
  }, 0);
  
  return Math.round(totalHours / screenedApplications.length * 10) / 10;
}

function calculateAverageInterviewTime(applications) {
  const interviewedApplications = applications.filter(app => 
    ['interview_completed', 'offer_sent', 'accepted'].includes(app.status) && 
    app.interviewDate
  );
  
  if (interviewedApplications.length === 0) return 0;
  
  const totalDays = interviewedApplications.reduce((sum, app) => {
    const interviewDate = new Date(app.interviewDate);
    const resultDate = new Date(app.updatedAt);
    const days = Math.ceil((resultDate - interviewDate) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / interviewedApplications.length);
}

function getDefaultAnalytics() {
  return {
    overview: {
      totalJobs: 0,
      activeJobs: 0,
      totalCandidates: 0,
      applicationsReceived: 0,
      interviewsConducted: 0,
      offersSent: 0,
      hires: 0,
      avgTimeToHire: 0,
      applicationToHireRate: '0.0',
      candidateSatisfaction: 0
    },
    candidateFunnel: [
      { stage: 'Applied', count: 0, percentage: 100 },
      { stage: 'Screened', count: 0, percentage: 0 },
      { stage: 'Shortlisted', count: 0, percentage: 0 },
      { stage: 'Interview', count: 0, percentage: 0 },
      { stage: 'Offer', count: 0, percentage: 0 },
      { stage: 'Hired', count: 0, percentage: 0 }
    ],
    skillsDistribution: [],
    jobPerformance: [],
    timeSeries: [],
    sourceAnalysis: {
      direct: 0,
      linkedin: 0,
      indeed: 0,
      naukri: 0,
      referral: 0,
      other: 0
    },
    candidateQuality: {
      avgMatchScore: 0,
      topSkills: [],
      experienceDistribution: {
        '0-2 years': 0,
        '3-5 years': 0,
        '6-10 years': 0,
        '10+ years': 0
      }
    },
    hiringEfficiency: {
      avgScreeningTime: 0,
      avgInterviewTime: 0,
      interviewToOfferRatio: '0.0',
      offerAcceptanceRate: '0.0'
    }
  };
}