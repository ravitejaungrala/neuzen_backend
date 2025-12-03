// backend/controllers/aiAnalysisController.js
import User from '../models/User.js';
import AIService from '../services/aiService.js';
import path from 'path';

// Get AI Analysis
export const getAIAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('profile fullName email mobile');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    // Check if AI analysis exists
    if (!user.profile?.aiAnalysis) {
      // Return mock data for testing if no analysis exists
      const mockAnalysis = generateMockAnalysis(user);
      return res.json({
        status: 'success',
        data: {
          analysis: mockAnalysis,
          analyzedAt: new Date().toISOString(),
          isMock: true,
          hasResume: !!user.profile?.resume
        }
      });
    }
    
    res.json({
      status: 'success',
      data: {
        analysis: user.profile.aiAnalysis,
        analyzedAt: user.profile.lastAnalyzed || new Date(),
        isMock: false,
        hasResume: !!user.profile?.resume
      }
    });
  } catch (error) {
    console.error('Get AI analysis error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error getting AI analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate new AI Analysis
export const generateAIAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }
    
    if (!user.profile?.resume?.filePath) {
      return res.status(400).json({ 
        status: 'error',
        message: 'No resume found. Please upload a resume first.' 
      });
    }
    
    // Return immediate response
    res.json({
      status: 'success',
      message: 'AI analysis started successfully',
      data: {
        analysisId: `analysis_${Date.now()}`,
        status: 'processing',
        estimatedTime: '2-3 minutes'
      }
    });
    
    // Process in background
    setTimeout(async () => {
      try {
        console.log('Generating AI analysis for user:', userId);
        
        // Generate mock analysis for testing
        const mockAnalysis = generateMockAnalysis(user);
        
        // Update user with new analysis
        await User.findByIdAndUpdate(userId, {
          $set: {
            'profile.aiAnalysis': mockAnalysis,
            'profile.lastAnalyzed': new Date()
          }
        });
        
        console.log('AI analysis completed for user:', userId);
        
      } catch (aiError) {
        console.error('AI analysis generation failed:', aiError);
      }
    }, 1000);
    
  } catch (error) {
    console.error('Generate AI analysis error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating AI analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to generate mock analysis
const generateMockAnalysis = (user) => {
  return {
    summary: {
      overallScore: Math.floor(Math.random() * 30) + 70,
      grade: getGrade(Math.floor(Math.random() * 30) + 70),
      summaryText: `AI analysis of ${user.fullName}'s resume shows strong technical skills in modern web development. Based on ${user.profile?.experience?.length || 2} years of experience, the profile demonstrates proficiency in full-stack development with good project experience.`,
      strengths: ['Strong technical foundation', 'Good communication skills', 'Project experience'],
      areasForImprovement: ['Add more quantifiable achievements', 'Include specific technologies', 'Expand professional network']
    },
    extractedSkills: {
      technical: ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'MongoDB', 'Express', 'Git', 'REST APIs'],
      soft: ['Communication', 'Teamwork', 'Problem Solving', 'Time Management'],
      missing: ['Docker', 'AWS', 'TypeScript', 'CI/CD'],
      recommendations: ['Learn cloud technologies', 'Add certification', 'Improve portfolio']
    },
    experienceAnalysis: {
      totalExperience: user.profile?.experience?.length || 2,
      careerProgression: true,
      achievementsHighlighted: true,
      gaps: [],
      recommendations: ['Quantify achievements', 'Add metrics', 'Show impact'],
      roles: [
        { title: 'Full Stack Developer', years: 2, match: 85 },
        { title: 'Frontend Developer', years: 2, match: 90 },
        { title: 'Software Engineer', years: 2, match: 88 }
      ]
    },
    educationAnalysis: {
      degrees: user.profile?.education || [
        { 
          degree: 'Bachelor of Technology in Computer Science', 
          institution: 'University of Technology', 
          year: 2020 
        }
      ],
      certifications: [],
      strengths: ['Relevant degree', 'Good academic record'],
      improvements: ['Add certifications', 'Take online courses']
    },
    keywordAnalysis: {
      atsScore: Math.floor(Math.random() * 30) + 70,
      missingKeywords: ['React Hooks', 'REST API', 'Agile Methodology', 'Responsive Design'],
      recommendedKeywords: ['React Hooks', 'Context API', 'Redux', 'Webpack'],
      keywordDensity: 4.5
    },
    careerRecommendations: {
      suitableRoles: ['Frontend Developer', 'Full Stack Developer', 'Software Engineer', 'Web Developer'],
      industries: ['Technology', 'E-commerce', 'Fintech', 'SaaS'],
      nextSteps: ['Update LinkedIn profile', 'Build portfolio website', 'Network on professional platforms'],
      salaryRange: '₹6-12 LPA',
      marketDemand: 85
    },
    aiInsights: {
      strengths: ['Technical skills', 'Problem solving', 'Adaptability', 'Project management'],
      weaknesses: ['Limited cloud experience', 'Few certifications', 'No open-source contributions'],
      opportunities: ['Remote work opportunities', 'Tech startups', 'Freelancing projects'],
      threats: ['Market competition', 'Rapid technology changes', 'Skill gaps']
    },
    improvementSuggestions: [
      'Add quantifiable achievements to experience section',
      'Include specific project metrics and results',
      'Update skills section with latest technologies',
      'Add relevant certifications and courses',
      'Improve resume formatting and structure',
      'Include GitHub link with active projects',
      'Add LinkedIn profile URL'
    ],
    profileMatch: Math.floor(Math.random() * 30) + 70,
    analyzedAt: new Date().toISOString()
  };
};

// Helper function to get grade
const getGrade = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  return 'C';
};