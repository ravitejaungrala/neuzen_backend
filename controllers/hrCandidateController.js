// backend/controllers/hrCandidateController.js - UPDATED
import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Company from '../models/Company.js';
import { sendEmail } from '../services/emailService.js';

// Get all candidates for HR - UPDATED to fetch all candidates
export const getAllCandidates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, location, skills } = req.query;
    
    console.log('Fetching candidates for HR user:', userId);
    
    // Build base query
    let userQuery = { role: 'candidate' };
    
    // Apply search filter
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Apply location filter
    if (location) {
      userQuery['profile.location'] = { $regex: location, $options: 'i' };
    }
    
    // First, get all candidate users
    const candidateUsers = await User.find(userQuery)
      .select('fullName email mobile avatar profile')
      .sort({ createdAt: -1 });
    
    console.log('Found candidate users:', candidateUsers.length);
    
    // Get all candidate records for these users
    const candidateIds = candidateUsers.map(user => user._id);
    const candidateRecords = await Candidate.find({ 
      userId: { $in: candidateIds } 
    });
    
    // Create a map of userId to candidate record
    const candidateRecordMap = new Map();
    candidateRecords.forEach(record => {
      candidateRecordMap.set(record.userId.toString(), record);
    });
    
    // Format the response
    const formattedCandidates = candidateUsers.map(user => {
      const candidateRecord = candidateRecordMap.get(user._id.toString());
      const userProfile = user.profile || {};
      
      // Get user's applications
      const userApplications = candidateRecord?.applications || [];
      
      // Get all skills (from profile and candidate record)
      const profileSkills = userProfile.skills?.map(s => ({
        name: s.name,
        proficiency: s.proficiency || 5
      })) || [];
      
      const candidateSkills = candidateRecord?.skills?.map(s => ({
        name: s.name,
        proficiency: s.proficiency || 5
      })) || [];
      
      const allSkills = [...profileSkills, ...candidateSkills];
      
      // Get experience
      const experience = userProfile.experience || candidateRecord?.experience || [];
      
      return {
        _id: candidateRecord?._id || user._id,
        userId: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar,
          profile: {
            location: userProfile.location,
            skills: profileSkills,
            experience: userProfile.experience,
            education: userProfile.education,
            resume: userProfile.resume
          }
        },
        skills: candidateSkills,
        experience: candidateRecord?.experience || [],
        education: userProfile.education || [],
        status: candidateRecord?.status || 'new',
        matchScores: candidateRecord?.matchScores || [],
        personalInfo: {
          location: userProfile.location
        },
        resume: userProfile.resume,
        applications: userApplications,
        source: candidateRecord?.source || 'direct',
        createdAt: candidateRecord?.createdAt || user.createdAt,
        updatedAt: candidateRecord?.updatedAt || user.updatedAt
      };
    });
    
    // Apply status filter
    let filteredCandidates = formattedCandidates;
    if (status && status !== 'all') {
      filteredCandidates = formattedCandidates.filter(candidate => 
        (candidate.status || 'new') === status
      );
    }
    
    // Apply skills filter
    if (skills && skills.length > 0) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filteredCandidates = filteredCandidates.filter(candidate => {
        const allSkills = [
          ...(candidate.skills?.map(s => s.name) || []),
          ...(candidate.userId?.profile?.skills?.map(s => s.name) || [])
        ];
        return skillsArray.every(skill => 
          allSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }
    
    console.log('Returning candidates:', filteredCandidates.length);
    
    res.json({
      status: 'success',
      data: {
        candidates: filteredCandidates,
        total: filteredCandidates.length,
        filters: {
          search,
          status,
          location,
          skills
        }
      }
    });
  } catch (error) {
    console.error('Get HR candidates error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching HR candidates',
      error: error.message 
    });
  }
};

