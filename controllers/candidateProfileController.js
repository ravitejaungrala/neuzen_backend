// backend/controllers/candidateProfileController.js - FIXED VERSION
import User from '../models/User.js';
import AIService from '../services/aiService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get candidate profile - FIXED VERSION
export const getCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Calculate profile completeness - This was missing in AIService
    const profileCompleteness = AIService.calculateProfileCompleteness(user);
    
    // Ensure profile structure exists
    user.profile = user.profile || {};
    user.profile.skills = user.profile.skills || [];
    user.profile.experience = user.profile.experience || [];
    user.profile.education = user.profile.education || [];
    user.profile.projects = user.profile.projects || [];
    user.profile.certifications = user.profile.certifications || [];
    user.profile.aiAnalysis = user.profile.aiAnalysis || null;
    
    res.json({
      status: 'success',
      data: {
        profile: {
          personalInfo: {
            fullName: user.fullName,
            email: user.email,
            mobile: user.mobile,
            location: user.profile?.location || '',
            website: user.profile?.website || '',
            linkedin: user.profile?.linkedin || '',
            github: user.profile?.github || '',
            portfolio: user.profile?.portfolio || '',
            bio: user.profile?.bio || ''
          },
          education: user.profile.education,
          experience: user.profile.experience,
          skills: user.profile.skills,
          projects: user.profile.projects,
          certifications: user.profile.certifications || [],
          resume: user.profile.resume || null,
          aiAnalysis: user.profile.aiAnalysis || null,
          profileCompleteness
        }
      }
    });
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error fetching candidate profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const uploadCandidateResume = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No file uploaded' 
      });
    }
    
    console.log('Uploading resume for user:', userId, 'File size:', req.file.size, 'Type:', req.file.mimetype);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');
    try {
      await fs.access(uploadsDir);
    } catch (error) {
      console.log('Creating uploads directory:', uploadsDir);
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const originalName = req.file.originalname || 'resume';
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${uniqueId}-${cleanName}`;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('Saving file to:', filePath);
    
    // Save file from buffer
    await fs.writeFile(filePath, req.file.buffer);
    
    // Initialize profile if not exists
    user.profile = user.profile || {};
    
    // Update resume info
    user.profile.resume = {
      url: `/api/uploads/resumes/${filename}`,
      originalName: originalName,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedAt: new Date(),
      filePath: filePath
    };
    
    // Save user
    await user.save();
    
    console.log('Resume saved successfully for user:', userId);
    
    // Calculate updated profile completeness
    const profileCompleteness = AIService.calculateProfileCompleteness(user);
    
    // Return success response immediately
    res.json({
      status: 'success',
      message: 'Resume uploaded successfully!',
      data: {
        resume: user.profile.resume,
        profileCompleteness
      }
    });
    
    // Start AI analysis in background (non-blocking)
    setTimeout(async () => {
      try {
        console.log('Starting background AI analysis for user:', userId);
        
        // Extract text from resume
        let resumeText = '';
        try {
          const fileExt = path.extname(originalName).toLowerCase();
          resumeText = await AIService.extractTextFromFile(filePath, fileExt);
          console.log('Resume text extracted, length:', resumeText?.length || 0);
        } catch (extractError) {
          console.error('Error extracting text:', extractError);
          resumeText = 'Resume content extraction failed';
        }
        
        // Analyze resume with AI
        try {
          const aiAnalysis = await AIService.analyzeResumeWithChatGPT(resumeText, {
            skills: user.profile.skills?.map(s => s.name) || [],
            experience: user.profile.experience?.length || 0,
            education: user.profile.education || []
          });
          
          console.log('AI analysis completed for user:', userId);
          
          // Update user with AI analysis
          await User.findByIdAndUpdate(userId, {
            $set: {
              'profile.aiAnalysis': aiAnalysis,
              'profile.lastAnalyzed': new Date()
            }
          });
          
          console.log('AI analysis saved to database for user:', userId);
          
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
        }
      } catch (error) {
        console.error('Background processing error:', error);
      }
    }, 1000); // Wait 1 second before starting background processing
    
  } catch (error) {
    console.error('Upload candidate resume error:', error);
    
    // More specific error messages
    let errorMessage = 'Error uploading resume';
    if (error.code === 'ENOENT') {
      errorMessage = 'Upload directory error';
    } else if (error.message.includes('file size')) {
      errorMessage = 'File size too large (max 5MB)';
    } else if (error.message.includes('file type')) {
      errorMessage = 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.';
    }
    
    res.status(500).json({ 
      status: 'error',
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get AI Analysis Report
export const getAIAnalysisReport = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('profile fullName email');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    if (!user.profile?.aiAnalysis) {
      return res.status(404).json({ 
        status: 'error',
        message: 'No AI analysis found. Please upload a resume first.' 
      });
    }
    
    // Generate detailed report
    const detailedReport = await AIService.generateAIReport(
      user.profile.aiAnalysis,
      {
        fullName: user.fullName,
        email: user.email,
        skills: user.profile.skills || [],
        experience: user.profile.experience || [],
        education: user.profile.education || []
      }
    );
    
    // Calculate profile completeness
    const profileCompleteness = AIService.calculateProfileCompleteness(user);
    
    res.json({
      status: 'success',
      data: {
        report: detailedReport,
        analysis: user.profile.aiAnalysis,
        profileCompleteness,
        generatedAt: new Date().toISOString(),
        resumeInfo: user.profile.resume
      }
    });
  } catch (error) {
    console.error('Get AI analysis report error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating AI analysis report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update candidate profile
export const updateCandidateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { personalInfo, education, experience, skills, projects, certifications } = req.body;
    
    console.log('Updating profile for user:', userId);
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Update basic info
    if (personalInfo?.fullName) {
      user.fullName = personalInfo.fullName.trim();
    }
    if (personalInfo?.mobile) {
      user.mobile = personalInfo.mobile.trim();
    }
    
    // Initialize profile if not exists
    user.profile = user.profile || {};
    
    // Update personal info fields
    const personalFields = ['location', 'website', 'linkedin', 'github', 'portfolio', 'bio'];
    personalFields.forEach(field => {
      if (personalInfo?.[field] !== undefined) {
        user.profile[field] = personalInfo[field]?.trim() || '';
      }
    });
    
    // Update education array
    if (education && Array.isArray(education)) {
      user.profile.education = education.map(edu => ({
        degree: edu.degree?.trim() || '',
        institution: edu.institution?.trim() || '',
        year: parseInt(edu.year) || new Date().getFullYear(),
        gpa: edu.gpa?.trim() || '',
        fieldOfStudy: edu.fieldOfStudy?.trim() || ''
      }));
    }
    
    // Update experience array
    if (experience && Array.isArray(experience)) {
      user.profile.experience = experience.map(exp => ({
        company: exp.company?.trim() || '',
        position: exp.position?.trim() || '',
        startDate: exp.startDate ? new Date(exp.startDate) : new Date(),
        endDate: exp.current || exp.isFresher ? null : (exp.endDate ? new Date(exp.endDate) : null),
        current: exp.current || false,
        isFresher: exp.isFresher || false,
        description: exp.description?.trim() || ''
      }));
    }
    
    // Update skills array
    if (skills && Array.isArray(skills)) {
      user.profile.skills = skills.map(skill => ({
        name: skill.name?.trim() || '',
        proficiency: Math.min(Math.max(parseInt(skill.proficiency) || 5, 1), 10),
        yearsOfExperience: parseFloat(skill.yearsOfExperience) || 0
      }));
    }
    
    // Update projects array
    if (projects && Array.isArray(projects)) {
      user.profile.projects = projects.map(project => ({
        title: project.title?.trim() || '',
        description: project.description?.trim() || '',
        technologies: Array.isArray(project.technologies) 
          ? project.technologies.map(t => t.trim()).filter(t => t.length > 0)
          : (project.technologies ? project.technologies.split(',').map(t => t.trim()).filter(t => t.length > 0) : []),
        githubLink: project.githubLink?.trim() || '',
        liveLink: project.liveLink?.trim() || '',
        duration: project.duration?.trim() || '',
        createdAt: new Date()
      }));
    }
    
    // Update certifications
    if (certifications && Array.isArray(certifications)) {
      user.profile.certifications = certifications.map(cert => cert.trim()).filter(cert => cert.length > 0);
    }
    
    // Save user
    await user.save();
    
    // Calculate updated profile completeness
    const profileCompleteness = AIService.calculateProfileCompleteness(user);
    
    console.log('Profile updated successfully for user:', userId, 'Completeness:', profileCompleteness);
    
    // Return updated profile
    const updatedUser = await User.findById(userId)
      .select('-password -passwordChangedAt -passwordResetToken -passwordResetExpires');
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        profile: {
          personalInfo: {
            fullName: updatedUser.fullName,
            email: updatedUser.email,
            mobile: updatedUser.mobile,
            location: updatedUser.profile?.location || '',
            website: updatedUser.profile?.website || '',
            linkedin: updatedUser.profile?.linkedin || '',
            github: updatedUser.profile?.github || '',
            portfolio: updatedUser.profile?.portfolio || '',
            bio: updatedUser.profile?.bio || ''
          },
          education: updatedUser.profile.education || [],
          experience: updatedUser.profile.experience || [],
          skills: updatedUser.profile.skills || [],
          projects: updatedUser.profile.projects || [],
          certifications: updatedUser.profile.certifications || [],
          resume: updatedUser.profile.resume || null,
          aiAnalysis: updatedUser.profile.aiAnalysis || null,
          profileCompleteness
        }
      }
    });
  } catch (error) {
    console.error('Update candidate profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        status: 'error',
        message: 'Validation error',
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Duplicate field value entered'
      });
    }
    
    res.status(500).json({ 
      status: 'error',
      message: 'Error updating candidate profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
