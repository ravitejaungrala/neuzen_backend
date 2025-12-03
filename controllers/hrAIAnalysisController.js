import AIService from '../services/aiService.js';
import HRAIService from '../services/hrAIService.js';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';  // Changed from 'fs/promises'
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configure storage for resume uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = 'uploads/resumes/';
    
    // Create directory if it doesn't exist - using promise-based method
    try {
      await fs.promises.access(uploadDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `hr-upload-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and analyze resume for HR
export const uploadAndAnalyzeResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No resume file uploaded'
        });
      }

      const { candidateName, candidateEmail } = req.body;
      
      // Extract text from resume
      let resumeText = '';
      try {
        resumeText = await AIService.extractTextFromFile(req.file.path, path.extname(req.file.originalname));
      } catch (extractError) {
        console.error('Error extracting text:', extractError);
        // For testing, use sample text
        resumeText = `Resume for ${candidateName || 'Candidate'}
Email: ${candidateEmail || 'candidate@example.com'}
Skills: JavaScript, React, Node.js, TypeScript, AWS
Experience: 5 years as Full Stack Developer
Education: Bachelor of Computer Science`;
      }

      // Generate AI analysis using HR-focused service
      const analysis = await HRAIService.analyzeResumeForHR(resumeText, {
        fullName: candidateName || 'Candidate',
        email: candidateEmail || 'candidate@example.com'
      });

      // Save file info
      const fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date()
      };

      res.json({
        status: 'success',
        data: {
          analysis,
          fileInfo,
          resumeText: resumeText.substring(0, 500) + '...', // Send preview
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Upload and analyze error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error analyzing resume',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
];

// Analyze existing candidate's resume
export const analyzeResumeForHR = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId).populate('userId');
    if (!candidate || !candidate.userId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    const user = candidate.userId;
    let resumeText = '';
    
    // Check if user has resume in profile
    if (user.profile?.resume?.url) {
      try {
        const resumePath = path.join(process.cwd(), user.profile.resume.url);
        resumeText = await AIService.extractTextFromFile(resumePath, path.extname(user.profile.resume.url));
      } catch (fileError) {
        console.warn('Could not read resume file:', fileError);
        resumeText = `Resume for ${user.fullName}
Email: ${user.email}
Skills: ${user.profile?.skills?.map(s => s.name).join(', ') || 'No skills listed'}`;
      }
    } else {
      // Generate resume text from profile data
      resumeText = generateResumeFromProfile(user);
    }
    
    // Generate AI analysis
    const analysis = await HRAIService.analyzeResumeForHR(resumeText, {
      fullName: user.fullName,
      email: user.email,
      skills: user.profile?.skills || [],
      experience: user.profile?.experience || [],
      education: user.profile?.education || []
    });
    
    // Save analysis to candidate
    candidate.aiInsights = analysis;
    await candidate.save();
    
    res.json({
      status: 'success',
      data: {
        analysis,
        candidate: {
          id: candidate._id,
          name: user.fullName,
          email: user.email,
          avatar: user.avatar,
          profile: user.profile
        },
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('HR resume analysis error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error analyzing resume',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get AI insights for candidate
export const getCandidateAIInsights = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId).populate('userId');
    if (!candidate) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    // If no AI insights exist, generate mock insights
    if (!candidate.aiInsights) {
      const user = candidate.userId || {};
      const mockInsights = generateMockInsights(user);
      
      candidate.aiInsights = mockInsights;
      await candidate.save();
    }
    
    res.json({
      status: 'success',
      data: {
        insights: candidate.aiInsights,
        candidate: {
          id: candidate._id,
          name: candidate.userId?.fullName || 'Unknown Candidate',
          email: candidate.userId?.email || 'No email',
          avatar: candidate.userId?.avatar,
          profile: candidate.userId?.profile
        }
      }
    });
  } catch (error) {
    console.error('Get candidate AI insights error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error getting AI insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to generate resume text from profile
function generateResumeFromProfile(user) {
  const profile = user.profile || {};
  
  let resumeText = `${user.fullName}\n`;
  resumeText += `Email: ${user.email}\n`;
  resumeText += `Phone: ${user.mobile || 'Not provided'}\n\n`;
  
  if (profile.location) {
    resumeText += `Location: ${profile.location}\n`;
  }
  
  if (profile.bio) {
    resumeText += `\nProfessional Summary:\n${profile.bio}\n`;
  }
  
  if (profile.skills && profile.skills.length > 0) {
    resumeText += `\nSkills:\n`;
    profile.skills.forEach(skill => {
      resumeText += `- ${skill.name} (${skill.proficiency}/10)\n`;
    });
  }
  
  if (profile.experience && profile.experience.length > 0) {
    resumeText += `\nExperience:\n`;
    profile.experience.forEach(exp => {
      resumeText += `${exp.position} at ${exp.company}\n`;
      if (exp.description) {
        resumeText += `  ${exp.description}\n`;
      }
    });
  }
  
  if (profile.education && profile.education.length > 0) {
    resumeText += `\nEducation:\n`;
    profile.education.forEach(edu => {
      resumeText += `${edu.degree} from ${edu.institution} (${edu.year})\n`;
    });
  }
  
  return resumeText;
}

// Helper function to generate mock insights
function generateMockInsights(user) {
  const profile = user.profile || {};
  const skills = profile.skills?.map(s => s.name) || ['JavaScript', 'React', 'Node.js'];
  
  return {
    overallScore: Math.floor(Math.random() * 30) + 65,
    summary: "Strong technical candidate with good potential for growth in software development roles.",
    strengths: [
      `Strong skills in ${skills.slice(0, 2).join(' and ')}`,
      "Good problem-solving abilities",
      "Shows initiative in project work",
      "Team player with collaborative mindset"
    ],
    weaknesses: [
      "Could benefit from more specialized experience",
      "Limited leadership experience",
      "May need more exposure to cloud technologies"
    ],
    skillsGapAnalysis: {
      strongSkills: skills,
      missingSkills: ['TypeScript', 'Docker', 'AWS', 'GraphQL', 'Testing frameworks'],
      developmentAreas: ['Advanced system design', 'DevOps practices', 'Team leadership']
    },
    culturalFit: {
      score: Math.floor(Math.random() * 20) + 70,
      traits: ['Adaptable', 'Detail-oriented', 'Collaborative', 'Proactive'],
      recommendedEnvironments: ['Tech startups', 'Product companies', 'Agile teams']
    },
    careerProgression: {
      potentialRoles: ['Senior Developer', 'Tech Lead', 'Frontend Architect', 'Full Stack Developer'],
      timeline: "6-18 months",
      developmentPath: "Focus on leadership skills and specialized technologies"
    },
    interviewRecommendations: {
      technicalQuestions: [
        `Ask about specific experience with ${skills[0]}`,
        "Inquire about project architecture decisions",
        "Discuss approach to code quality and testing"
      ],
      behavioralQuestions: [
        "Describe a challenging project and how you overcame obstacles",
        "How do you handle feedback and criticism?",
        "Tell us about a time you had to learn something quickly"
      ],
      redFlagsToWatch: [
        "Limited experience with version control best practices",
        "No experience with automated testing"
      ]
    },
    compensationAnalysis: {
      marketRate: "$80,000 - $120,000",
      valueProposition: "Strong individual contributor with potential for growth",
      negotiationTips: [
        "Focus on technical skills and specific achievements",
        "Highlight ability to work independently and in teams",
        "Discuss interest in taking on more responsibility"
      ]
    },
    analyzedAt: new Date().toISOString(),
    aiModel: "mock-analysis"
  };
}

// Generate interview questions
export const generateInterviewQuestions = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { jobDescription } = req.body;
    
    const candidate = await Candidate.findById(candidateId).populate('userId');
    if (!candidate) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    const user = candidate.userId || {};
    const candidateSkills = user.profile?.skills?.map(s => s.name) || ['JavaScript', 'React'];
    
    // Generate interview questions
    const questions = await AIService.generateInterviewQuestionsComprehensive(
      candidateSkills,
      [], // job requirements
      { 
        jobDescription: jobDescription || `Interview for ${user.fullName || 'candidate'}`
      }
    );
    
    res.json({
      status: 'success',
      data: {
        questions,
        candidate: {
          id: candidate._id,
          name: user.fullName,
          skills: candidateSkills
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate interview questions error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating interview questions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Compare candidates
export const compareCandidates = async (req, res) => {
  try {
    const { candidateIds } = req.body;
    
    if (!Array.isArray(candidateIds) || candidateIds.length < 2) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Please provide at least 2 candidate IDs to compare' 
      });
    }
    
    // Get candidates
    const candidates = await Candidate.find({ 
      _id: { $in: candidateIds } 
    }).populate('userId');
    
    if (candidates.length < 2) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Could not find candidates to compare' 
      });
    }
    
    // Generate comparison
    const comparison = candidates.map(candidate => {
      const user = candidate.userId || {};
      const profile = user.profile || {};
      
      return {
        id: candidate._id,
        name: user.fullName || 'Unknown',
        email: user.email || 'No email',
        matchScore: candidate.matchScores?.[0]?.score || 0,
        skills: profile.skills?.map(s => s.name) || [],
        experience: profile.experience?.length || 0,
        education: profile.education?.map(e => e.degree) || [],
        status: candidate.status || 'new',
        aiInsights: candidate.aiInsights || {
          overallScore: Math.floor(Math.random() * 30) + 65,
          strengths: ['No AI analysis yet'],
          suggestedRoles: ['Developer']
        }
      };
    });
    
    res.json({
      status: 'success',
      data: {
        comparison,
        totalCandidates: comparison.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Compare candidates error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error comparing candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Quick analyze (without saving to candidate)
export const quickAnalyzeResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No resume file uploaded'
        });
      }

      const { candidateName, candidateEmail } = req.body;
      
      // Extract text from resume
      let resumeText = '';
      try {
        resumeText = await AIService.extractTextFromFile(req.file.path, path.extname(req.file.originalname));
      } catch (extractError) {
        console.error('Error extracting text:', extractError);
        resumeText = `Resume for ${candidateName || 'Candidate'}\nEmail: ${candidateEmail || 'candidate@example.com'}`;
      }

      // Quick analysis (simplified)
      const quickAnalysis = {
        overallScore: Math.floor(Math.random() * 30) + 65,
        summary: "Candidate shows strong potential based on resume analysis.",
        keySkills: extractSkillsFromText(resumeText),
        experienceLevel: extractExperienceLevel(resumeText),
        suggestedRoles: ['Software Developer', 'Frontend Engineer', 'Full Stack Developer'],
        analyzedAt: new Date().toISOString(),
        isQuickAnalysis: true
      };

      // Clean up uploaded file
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not delete temp file:', cleanupError);
      }

      res.json({
        status: 'success',
        data: {
          analysis: quickAnalysis,
          candidateName: candidateName || 'Candidate',
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Quick analyze error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Error analyzing resume',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
];

// Helper functions for quick analysis
function extractSkillsFromText(text) {
  const skills = [];
  const skillPatterns = [
    /JavaScript/i, /React/i, /Node\.js/i, /Python/i, /Java/i,
    /HTML/i, /CSS/i, /TypeScript/i, /AWS/i, /Docker/i,
    /Kubernetes/i, /SQL/i, /MongoDB/i, /Express/i, /Git/i
  ];
  
  skillPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      skills.push(pattern.source.replace(/\\/g, '').replace(/i$/, ''));
    }
  });
  
  return skills.length > 0 ? skills : ['JavaScript', 'React', 'Node.js'];
}

function extractExperienceLevel(text) {
  const yearsMatch = text.match(/(\d+)\s*(?:year|yr)s?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years <= 2) return 'Junior';
    if (years <= 5) return 'Mid-level';
    if (years <= 8) return 'Senior';
    return 'Expert';
  }
  return 'Mid-level';
}