// backend/controllers/hrCandidateController.js - UPDATED getCandidateById function
export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log('Fetching candidate by ID:', id, 'for HR user:', userId);
    
    // Check if id is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    
    let candidate;
    let user;
    
    if (isValidObjectId) {
      // Try to find candidate by _id first
      candidate = await Candidate.findById(id)
        .populate({
          path: 'userId',
          select: 'fullName email mobile avatar profile',
          populate: {
            path: 'profile.skills profile.experience profile.education profile.projects'
          }
        });
      
      // If candidate found with _id, use it
      if (candidate && candidate.userId) {
        user = candidate.userId;
      } else {
        // Try to find user by _id
        user = await User.findById(id)
          .select('fullName email mobile avatar profile')
          .populate('profile.skills profile.experience profile.education profile.projects');
        
        if (user && user.role === 'candidate') {
          // Find or create candidate record for this user
          candidate = await Candidate.findOne({ userId: user._id });
          if (!candidate) {
            candidate = new Candidate({
              userId: user._id,
              status: 'new',
              source: 'direct'
            });
            await candidate.save();
          }
        }
      }
    } else {
      // If id is not a valid ObjectId, try to find by email
      user = await User.findOne({ 
        email: id,
        role: 'candidate' 
      })
      .select('fullName email mobile avatar profile')
      .populate('profile.skills profile.experience profile.education profile.projects');
      
      if (user) {
        candidate = await Candidate.findOne({ userId: user._id });
        if (!candidate) {
          candidate = new Candidate({
            userId: user._id,
            status: 'new',
            source: 'direct'
          });
          await candidate.save();
        }
      }
    }
    
    // If no user found, return 404
    if (!user) {
      console.log('Candidate not found with ID:', id);
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    // Get applications for this candidate
    const applications = await Application.find({ candidateId: user._id })
      .populate('jobId', 'title companyName location type salary')
      .sort({ appliedAt: -1 });
    
    // Get AI insights
    const aiInsights = candidate?.aiInsights || await generateAIInsights({
      userId: user,
      ...candidate?.toObject()
    });
    
    // Format response
    const responseData = {
      _id: candidate?._id || user._id,
      userId: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        avatar: user.avatar,
        profile: user.profile
      },
      status: candidate?.status || 'new',
      matchScores: candidate?.matchScores || [],
      source: candidate?.source || 'direct',
      applications: applications || [],
      aiInsights: aiInsights,
      createdAt: candidate?.createdAt || user.createdAt,
      updatedAt: candidate?.updatedAt || user.updatedAt
    };
    
    console.log('Successfully fetched candidate:', responseData.userId.fullName);
    
    res.json({
      status: 'success',
      data: {
        candidate: responseData
      }
    });
  } catch (error) {
    console.error('Get HR candidate by ID error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching HR candidate',
      error: error.message 
    });
  }
};

