// backend/services/aiService.js - UPDATED WITH GEMINI AI
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Try to import optional dependencies
let pdfParse, mammoth;
try {
  pdfParse = (await import('pdf-parse')).default;
} catch (error) {
  console.warn('pdf-parse not installed, PDF parsing will be limited');
  pdfParse = null;
}

try {
  mammoth = (await import('mammoth')).default;
} catch (error) {
  console.warn('mammoth not installed, DOCX parsing will be limited');
  mammoth = null;
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIService {
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

  // ===== File Processing Methods =====
  async extractTextFromFile(filePath, fileType) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error('File does not exist:', filePath);
        return 'File not found';
      }
      
      const buffer = fs.readFileSync(filePath);
      
      switch (fileType.toLowerCase()) {
        case '.pdf':
        case 'pdf':
        case 'application/pdf':
          if (pdfParse) {
            const pdfData = await pdfParse(buffer);
            return pdfData.text;
          } else {
            console.warn('pdf-parse not available, using fallback PDF extraction');
            return this.extractTextFallback(buffer, 'pdf');
          }
        
        case '.docx':
        case 'docx':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          if (mammoth) {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
          } else {
            console.warn('mammoth not available, using fallback DOCX extraction');
            return this.extractTextFallback(buffer, 'docx');
          }
        
        case '.doc':
        case 'doc':
        case 'application/msword':
          return this.extractTextFallback(buffer, 'doc');
        
        case '.txt':
        case 'txt':
        case 'text/plain':
          return buffer.toString('utf-8');
        
        default:
          return buffer.toString('utf-8', 0, 50000);
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      // Return empty string instead of throwing to avoid breaking the flow
      return `Error extracting text: ${error.message}`;
    }
  }

  extractTextFallback(buffer, fileType) {
    try {
      // Basic text extraction
      let text = buffer.toString('utf-8', 0, 50000);
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      
      if (text.length < 100) {
        return `[${fileType.toUpperCase()} file - content could not be extracted properly]`;
      }
      
      return text;
    } catch (error) {
      console.warn('Fallback extraction failed:', error);
      return `[${fileType.toUpperCase()} file - extraction failed]`;
    }
  }

  // ===== Resume Analysis Methods =====
  
  // Method 1: Original analyzeResume function
  async analyzeResume(resumeContent) {
    try {
      const prompt = `
        Analyze the following resume content and extract structured information:
        
        ${resumeContent}
        
        Please provide a JSON response with the following structure:
        {
          "skills": ["list of technical skills"],
          "experience": [
            {
              "company": "company name",
              "title": "job title",
              "duration": "employment duration",
              "description": "role description"
            }
          ],
          "education": [
            {
              "institution": "school/university name",
              "degree": "degree obtained",
              "year": "graduation year"
            }
          ],
          "certifications": ["list of certifications"],
          "summary": "brief professional summary"
        }
      `;

      const systemInstruction = "You are a resume parsing AI that extracts structured information from resumes. Always respond with valid JSON.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'json');
      
      return {
        text: resumeContent,
        parsedData: response,
        score: this.calculateResumeScore(response),
        extractedAt: new Date(),
        version: 'v1'
      };
    } catch (error) {
      console.error('AI resume analysis error:', error);
      return this.fallbackResumeAnalysis(resumeContent);
    }
  }

  // Method 2: Enhanced resume analysis with Gemini AI
  async analyzeResumeWithGemini(resumeText, candidateProfile = null) {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key-for-development') {
        console.warn('Gemini API key not configured, using mock analysis');
        return this.mockResumeAnalysis(resumeText);
      }

      const prompt = this.createAnalysisPrompt(resumeText, candidateProfile);
      
      console.log('Sending request to Gemini AI API...');
      
      const systemInstruction = "You are an expert resume analyzer and career advisor. Analyze resumes thoroughly and provide detailed, actionable insights. Always return valid JSON.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'json');
      
      console.log('Received response from Gemini AI');
      
      return this.parseAnalysisResponse(response);
      
    } catch (error) {
      console.error('Gemini AI analysis error:', error.message);
      return this.mockResumeAnalysis(resumeText);
    }
  }

  // Unified resume analysis method (recommended)
  async analyzeResumeComprehensive(resumeContent, options = {}) {
    const { useEnhanced = true, candidateProfile = null } = options;
    
    if (useEnhanced) {
      return this.analyzeResumeWithGemini(resumeContent, candidateProfile);
    } else {
      return this.analyzeResume(resumeContent);
    }
  }

  // ===== Job Description Generation =====
  async generateJobDescription(data) {
    try {
      const { title, skills, experience, companyName, tone = 'professional' } = data;
      
      const prompt = `
        Generate a compelling job description for a ${title} position.
        
        Requirements:
        - Required skills: ${skills.join(', ')}
        - Experience level: ${experience} years
        - Company: ${companyName}
        - Tone: ${tone}
        
        Include sections for:
        1. Job overview
        2. Responsibilities
        3. Requirements (must-have and nice-to-have)
        4. Benefits
        5. About the company
        
        Make it engaging and attractive to top talent.
      `;

      const systemInstruction = "You are an expert HR professional who writes compelling job descriptions.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');
      
      return response;
    } catch (error) {
      console.error('AI job description generation error:', error);
      return this.fallbackJobDescription(data);
    }
  }

  // ===== Interview Questions Generation =====
  
  // Method 1: Original generateInterviewQuestions function
  async generateInterviewQuestions(candidateSkills, jobRequirements) {
    try {
      const prompt = `
        Generate interview questions for a candidate with skills: ${candidateSkills.join(', ')}
        For a job requiring: ${jobRequirements.join(', ')}
        
        Provide questions in these categories:
        1. Technical skills assessment
        2. Behavioral questions
        3. Scenario-based questions
        4. Cultural fit questions
        
        Make the questions challenging but fair.
      `;

      const systemInstruction = "You are an experienced technical interviewer.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');
      
      return response;
    } catch (error) {
      console.error('AI interview questions generation error:', error);
      return this.fallbackInterviewQuestions(candidateSkills, jobRequirements);
    }
  }

  // Method 2: Enhanced interview questions generation
  async generateInterviewQuestionsJSON(jobDescription, candidateSkills) {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key-for-development') {
        return this.mockInterviewQuestions();
      }

      const prompt = `Generate interview questions for a candidate with skills: ${candidateSkills.join(', ')}
For the following job description:\n\n${jobDescription.substring(0, 2000)}\n\n
Provide questions in JSON format:
{
  "technical": ["Question 1", "Question 2"],
  "behavioral": ["Question 1", "Question 2"],
  "scenarioBased": ["Question 1"],
  "companySpecific": ["Question 1"]
}`;

      const systemInstruction = "You are an experienced hiring manager creating interview questions. Always respond with valid JSON.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'json');
      
      return this.parseInterviewQuestions(response);
      
    } catch (error) {
      console.error('Error generating interview questions:', error);
      return this.mockInterviewQuestions();
    }
  }

  // Unified interview questions generation
  async generateInterviewQuestionsComprehensive(candidateSkills, jobRequirements, options = {}) {
    const { useJSON = false, jobDescription = '' } = options;
    
    if (useJSON && jobDescription) {
      return this.generateInterviewQuestionsJSON(jobDescription, candidateSkills);
    } else {
      return this.generateInterviewQuestions(candidateSkills, jobRequirements);
    }
  }

  // ===== Candidate Insights =====
  async generateCandidateInsights(candidateData) {
    try {
      const { skills, experience, education, projects } = candidateData;
      
      const prompt = `
        Analyze this candidate profile and provide insights:
        
        Skills: ${skills.join(', ')}
        Experience: ${JSON.stringify(experience)}
        Education: ${JSON.stringify(education)}
        Projects: ${JSON.stringify(projects || [])}
        
        Provide insights in these areas:
        1. Strengths and unique capabilities
        2. Areas for development
        3. Recommended roles/career path
        4. Missing skills for senior roles
        5. Cultural fit assessment
        
        Be constructive and professional.
      `;

      const systemInstruction = "You are an expert career counselor and talent analyst.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');
      
      return response;
    } catch (error) {
      console.error('AI candidate insights generation error:', error);
      return this.fallbackCandidateInsights(candidateData);
    }
  }

  // ===== AI Report Generation =====
  async generateAIReport(analysisData, userProfile) {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock-key-for-development') {
        return this.mockAIReport(analysisData, userProfile);
      }

      const prompt = `Generate a comprehensive career analysis report based on this resume analysis:

RESUME ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

USER PROFILE:
Name: ${userProfile.fullName || 'Candidate'}
Email: ${userProfile.email || 'Not provided'}
Skills: ${JSON.stringify(userProfile.skills || [])}
Experience: ${JSON.stringify(userProfile.experience || [])}
Education: ${JSON.stringify(userProfile.education || [])}

Please provide a detailed, well-structured report with the following sections:
1. EXECUTIVE SUMMARY
2. SKILLS ASSESSMENT
3. EXPERIENCE EVALUATION
4. CAREER FIT ANALYSIS
5. SKILL GAPS IDENTIFIED
6. LEARNING RECOMMENDATIONS
7. MARKET TRENDS & OPPORTUNITIES
8. 30/60/90 DAY ACTION PLAN

Make the report professional, actionable, and encouraging. Include specific recommendations.`;

      const systemInstruction = "You are a professional career coach and resume expert. Generate detailed, actionable career analysis reports.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');
      
      return response;

    } catch (error) {
      console.error('Error generating AI report:', error);
      return this.mockAIReport(analysisData, userProfile);
    }
  }

  // ===== Helper Methods =====
  createAnalysisPrompt(resumeText, candidateProfile) {
    let prompt = `Analyze the following resume and provide a detailed AI analysis report in JSON format:\n\n`;
    
    const limitedResumeText = resumeText.substring(0, 8000);
    prompt += `RESUME TEXT:\n${limitedResumeText}\n\n`;
    
    if (candidateProfile) {
      prompt += `ADDITIONAL CANDIDATE INFORMATION:\n`;
      if (candidateProfile.skills) {
        prompt += `Current Skills: ${JSON.stringify(candidateProfile.skills)}\n`;
      }
      if (candidateProfile.experience) {
        prompt += `Experience: ${candidateProfile.experience} years\n`;
      }
      if (candidateProfile.education) {
        prompt += `Education: ${JSON.stringify(candidateProfile.education)}\n`;
      }
    }
    
    prompt += `\nProvide the analysis in this exact JSON structure:
{
  "summary": {
    "overallScore": 85,
    "grade": "B+",
    "summaryText": "Brief summary of the resume analysis"
  },
  "extractedSkills": {
    "technical": ["JavaScript", "React", "Node.js"],
    "soft": ["Communication", "Leadership"],
    "missing": ["TypeScript", "Docker"]
  },
  "experienceAnalysis": {
    "totalExperience": 5,
    "careerProgression": true,
    "achievementsHighlighted": true,
    "gaps": [],
    "recommendations": ["Add metrics to achievements"]
  },
  "educationAnalysis": {
    "degrees": ["Bachelor of Science"],
    "certifications": [],
    "strengths": ["Good education"],
    "improvements": ["Add certifications"]
  },
  "keywordAnalysis": {
    "atsScore": 75,
    "missingKeywords": ["Agile", "Scrum"],
    "recommendedKeywords": ["DevOps", "Cloud"]
  },
  "careerRecommendations": {
    "suitableRoles": ["Frontend Developer"],
    "industries": ["Tech"],
    "nextSteps": ["Learn new skills"],
    "salaryRange": "$80,000 - $120,000"
  },
  "aiInsights": {
    "strengths": ["Strong skills"],
    "weaknesses": ["Limited experience"],
    "opportunities": ["High demand"],
    "threats": ["Competition"]
  },
  "improvementSuggestions": ["Improve resume", "Add projects"]
}`;

    return prompt;
  }

  parseAnalysisResponse(analysis) {
    try {
      console.log('Parsing analysis response...');
      
      analysis.analyzedAt = new Date().toISOString();
      analysis.isMock = false;
      
      console.log('Successfully parsed analysis response');
      return analysis;
      
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return this.mockResumeAnalysis();
    }
  }

  parseInterviewQuestions(questions) {
    try {
      return questions;
    } catch (error) {
      console.error('Error parsing interview questions:', error);
      return this.mockInterviewQuestions();
    }
  }

  calculateResumeScore(parsedData) {
    let score = 0;
    
    // Skills (30 points)
    if (parsedData.skills && parsedData.skills.length >= 5) {
      score += 30;
    } else if (parsedData.skills && parsedData.skills.length >= 3) {
      score += 20;
    } else if (parsedData.skills && parsedData.skills.length >= 1) {
      score += 10;
    }
    
    // Experience (40 points)
    if (parsedData.experience && parsedData.experience.length >= 3) {
      score += 40;
    } else if (parsedData.experience && parsedData.experience.length >= 2) {
      score += 30;
    } else if (parsedData.experience && parsedData.experience.length >= 1) {
      score += 20;
    }
    
    // Education (20 points)
    if (parsedData.education && parsedData.education.length >= 2) {
      score += 20;
    } else if (parsedData.education && parsedData.education.length >= 1) {
      score += 15;
    }
    
    // Certifications (10 points)
    if (parsedData.certifications && parsedData.certifications.length >= 2) {
      score += 10;
    } else if (parsedData.certifications && parsedData.certifications.length >= 1) {
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  calculateProfileCompleteness(user) {
    try {
      let score = 0;
      const profile = user.profile || {};
      
      // Personal Info (30 points)
      if (user.fullName && user.fullName.trim().length > 0) score += 10;
      if (user.email && user.email.includes('@')) score += 5;
      if (user.mobile && user.mobile.trim().length >= 10) score += 5;
      if (profile.location && profile.location.trim().length > 0) score += 5;
      if (profile.bio && profile.bio.trim().length > 50) score += 5;
      
      // Skills (20 points)
      if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
        score += Math.min(20, profile.skills.length * 2);
      }
      
      // Experience (20 points)
      if (profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0) {
        score += Math.min(20, profile.experience.length * 5);
      }
      
      // Education (15 points)
      if (profile.education && Array.isArray(profile.education) && profile.education.length > 0) {
        score += Math.min(15, profile.education.length * 5);
      }
      
      // Projects (10 points)
      if (profile.projects && Array.isArray(profile.projects) && profile.projects.length > 0) {
        score += Math.min(10, profile.projects.length * 3);
      }
      
      // Resume (5 points)
      if (profile.resume && profile.resume.url) {
        score += 5;
      }
      
      return Math.min(100, score);
    } catch (error) {
      console.error('Error calculating profile completeness:', error);
      return 0;
    }
  }

  extractSkillsFromText(text) {
    const commonSkills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'HTML', 'CSS',
      'MongoDB', 'Express', 'TypeScript', 'Git', 'GitHub', 'AWS', 'Docker',
      'Kubernetes', 'SQL', 'NoSQL', 'REST', 'API', 'GraphQL', 'Redux',
      'Vue.js', 'Angular', 'Next.js', 'Firebase', 'Azure', 'Google Cloud'
    ];
    
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    
    commonSkills.forEach(skill => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    return foundSkills.length > 0 ? foundSkills : 
           ['JavaScript', 'React', 'HTML', 'CSS', 'Node.js'];
  }

  // ===== Fallback Methods =====
  fallbackResumeAnalysis(resumeContent) {
    console.log('Using fallback resume analysis');
    return {
      text: resumeContent,
      parsedData: {
        skills: this.extractSkillsBasic(resumeContent),
        experience: this.extractExperienceBasic(resumeContent),
        education: this.extractEducationBasic(resumeContent),
        certifications: [],
        summary: "Experienced professional with relevant skills."
      },
      score: 60,
      extractedAt: new Date(),
      isFallback: true
    };
  }

  mockResumeAnalysis(resumeText = '') {
    console.log('Using mock resume analysis');
    
    const extractedTechSkills = this.extractSkillsFromText(resumeText);
    
    return {
      summary: {
        overallScore: Math.floor(Math.random() * 30) + 65,
        grade: ['A-', 'B+', 'B', 'C+'][Math.floor(Math.random() * 4)],
        summaryText: "A well-structured resume showing good experience in web development. Could be improved with more quantifiable achievements and specific technical details."
      },
      extractedSkills: {
        technical: extractedTechSkills.length > 0 ? extractedTechSkills : 
                   ['JavaScript', 'React', 'HTML/CSS', 'Node.js', 'MongoDB'],
        soft: ['Communication', 'Teamwork', 'Problem Solving', 'Time Management'],
        missing: ['TypeScript', 'Docker', 'AWS', 'GraphQL']
      },
      experienceAnalysis: {
        totalExperience: Math.floor(Math.random() * 10) + 1,
        careerProgression: Math.random() > 0.3,
        achievementsHighlighted: Math.random() > 0.5,
        gaps: Math.random() > 0.7 ? ['1 month gap in 2022'] : [],
        recommendations: [
          "Add more metrics to quantify achievements",
          "Use action verbs to start bullet points",
          "Include specific project outcomes and impacts"
        ]
      },
      educationAnalysis: {
        degrees: ['Bachelor of Science in Computer Science'],
        certifications: Math.random() > 0.5 ? ['AWS Certified Cloud Practitioner'] : [],
        strengths: ['Strong educational foundation in computer science'],
        improvements: [
          "Consider adding relevant certifications",
          "Include GPA if above 3.5",
          "Add relevant coursework"
        ]
      },
      keywordAnalysis: {
        atsScore: Math.floor(Math.random() * 30) + 65,
        missingKeywords: ['Agile', 'Scrum', 'DevOps', 'CI/CD'],
        recommendedKeywords: ['React Hooks', 'REST APIs', 'Responsive Design', 'Version Control']
      },
      careerRecommendations: {
        suitableRoles: ['Frontend Developer', 'Full Stack Developer', 'Web Developer'],
        industries: ['Technology', 'E-commerce', 'Finance', 'Healthcare'],
        nextSteps: [
          "Learn TypeScript for better type safety",
          "Build a full-stack project with authentication",
          "Contribute to open source projects",
          "Get certified in a cloud platform"
        ],
        salaryRange: `₹${(Math.floor(Math.random() * 10) + 6)} - ₹${(Math.floor(Math.random() * 10) + 15)} LPA`
      },
      aiInsights: {
        strengths: [
          "Strong foundation in modern web technologies",
          "Good mix of frontend and backend skills",
          "Project-based learning approach"
        ],
        weaknesses: [
          "Limited experience with testing frameworks",
          "No mention of version control best practices",
          "Could benefit from more specialized skills"
        ],
        opportunities: [
          "High demand for React developers",
          "Growing remote work opportunities",
          "Potential for career growth into senior roles"
        ],
        threats: [
          "Increasing competition in the job market",
          "Rapid technology changes requiring constant learning",
          "Need for specialized skills in competitive markets"
        ]
      },
      improvementSuggestions: [
        "Add a professional summary at the top",
        "Quantify achievements with numbers and percentages",
        "Include links to GitHub repositories and live projects",
        "Tailor resume for specific job applications",
        "Add a skills matrix with proficiency levels"
      ],
      analyzedAt: new Date().toISOString(),
      isMock: true
    };
  }

  fallbackJobDescription(data) {
    const { title, skills, experience, companyName } = data;
    
    return `
      ${title}
      
      We are looking for a talented ${title} to join our team at ${companyName}.
      
      Responsibilities:
      - Develop and maintain high-quality software solutions
      - Collaborate with cross-functional teams
      - Participate in code reviews and technical discussions
      - Stay updated with emerging technologies
      
      Requirements:
      - ${experience}+ years of professional experience
      - Proficiency in ${skills.slice(0, 3).join(', ')}
      - Strong problem-solving skills
      - Excellent communication abilities
      
      Benefits:
      - Competitive salary and benefits package
      - Flexible work arrangements
      - Professional development opportunities
      - Collaborative work environment
      
      About ${companyName}:
      Join us and be part of an innovative team that values creativity and technical excellence!
    `;
  }

  fallbackInterviewQuestions(candidateSkills, jobRequirements) {
    return `
      Technical Questions:
      1. Explain your experience with ${candidateSkills[0] || 'relevant technologies'}.
      2. How do you approach debugging complex issues?
      
      Behavioral Questions:
      1. Tell me about a challenging project you worked on.
      2. How do you handle conflicting priorities?
      
      Scenario Questions:
      1. How would you design a scalable system for high traffic?
      2. Describe your process for code review.
      
      Cultural Fit:
      1. What motivates you to do your best work?
      2. How do you contribute to team success?
    `;
  }

  mockInterviewQuestions() {
    return {
      technical: [
        "Explain the difference between let, const, and var in JavaScript",
        "What are React hooks and how do they work?",
        "How would you optimize a slow React application?",
        "Explain REST API principles and best practices"
      ],
      behavioral: [
        "Tell me about a challenging project you worked on",
        "How do you handle conflicts in a team?",
        "Describe a time you had to learn a new technology quickly"
      ],
      scenarioBased: [
        "How would you design a real-time chat application?",
        "What would you do if a production bug is reported?"
      ],
      companySpecific: [
        "Why do you want to work at our company?"
      ]
    };
  }

  fallbackCandidateInsights(candidateData) {
    const { skills = [] } = candidateData;
    
    return `
      Candidate Analysis:
      
      Strengths:
      - Strong technical background in ${skills.slice(0, 2).join(', ')}
      - Good communication skills
      - Team player with collaborative mindset
      
      Areas for Development:
      - Could benefit from more leadership experience
      - Expand knowledge in emerging technologies
      
      Recommended Roles:
      - Senior Developer
      - Technical Lead
      - Solution Architect
      
      Missing Skills:
      - Advanced cloud architecture
      - Team management experience
      
      Cultural Fit:
      - Appears to be a good fit for collaborative environments
      - Shows potential for leadership roles
    `;
  }

  mockAIReport(analysisData, userProfile) {
    return `
# AI CAREER ANALYSIS REPORT
## Generated on: ${new Date().toLocaleDateString()}

## EXECUTIVE SUMMARY
Based on analysis of your resume, you have ${analysisData.experienceAnalysis?.totalExperience || 3} years of experience with ${analysisData.extractedSkills?.technical?.length || 5} technical skills. Your profile shows potential for growth in the technology sector.

## SKILLS ASSESSMENT
**Technical Skills Identified**: ${(analysisData.extractedSkills?.technical || []).slice(0, 10).join(', ')}
**Soft Skills**: ${(analysisData.extractedSkills?.soft || []).join(', ')}
**Missing Skills to Consider**: ${(analysisData.extractedSkills?.missing || []).join(', ')}

## EXPERIENCE EVALUATION
**Total Experience**: ${analysisData.experienceAnalysis?.totalExperience || 3} years
**Career Progression**: ${analysisData.experienceAnalysis?.careerProgression ? 'Good progression observed' : 'Could show clearer progression'}
**Key Recommendations**: ${(analysisData.experienceAnalysis?.recommendations || []).join('; ')}

## CAREER FIT ANALYSIS
**Recommended Roles**: ${(analysisData.careerRecommendations?.suitableRoles || []).join(', ')}
**Suitable Industries**: ${(analysisData.careerRecommendations?.industries || []).join(', ')}
**Expected Salary Range**: ${analysisData.careerRecommendations?.salaryRange || '₹6-15 LPA'}

## SKILL GAPS IDENTIFIED
${(analysisData.extractedSkills?.missing || []).map(skill => `- ${skill}`).join('\n')}

## LEARNING RECOMMENDATIONS
1. **Immediate (30 days)**: Complete one online course in your primary skill area
2. **Short-term (60 days)**: Build a portfolio project showcasing your expertise
3. **Long-term (90 days)**: Obtain a relevant certification

## MARKET TRENDS & OPPORTUNITIES
- High demand for ${analysisData.extractedSkills?.technical?.[0] || 'web development'} skills
- Growing remote work opportunities
- Increasing need for cloud and DevOps skills

## 30/60/90 DAY ACTION PLAN
**First 30 Days**:
- Update LinkedIn profile with new skills
- Complete one relevant online course
- Network with 10+ professionals in your target industry

**Days 31-60**:
- Build and deploy a portfolio project
- Attend 2-3 industry webinars or meetups
- Update resume with quantifiable achievements

**Days 61-90**:
- Apply to 15+ targeted job positions
- Prepare for technical interviews
- Consider obtaining a certification

---
*This report was generated using AI analysis. For personalized career coaching, consider consulting with a professional career advisor.*
`;
  }

  extractSkillsBasic(text) {
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 
      'Docker', 'Kubernetes', 'SQL', 'MongoDB', 'TypeScript', 'HTML', 
      'CSS', 'Git', 'REST API', 'GraphQL', 'Machine Learning', 'AI'
    ];
    
    return commonSkills.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
  }

  extractExperienceBasic(text) {
    return [{
      company: 'Previous Company',
      title: 'Developer',
      duration: '2 years',
      description: 'Software development role'
    }];
  }

  extractEducationBasic(text) {
    return [{
      institution: 'University',
      degree: 'Bachelor\'s Degree',
      year: '2020'
    }];
  }
}

export default new AIService();