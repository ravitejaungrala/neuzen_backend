// backend/services/hrAIService.js - UPDATED WITH GEMINI AI
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class HRAIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key-for-development');
  }

  // Helper method to call Gemini AI
  async callGeminiAI(prompt, systemInstruction = null, responseFormat = 'text') {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      if (responseFormat === 'json') {
        try {
          // Clean the response text to extract JSON
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return { error: "Could not parse JSON response" };
        } catch (parseError) {
          console.error('JSON parsing error:', parseError);
          return { error: "Invalid JSON response" };
        }
      }
      
      return response.text();
    } catch (error) {
      console.error('Gemini AI API error:', error);
      throw error;
    }
  }

  // Enhanced resume analysis for HR
  async analyzeResumeForHR(resumeText, candidateProfile = {}) {
    try {
      const prompt = this.createHRAnalysisPrompt(resumeText, candidateProfile);
      
      const systemInstruction = "You are an expert HR analyst. Analyze resumes thoroughly and provide detailed insights for hiring decisions. Always respond with valid JSON.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'json');
      
      return {
        ...response,
        analyzedAt: new Date().toISOString(),
        aiModel: "gemini-1.5-flash"
      };
      
    } catch (error) {
      console.error('HR AI Service error:', error);
      return this.generateMockAnalysis(resumeText, candidateProfile);
    }
  }

  createHRAnalysisPrompt(resumeText, candidateProfile) {
    return `Analyze this candidate's resume for HR hiring purposes:

RESUME CONTENT:
${resumeText.substring(0, 4000)}

CANDIDATE PROFILE:
- Name: ${candidateProfile.fullName || 'Candidate'}
- Current Role: ${candidateProfile.currentRole || 'Not specified'}
- Years of Experience: ${candidateProfile.experience || 'Not specified'}

Please provide a comprehensive analysis in this JSON format:
{
  "overallScore": 85,
  "summary": "Brief overall assessment",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "skillsGapAnalysis": {
    "strongSkills": ["Skill 1", "Skill 2"],
    "missingSkills": ["Skill 3", "Skill 4"],
    "developmentAreas": ["Area 1", "Area 2"]
  },
  "culturalFit": {
    "score": 80,
    "traits": ["Trait 1", "Trait 2"],
    "recommendedEnvironments": ["Startup", "Tech Company"]
  },
  "careerProgression": {
    "potentialRoles": ["Role 1", "Role 2"],
    "timeline": "6-12 months",
    "developmentPath": "Suggested career path"
  },
  "interviewRecommendations": {
    "technicalQuestions": ["Question 1", "Question 2"],
    "behavioralQuestions": ["Question 1", "Question 2"],
    "redFlagsToWatch": ["Flag 1", "Flag 2"]
  },
  "compensationAnalysis": {
    "marketRate": "$XX,XXX - $XX,XXX",
    "valueProposition": "Candidate's value add",
    "negotiationTips": ["Tip 1", "Tip 2"]
  }
}`;
  }

  generateMockAnalysis(resumeText, candidateProfile) {
    return {
      overallScore: Math.floor(Math.random() * 30) + 65,
      summary: "Strong technical candidate with good experience in web development. Shows potential for growth.",
      strengths: [
        "Solid foundation in modern web technologies",
        "Good problem-solving skills",
        "Team player with collaborative mindset"
      ],
      weaknesses: [
        "Limited leadership experience",
        "Could benefit from more specialized skills",
        "Lack of cloud infrastructure experience"
      ],
      skillsGapAnalysis: {
        strongSkills: ["JavaScript", "React", "Node.js", "HTML/CSS"],
        missingSkills: ["TypeScript", "Docker", "AWS", "GraphQL"],
        developmentAreas: ["Advanced React patterns", "System design", "DevOps"]
      },
      culturalFit: {
        score: 78,
        traits: ["Adaptable", "Detail-oriented", "Collaborative"],
        recommendedEnvironments: ["Tech startups", "Product companies", "Remote teams"]
      },
      careerProgression: {
        potentialRoles: ["Senior Developer", "Tech Lead", "Frontend Architect"],
        timeline: "12-18 months",
        developmentPath: "Focus on leadership skills and specialized technologies"
      },
      interviewRecommendations: {
        technicalQuestions: [
          "Explain React hooks and their benefits",
          "How would you optimize a slow React application?",
          "Describe your experience with Node.js backend development"
        ],
        behavioralQuestions: [
          "Tell us about a challenging project you led",
          "How do you handle conflicting priorities?",
          "Describe your approach to mentoring junior developers"
        ],
        redFlagsToWatch: [
          "Limited experience with testing frameworks",
          "No experience with CI/CD pipelines"
        ]
      },
      compensationAnalysis: {
        marketRate: "$80,000 - $120,000",
        valueProposition: "Strong individual contributor with potential for leadership",
        negotiationTips: [
          "Focus on technical skills and project experience",
          "Highlight ability to mentor junior team members",
          "Discuss interest in taking on leadership responsibilities"
        ]
      },
      analyzedAt: new Date().toISOString(),
      aiModel: "mock-analysis"
    };
  }

  // Generate job description
  async generateJobDescription(jobData) {
    try {
      const { title, requiredSkills, experience, companyName } = jobData;
      
      const prompt = `Generate a professional job description for a ${title} position.

Requirements:
- Required Skills: ${requiredSkills.join(', ')}
- Experience: ${experience} years
- Company: ${companyName}

Include the following sections:
1. Job Title and Summary
2. Responsibilities
3. Requirements (Must have and Nice to have)
4. Benefits
5. About the Company

Make it engaging and professional.`;

      const systemInstruction = "You are an expert HR professional who writes compelling job descriptions.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');
      
      return response;
      
    } catch (error) {
      console.error('Job description generation error:', error);
      return this.generateMockJobDescription(jobData);
    }
  }

  generateMockJobDescription(jobData) {
    const { title, requiredSkills, experience, companyName } = jobData;
    
    return `
${title}

We are looking for a talented ${title} to join our dynamic team at ${companyName}. You will be responsible for developing and maintaining high-quality software solutions.

Responsibilities:
- Develop and maintain web applications using modern technologies
- Collaborate with cross-functional teams to define, design, and ship new features
- Write clean, maintainable, and efficient code
- Participate in code reviews and technical discussions
- Stay updated with emerging technologies and industry trends

Requirements:
- ${experience}+ years of professional experience
- Strong proficiency in ${requiredSkills.slice(0, 3).join(', ')}
- Experience with modern web development practices
- Excellent problem-solving and communication skills
- Bachelor's degree in Computer Science or related field (preferred)

Benefits:
- Competitive salary and benefits package
- Flexible work hours and remote work options
- Professional development opportunities
- Collaborative and innovative work environment
- Health insurance and wellness programs

About ${companyName}:
Join us and be part of an innovative team that values creativity, technical excellence, and collaboration. We're committed to building great products and helping our team members grow professionally.`;
  }
}

export default new HRAIService();