// Create candidate from resume - UPDATED
export const createCandidateFromResume = async (req, res) => {
  try {
    const { email, fullName, mobile } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Resume file is required' 
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Generate name if not provided
      const candidateName = fullName || 
                          email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 
                          'Candidate';
      
      const formattedName = candidateName.charAt(0).toUpperCase() + candidateName.slice(1);
      
      // Create new user
      user = new User({
        email,
        fullName: formattedName,
        mobile: mobile || '',
        password: 'temp-password-' + Date.now(),
        role: 'candidate',
        profile: {
          resume: {
            url: `/api/uploads/${req.file.filename}`,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            uploadedAt: new Date(),
            filePath: req.file.path
          }
        }
      });
      await user.save();
    } else {
      // Update existing user's resume
      user.profile = user.profile || {};
      user.profile.resume = {
        url: `/api/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        uploadedAt: new Date(),
        filePath: req.file.path
      };
      await user.save();
    }
    
    // Create or update candidate record
    let candidate = await Candidate.findOne({ userId: user._id });
    if (!candidate) {
      candidate = new Candidate({
        userId: user._id,
        status: 'new',
        source: 'resume_upload',
        resumeAnalysis: {
          text: 'Pending analysis...',
          parsedData: {
            skills: [],
            experience: [],
            education: [],
            certifications: []
          },
          score: 0,
          extractedAt: new Date()
        }
      });
    } else {
      candidate.source = 'resume_upload';
      candidate.updatedAt = new Date();
    }
    
    await candidate.save();
    
    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to AI Hire Platform',
        template: 'welcome',
        data: {
          name: user.fullName,
          companyName: req.user.companyName || 'Our Company'
        }
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }
    
    res.json({
      status: 'success',
      message: 'Candidate created from resume successfully!',
      data: {
        candidate: await Candidate.findById(candidate._id).populate('userId'),
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar,
          profile: user.profile
        }
      }
    });
  } catch (error) {
    console.error('Create candidate from resume error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error creating candidate from resume',
      error: error.message 
    });
  }
};

// Update candidate status - UPDATED
export const updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    // Find candidate by _id or userId
    let candidate = await Candidate.findById(id);
    
    if (!candidate) {
      // Try to find by userId
      candidate = await Candidate.findOne({ userId: id });
    }
    
    if (!candidate) {
      // Create a new candidate record if doesn't exist
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ 
          status: 'error',
          message: 'Candidate not found' 
        });
      }
      
      candidate = new Candidate({
        userId: user._id,
        status: status || 'new',
        source: 'direct'
      });
    }

    // Update status
    candidate.status = status || candidate.status;
    
    // Add notes if provided
    if (notes) {
      candidate.applications = candidate.applications || [];
      if (candidate.applications.length > 0) {
        const lastApp = candidate.applications[candidate.applications.length - 1];
        lastApp.notes = lastApp.notes || [];
        lastApp.notes.push({
          content: notes,
          createdBy: userId,
          createdAt: new Date()
        });
      }
    }
    
    await candidate.save();

    res.json({
      status: 'success',
      message: 'Candidate status updated successfully!',
      data: {
        candidate: await Candidate.findById(candidate._id).populate('userId')
      }
    });
  } catch (error) {
    console.error('Update candidate status error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error updating candidate status',
      error: error.message 
    });
  }
};

// Get candidates by stage - UPDATED
export const getCandidatesByStage = async (req, res) => {
  try {
    const { stage } = req.params;
    const { search, location, skills } = req.query;
    
    console.log('Getting candidates by stage:', stage);
    
    // Build user query
    let userQuery = { role: 'candidate' };
    
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (location) {
      userQuery['profile.location'] = { $regex: location, $options: 'i' };
    }
    
    // Get all candidate users
    const candidateUsers = await User.find(userQuery)
      .select('fullName email mobile avatar profile')
      .sort({ createdAt: -1 });
    
    // Get candidate records
    const candidateIds = candidateUsers.map(user => user._id);
    let candidateQuery = { userId: { $in: candidateIds } };
    
    if (stage !== 'all') {
      candidateQuery.status = stage;
    }
    
    const candidateRecords = await Candidate.find(candidateQuery);
    
    // Create map
    const candidateRecordMap = new Map();
    candidateRecords.forEach(record => {
      candidateRecordMap.set(record.userId.toString(), record);
    });
    
    // Format response
    const formattedCandidates = candidateUsers.map(user => {
      const candidateRecord = candidateRecordMap.get(user._id.toString());
      const userProfile = user.profile || {};
      
      return {
        _id: candidateRecord?._id || user._id,
        userId: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar,
          profile: {
            location: userProfile.location,
            skills: userProfile.skills,
            experience: userProfile.experience,
            education: userProfile.education
          }
        },
        status: candidateRecord?.status || 'new',
        matchScores: candidateRecord?.matchScores || [],
        source: candidateRecord?.source || 'direct',
        createdAt: candidateRecord?.createdAt || user.createdAt,
        updatedAt: candidateRecord?.updatedAt || user.updatedAt
      };
    });
    
    // Apply skills filter
    let filteredCandidates = formattedCandidates;
    if (skills && skills.length > 0) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filteredCandidates = formattedCandidates.filter(candidate => {
        const allSkills = [
          ...(candidate.userId?.profile?.skills?.map(s => s.name) || [])
        ];
        return skillsArray.some(skill => 
          allSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }
    
    res.json({
      status: 'success',
      data: {
        candidates: filteredCandidates,
        total: filteredCandidates.length,
        stage: stage
      }
    });
  } catch (error) {
    console.error('Get candidates by stage error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidates by stage',
      error: error.message 
    });
  }
};

// Helper function to generate AI insights
async function generateAIInsights(candidate) {
  try {
    const user = candidate.userId || candidate;
    const profile = user.profile || {};
    
    // Extract skills
    const skills = profile.skills?.map(s => s.name) || [];
    
    // Generate insights based on available data
    const insights = {
      strengths: skills.slice(0, 3).length > 0 ? 
        skills.slice(0, 3).map(s => `Strong ${s} skills`) : 
        ['Strong technical background', 'Good communication skills'],
      weaknesses: ['Could use more experience in leadership roles'],
      missingSkills: ['React Native', 'Kubernetes', 'AWS Lambda'].filter(s => 
        !skills.includes(s)
      ),
      suggestedRoles: skills.length > 0 ? 
        ['Senior Developer', 'Tech Lead', 'Solution Architect'] : 
        ['Software Developer', 'Junior Developer'],
      generatedAt: new Date()
    };
    
    return insights;
  } catch (error) {
    return {
      strengths: ['Strong technical background'],
      weaknesses: [],
      missingSkills: [],
      suggestedRoles: ['Software Developer'],
      generatedAt: new Date()
    };
  }
}
// backend/controllers/hrCandidateController.js - Add new function
export const getDynamicCandidates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, location, skills, minExperience } = req.query;
    
    console.log('Dynamic search with criteria:', { search, status, location, skills, minExperience });
    
    // Build base query
    let userQuery = { role: 'candidate' };
    
    // Apply search filter
    if (search) {
      userQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.bio': { $regex: search, $options: 'i' } },
        { 'profile.skills.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Apply location filter
    if (location) {
      userQuery['profile.location'] = { $regex: location, $options: 'i' };
    }
    
    // Get all candidate users
    const candidateUsers = await User.find(userQuery)
      .select('fullName email mobile avatar profile')
      .sort({ createdAt: -1 });
    
    console.log('Found candidate users:', candidateUsers.length);
    
    // Get all candidate records
    const candidateIds = candidateUsers.map(user => user._id);
    let candidateQuery = { userId: { $in: candidateIds } };
    
    if (status && status !== 'all') {
      candidateQuery.status = status;
    }
    
    const candidateRecords = await Candidate.find(candidateQuery);
    
    // Create map
    const candidateRecordMap = new Map();
    candidateRecords.forEach(record => {
      candidateRecordMap.set(record.userId.toString(), record);
    });
    
    // Format candidates
    const formattedCandidates = candidateUsers.map(user => {
      const candidateRecord = candidateRecordMap.get(user._id.toString());
      const userProfile = user.profile || {};
      
      return {
        _id: candidateRecord?._id || user._id,
        userId: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          avatar: user.avatar,
          profile: {
            location: userProfile.location,
            skills: userProfile.skills,
            experience: userProfile.experience,
            education: userProfile.education,
            bio: userProfile.bio
          }
        },
        skills: candidateRecord?.skills || [],
        experience: candidateRecord?.experience || [],
        status: candidateRecord?.status || 'new',
        matchScores: candidateRecord?.matchScores || [],
        source: candidateRecord?.source || 'direct',
        createdAt: candidateRecord?.createdAt || user.createdAt
      };
    });
    
    // Apply skills filter
    let filteredCandidates = formattedCandidates;
    if (skills && skills.length > 0) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filteredCandidates = formattedCandidates.filter(candidate => {
        const allSkills = [
          ...(candidate.skills?.map(s => s.name) || []),
          ...(candidate.userId?.profile?.skills?.map(s => s.name) || [])
        ];
        return skillsArray.some(skill => 
          allSkills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }
    
    // Apply experience filter
    if (minExperience) {
      filteredCandidates = filteredCandidates.filter(candidate => {
        const totalExperience = this.calculateTotalExperience(candidate);
        return totalExperience >= parseInt(minExperience);
      });
    }
    
    // Calculate dynamic AI matches
    const searchCriteria = {
      skills: skills ? (Array.isArray(skills) ? skills : [skills]) : [],
      searchTerm: search || '',
      location: location || '',
      minExperience: parseInt(minExperience) || 0,
      status: status || 'all'
    };
    
    // Add AI match scores to each candidate
    const candidatesWithAI = await Promise.all(
      filteredCandidates.map(async (candidate) => {
        try {
          const aiMatch = await aiMatchService.calculateDynamicMatch(candidate, searchCriteria);
          return {
            ...candidate,
            aiMatch: {
              score: aiMatch.score,
              breakdown: aiMatch.breakdown,
              insights: aiMatch.insights,
              strengths: aiMatch.strengths,
              suggestions: aiMatch.suggestions,
              matchedCriteria: aiMatch.matchedCriteria
            }
          };
        } catch (error) {
          console.error('Error calculating AI match:', error);
          return {
            ...candidate,
            aiMatch: {
              score: 0,
              breakdown: {},
              insights: ['AI analysis unavailable'],
              strengths: [],
              suggestions: ['Try refining your search'],
              matchedCriteria: []
            }
          };
        }
      })
    );
    
    // Sort by AI match score
    candidatesWithAI.sort((a, b) => b.aiMatch.score - a.aiMatch.score);
    
    res.json({
      status: 'success',
      data: {
        candidates: candidatesWithAI,
        total: candidatesWithAI.length,
        searchCriteria,
        summary: {
          averageMatch: candidatesWithAI.length > 0 ? 
            Math.round(candidatesWithAI.reduce((sum, c) => sum + c.aiMatch.score, 0) / candidatesWithAI.length) : 0,
          topMatches: candidatesWithAI.slice(0, 3).map(c => ({
            name: c.userId.fullName,
            score: c.aiMatch.score,
            matched: c.aiMatch.matchedCriteria.slice(0, 2)
          }))
        }
      }
    });
  } catch (error) {
    console.error('Get dynamic candidates error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching dynamic candidates',
      error: error.message 
    });
  }
};

// Helper function to calculate total experience
function calculateTotalExperience(candidate) {
  const experiences = [
    ...(candidate.experience || []),
    ...(candidate.userId?.profile?.experience || [])
  ];
  
  let totalMonths = 0;
  experiences.forEach(exp => {
    if (exp.startDate) {
      const start = new Date(exp.startDate);
      const end = exp.current ? new Date() : new Date(exp.endDate || new Date());
      const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                    (end.getMonth() - start.getMonth());
      totalMonths += Math.max(months, 0);
    }
  });
  
  return Math.floor(totalMonths / 12);
}