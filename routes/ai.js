// backend/routes/ai.js
import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import AIService from '../services/aiService.js';

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// Generate AI analysis report
router.get('/analysis-report', restrictTo('candidate'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real implementation, you would fetch user data from database
    // For now, return a sample report
    const sampleAnalysis = {
      extractedSkills: ["JavaScript", "React", "Node.js", "MongoDB", "Express"],
      yearsOfExperience: 3,
      education: [
        { degree: "Bachelor of Science", institution: "University", year: 2020 }
      ],
      workExperience: [
        { company: "Tech Company", position: "Software Developer", duration: "2 years" }
      ],
      strengths: ["Problem Solving", "Team Collaboration", "Technical Skills"],
      areasForImprovement: ["Could add more project details", "Consider certifications"],
      suggestedRoles: ["Full Stack Developer", "Frontend Developer", "Backend Developer"],
      matchScore: 78
    };
    
    const userProfile = {
      fullName: req.user.fullName,
      email: req.user.email,
      skills: req.user.profile?.skills || [],
      experience: req.user.profile?.experience || [],
      education: req.user.profile?.education || []
    };
    
    const report = await AIService.generateAIReport(sampleAnalysis, userProfile);
    
    res.json({
      status: 'success',
      data: {
        report,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI report generation error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating AI report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Analyze resume text (for testing)
router.post('/analyze-resume-text', restrictTo('candidate'), async (req, res) => {
  try {
    const { resumeText } = req.body;
    
    if (!resumeText) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Resume text is required' 
      });
    }
    
    const analysis = await AIService.analyzeResumeWithChatGPT(resumeText);
    
    res.json({
      status: 'success',
      data: {
        analysis,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error analyzing resume',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get profile completeness score
router.get('/profile-completeness', restrictTo('candidate'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In real implementation, fetch user from database
    const user = {
      fullName: req.user.fullName,
      email: req.user.email,
      mobile: req.user.mobile,
      profile: req.user.profile || {}
    };
    
    const completeness = AIService.calculateProfileCompleteness(user);
    
    res.json({
      status: 'success',
      data: {
        profileCompleteness: completeness,
        breakdown: {
          personalInfo: 30,
          skills: 20,
          experience: 20,
          education: 15,
          projects: 10,
          resume: 5
        }
      }
    });
  } catch (error) {
    console.error('Profile completeness error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error calculating profile completeness',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;