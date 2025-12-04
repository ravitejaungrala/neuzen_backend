// backend/services/aiService.js - UPDATED WITH CORRECT MODELS
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Optional Dependencies for Local Fallback ---
let pdfParse, mammoth;
try {
  pdfParse = (await import('pdf-parse')).default;
} catch (error) {
  console.warn('pdf-parse not installed for local fallback');
  pdfParse = null;
}

try {
  mammoth = (await import('mammoth')).default;
} catch (error) {
  console.warn('mammoth not installed for local fallback');
  mammoth = null;
}
// -------------------------------------------------

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to convert a local file to a GenerativePart object
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || 'mock-key-for-development';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.modelName = "gemini-1.5-flash-latest"; // UPDATED: Correct model name
  }

  // --- JSON Schema for Basic Resume Parsing ---
  get resumeSchema() {
    return {
      type: "object",
      properties: {
        personalInfo: {
            type: "object",
            properties: {
                fullName: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                location: { type: "string" }
            },
        },
        skills: {
          type: "array",
          description: "List of technical and soft skills.",
          items: { type: "string" },
        },
        experience: {
          type: "array",
          description: "List of work experience entries.",
          items: {
            type: "object",
            properties: {
              company: { type: "string" },
              title: { type: "string" },
              duration: { type: "string", description: "e.g., 'Jan 2020 - Present' or '3 years'" },
              description: { type: "string", description: "Summary of responsibilities and achievements." },
            },
            required: ["company", "title"],
          },
        },
        education: {
          type: "array",
          description: "List of educational entries.",
          items: {
            type: "object",
            properties: {
              institution: { type: "string" },
              degree: { type: "string" },
              year: { type: "string", description: "e.g., '2020'" },
            },
            required: ["institution", "degree"],
          },
        },
        certifications: {
          type: "array",
          description: "List of professional certifications.",
          items: { type: "string" },
        },
        summary: {
          type: "string",
          description: "Brief professional summary of the candidate.",
        },
      },
      required: ["skills", "experience", "education"],
    };
  }

  // --- Define a JSON Schema for Detailed Analysis ---
  getAnalysisSchema() {
    return {
      type: "object",
      properties: {
        summary: {
          type: "object",
          properties: {
            overallScore: { type: "integer", description: "Score out of 100." },
            grade: { type: "string" },
            summaryText: { type: "string" }
          },
        },
        extractedSkills: {
          type: "object",
          properties: {
            technical: { type: "array", items: { type: "string" } },
            soft: { type: "array", items: { type: "string" } },
            missing: { type: "array", items: { type: "string" } }
          },
        },
        experienceAnalysis: {
            type: "object",
            properties: {
                totalExperience: { type: "integer" },
                careerProgression: { type: "boolean" },
                achievementsHighlighted: { type: "boolean" },
                gaps: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
            }
        },
        keywordAnalysis: {
          type: "object",
          properties: {
            atsScore: { type: "integer", description: "ATS (Applicant Tracking System) compatibility score out of 100." },
            missingKeywords: { type: "array", items: { type: "string" } },
            recommendedKeywords: { type: "array", items: { type: "string" } }
          }
        },
        careerRecommendations: {
            type: "object",
            properties: {
                suitableRoles: { type: "array", items: { type: "string" } },
                industries: { type: "array", items: { type: "string" } },
                nextSteps: { type: "array", items: { type: "string" } },
                salaryRange: { type: "string" }
            }
        },
        aiInsights: {
            type: "object",
            properties: {
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } },
                threats: { type: "array", items: { type: "string" } }
            }
        },
        improvementSuggestions: { type: "array", items: { type: "string" } }
      },
      required: ["summary", "extractedSkills", "experienceAnalysis", "keywordAnalysis"],
    };
  }

  // --- Define a JSON Schema for Interview Questions ---
  get interviewSchema() {
    return {
      type: "object",
      properties: {
        technical: { type: "array", items: { type: "string" }, description: "Questions assessing core technical skills." },
        behavioral: { type: "array", items: { type: "string" }, description: "STAR method style questions about past experience." },
        scenarioBased: { type: "array", items: { type: "string" }, description: "Hypothetical problem-solving questions." },
        culturalFit: { type: "array", items: { type: "string" }, description: "Questions assessing alignment with company values and team dynamics." }
      },
      required: ["technical", "behavioral", "scenarioBased", "culturalFit"]
    };
  }

  // Helper method to call Gemini AI with updated config
  async callGeminiAI(
    prompt, 
    systemInstruction = null, 
    responseSchema = null, 
    fileParts = [],
    config = {}
  ) {
    if (this.apiKey === 'mock-key-for-development') {
      throw new Error('Gemini API key not configured. Cannot make AI calls.');
    }

    try {
      const modelConfig = {
        model: this.modelName, // UPDATED: Using correct model name
        generationConfig: {
          temperature: config.temperature || 0.5,
          topK: config.topK || 40,
          responseMimeType: responseSchema ? "application/json" : "text/plain",
        },
      };

      if (systemInstruction) {
        modelConfig.systemInstruction = systemInstruction;
      }

      const model = this.genAI.getGenerativeModel(modelConfig);

      // Combine file parts and prompt for the content
      const content = [...fileParts, { text: prompt }];

      const result = await model.generateContent({ contents: content });
      const response = await result.response;
      
      const text = response.text().trim();

      if (responseSchema && modelConfig.generationConfig.responseMimeType === "application/json") {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse JSON response from model:', text, parseError);
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
          throw new Error("Invalid or unparseable JSON response from AI.");
        }
      }
      
      return text;
    } catch (error) {
      console.error('Gemini AI API error:', error);
      throw error;
    }
  }

  // ===== File Processing Methods =====
  async extractTextFromFile(filePath, mimeType) {
    const extension = path.extname(filePath).toLowerCase();

    // 1. Try to use pdf-parse for PDF files if available
    if ((mimeType.includes('pdf') || extension === '.pdf') && pdfParse) {
      try {
        const buffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
      } catch (pdfError) {
        console.warn('pdf-parse failed, trying fallback:', pdfError.message);
      }
    }

    // 2. Try mammoth for DOCX files if available
    if ((mimeType.includes('docx') || extension === '.docx') && mammoth) {
      try {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      } catch (docxError) {
        console.warn('mammoth failed, trying fallback:', docxError.message);
      }
    }

    // 3. For TXT files and fallback
    try {
      if (!fs.existsSync(filePath)) {
        return 'File not found';
      }
      
      const buffer = fs.readFileSync(filePath);
      
      // Handle different file types
      if (extension === '.txt' || mimeType.includes('text/plain')) {
        return buffer.toString('utf-8');
      }
      
      // Fallback for other file types
      return this.extractTextFallback(buffer, extension);
      
    } catch (error) {
      console.error('File extraction error:', error);
      return `Error extracting text: ${error.message}`;
    }
  }

  extractTextFallback(buffer, fileType) {
    try {
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
  
  async analyzeResume(resumeContent) {
    if (this.apiKey === 'mock-key-for-development') {
      return this.fallbackResumeAnalysis(resumeContent);
    }
    
    try {
      const prompt = `Analyze the following resume content and extract structured information. Focus on accuracy and completeness of the data fields.
      
      RESUME TEXT:
      ${resumeContent}`;

      const systemInstruction = "You are a highly accurate resume parsing AI. Extract all requested data into the specified JSON format.";
      
      const parsedData = await this.callGeminiAI(
        prompt, 
        systemInstruction, 
        this.resumeSchema
      );
      
      return {
        text: resumeContent,
        parsedData: parsedData,
        score: this.calculateResumeScore(parsedData),
        extractedAt: new Date(),
        version: 'v2-structured-basic'
      };
    } catch (error) {
      console.error('AI resume analysis error:', error);
      return this.fallbackResumeAnalysis(resumeContent);
    }
  }

  async analyzeResumeWithGemini(resumeText, candidateProfile = null) {
    if (this.apiKey === 'mock-key-for-development') {
      console.warn('Gemini API key not configured, using mock analysis');
      return this.mockResumeAnalysis(resumeText);
    }

    try {
        const prompt = this.createAnalysisPrompt(resumeText, candidateProfile);
        
        const systemInstruction = "You are an expert resume analyzer and career advisor. Analyze resumes thoroughly, provide detailed, actionable, and objective insights. Always return valid JSON conforming to the specified schema.";
        
        const response = await this.callGeminiAI(
            prompt, 
            systemInstruction, 
            this.getAnalysisSchema(), 
            [],
            { temperature: 0.7 }
        );
        
        return this.parseAnalysisResponse(response);
        
    } catch (error) {
        console.error('Gemini AI analysis error:', error.message);
        return this.mockResumeAnalysis(resumeText);
    }
  }

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
    if (this.apiKey === 'mock-key-for-development') {
      return this.fallbackJobDescription(data);
    }

    try {
      const { title, skills, experience, companyName, tone = 'professional' } = data;
      
      const prompt = `
        You are tasked with generating a high-quality, ATS-optimized job description.

        Generate a compelling job description for a **${title}** position at **${companyName}**.
        
        ### Requirements & Context:
        - **Required Skills**: ${skills.join(', ')} (Must be explicitly mentioned)
        - **Minimum Experience**: ${experience} years (State clearly in the requirements section)
        - **Desired Tone**: ${tone} (Adjust language accordingly)
        
        ### Structure & Sections:
        1. **Job Title & Overview**: An engaging 2-3 sentence summary.
        2. **Key Responsibilities**: 5-7 detailed, action-oriented bullet points.
        3. **Required Qualifications**: Clear, non-negotiable must-haves.
        4. **Preferred Qualifications (Bonus)**: Nice-to-haves.
        5. **Benefits & Perks**: 4-5 attractive points.
        6. **About ${companyName}**: A short, engaging paragraph about the company culture.
        
        Ensure the output is pure Markdown text, formatted beautifully for a job board.
      `;

      const systemInstruction = "You are an expert HR professional and copywriter who crafts highly engaging, ATS-compliant job descriptions. Your response must be in clean, professional Markdown format.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, null, [], { temperature: 0.7 });
      
      return response;
    } catch (error) {
      console.error('AI job description generation error:', error);
      return this.fallbackJobDescription(data);
    }
  }

  // ===== Interview Questions Generation =====
  async generateInterviewQuestions(candidateSkills, jobRequirements) {
    // Legacy text-based method for fallback
    return this.fallbackInterviewQuestions(candidateSkills, jobRequirements);
  }

  async generateInterviewQuestionsJSON(jobDescription, candidateSkills) {
    if (this.apiKey === 'mock-key-for-development') {
      return this.mockInterviewQuestions();
    }

    try {
      const prompt = `Generate 4-6 challenging, high-leverage interview questions for each category based on the following candidate profile and job description.
      
      **Candidate's Key Skills**: ${candidateSkills.join(', ')}
      **Job Description Snippet**: ${jobDescription.substring(0, 2000)}`;

      const systemInstruction = "You are an experienced hiring manager creating a rigorous set of interview questions. Always respond with valid JSON conforming to the specified schema, ensuring questions are open-ended and highly relevant.";
      
      const response = await this.callGeminiAI(
        prompt, 
        systemInstruction, 
        this.interviewSchema,
        [], 
        { temperature: 0.6 }
      );
      
      return response; 
      
    } catch (error) {
      console.error('Error generating interview questions:', error);
      return this.mockInterviewQuestions();
    }
  }

  async generateInterviewQuestionsComprehensive(candidateSkills, jobRequirements, options = {}) {
    const { useJSON = true, jobDescription = '' } = options;
    
    if (useJSON && jobDescription) {
      return this.generateInterviewQuestionsJSON(jobDescription, candidateSkills);
    } else {
      return this.generateInterviewQuestions(candidateSkills, jobRequirements);
    }
  }

  // ===== Candidate Insights =====
  async generateCandidateInsights(candidateData) {
    if (this.apiKey === 'mock-key-for-development') {
      return this.fallbackCandidateInsights(candidateData);
    }

    try {
      const { skills, experience, education, projects } = candidateData;
      
      const prompt = `
        Analyze this candidate profile and provide a detailed, professional, and actionable report.
        
        Skills: ${skills.join(', ')}
        Experience: ${JSON.stringify(experience)}
        Education: ${JSON.stringify(education)}
        Projects: ${JSON.stringify(projects || [])}
        
        Provide the report with clear markdown headings for:
        1. Strengths and unique capabilities
        2. Areas for development/skill gaps
        3. Recommended roles/career path
        4. Cultural fit assessment
        5. 3 Actionable next steps
      `;

      const systemInstruction = "You are an expert career counselor and talent analyst. Respond with a well-formatted Markdown report.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, null, [], { temperature: 0.7 });
      
      return response;
    } catch (error) {
      console.error('AI candidate insights generation error:', error);
      return this.fallbackCandidateInsights(candidateData);
    }
  }

  // ===== AI Report Generation =====
  async generateAIReport(analysisData, userProfile) {
    if (this.apiKey === 'mock-key-for-development') {
      return this.mockAIReport(analysisData, userProfile);
    }

    try {
      const prompt = `Generate a comprehensive, client-facing career analysis report based on this detailed resume analysis. Use professional and encouraging language.

RESUME ANALYSIS DATA:
${JSON.stringify(analysisData, null, 2)}

USER PROFILE:
Name: ${userProfile.fullName || 'Candidate'}
Email: ${userProfile.email || 'Not provided'}
Skills: ${JSON.stringify(userProfile.skills || [])}

Please provide a detailed, well-structured report using clear **Markdown headings and bullet points**. Include the following sections:
1. EXECUTIVE SUMMARY (Overall Grade and Score)
2. SKILLS ASSESSMENT (Technical, Soft, and Gaps)
3. EXPERIENCE EVALUATION (Progression, Metrics, and Recommendations)
4. ATS & KEYWORD FIT ANALYSIS
5. CAREER PATH & SALARY RECOMMENDATIONS
6. 30/60/90 DAY ACTION PLAN (Specific, actionable steps)

The response must be in pure, well-formatted Markdown.`;

      const systemInstruction = "You are a professional career coach and resume expert. Generate detailed, actionable career analysis reports.";
      
      const response = await this.callGeminiAI(prompt, systemInstruction, null, [], { temperature: 0.8 });
      
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
    }
    
    prompt += `\nEnsure the JSON strictly adheres to the provided schema.`;

    return prompt;
  }

  parseAnalysisResponse(analysis) {
    analysis.analyzedAt = new Date().toISOString();
    analysis.isMock = false;
    return analysis;
  }

  calculateResumeScore(parsedData) {
    let score = 0;
    
    if (parsedData.skills && parsedData.skills.length >= 5) score += 30;
    else if (parsedData.skills && parsedData.skills.length >= 1) score += 10;
    
    if (parsedData.experience && parsedData.experience.length >= 3) score += 40;
    else if (parsedData.experience && parsedData.experience.length >= 1) score += 20;
    
    if (parsedData.education && parsedData.education.length >= 1) score += 20;
    
    if (parsedData.certifications && parsedData.certifications.length >= 1) score += 10;
    
    return Math.min(score, 100);
  }

  extractSkillsFromText(text) {
    const commonSkills = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'HTML', 'CSS',
      'MongoDB', 'Express', 'TypeScript', 'Git', 'AWS', 'Docker',
      'Kubernetes', 'SQL', 'REST', 'API', 'GraphQL', 'Redux'
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

  // ===== Fallback/Mock Methods =====
  fallbackResumeAnalysis(resumeContent) {
    return {
      text: resumeContent,
      parsedData: {
        skills: this.extractSkillsFromText(resumeContent),
        experience: [{ company: 'Previous Company', title: 'Developer', duration: '2 years', description: 'Software development role' }],
        education: [{ institution: 'University', degree: 'Bachelor\'s Degree', year: '2020' }],
        certifications: [],
        summary: "Experienced professional with relevant skills."
      },
      score: 60,
      extractedAt: new Date(),
      isFallback: true
    };
  }

  mockResumeAnalysis(resumeText = '') {
    const extractedTechSkills = this.extractSkillsFromText(resumeText);
    
    return {
      summary: {
        overallScore: Math.floor(Math.random() * 30) + 65,
        grade: ['A-', 'B+', 'B', 'C+'][Math.floor(Math.random() * 4)],
        summaryText: "A well-structured resume showing good experience in web development. Could be improved with more quantifiable achievements and specific technical details."
      },
      extractedSkills: {
        technical: extractedTechSkills.length > 0 ? extractedTechSkills : ['JavaScript', 'React', 'HTML/CSS', 'Node.js', 'MongoDB'],
        soft: ['Communication', 'Teamwork', 'Problem Solving'],
        missing: ['TypeScript', 'Docker', 'AWS', 'GraphQL']
      },
      experienceAnalysis: {
        totalExperience: Math.floor(Math.random() * 10) + 1,
        careerProgression: Math.random() > 0.3,
        achievementsHighlighted: Math.random() > 0.5,
        gaps: Math.random() > 0.7 ? ['1 month gap in 2022'] : [],
        recommendations: ["Add metrics to quantify achievements", "Use action verbs to start bullet points"]
      },
      educationAnalysis: {
        degrees: ['Bachelor of Science in Computer Science'],
        certifications: Math.random() > 0.5 ? ['AWS Certified Cloud Practitioner'] : [],
        strengths: ['Strong educational foundation'],
        improvements: ["Consider adding relevant certifications"]
      },
      keywordAnalysis: {
        atsScore: Math.floor(Math.random() * 30) + 65,
        missingKeywords: ['Agile', 'Scrum', 'DevOps'],
        recommendedKeywords: ['React Hooks', 'REST APIs', 'Responsive Design']
      },
      careerRecommendations: {
        suitableRoles: ['Frontend Developer', 'Full Stack Developer'],
        industries: ['Technology', 'E-commerce'],
        nextSteps: ["Learn TypeScript", "Build a full-stack project"],
        salaryRange: `₹${(Math.floor(Math.random() * 10) + 6)} - ₹${(Math.floor(Math.random() * 10) + 15)} LPA`
      },
      aiInsights: {
        strengths: ["Strong foundation in modern web technologies"],
        weaknesses: ["Limited experience with testing frameworks"],
        opportunities: ["High demand for React developers"],
        threats: ["Increasing competition in the job market"]
      },
      improvementSuggestions: ["Add a professional summary", "Quantify achievements with numbers"],
      analyzedAt: new Date().toISOString(),
      isMock: true
    };
  }

  fallbackJobDescription(data) {
    const { title, skills, experience, companyName } = data;
    return `
      # ${title} at ${companyName}
      
      ## Job Overview
      We are looking for a talented ${title} with ${experience}+ years of experience to join our innovative team at ${companyName}.
      
      ## Requirements
      - Proficiency in ${skills.slice(0, 3).join(', ')}
      - ${experience}+ years of relevant experience.
    `;
  }

  fallbackInterviewQuestions(candidateSkills, jobRequirements) {
    return `
      Technical Questions:
      1. Explain your experience with ${candidateSkills[0] || 'relevant technologies'}.
      Behavioral Questions:
      1. Tell me about a challenging project you worked on.
    `;
  }

  mockInterviewQuestions() {
    return {
      technical: [
        "Explain the difference between let, const, and var in JavaScript",
        "What are React hooks and how do they work?"
      ],
      behavioral: [
        "Tell me about a challenging project you worked on",
        "How do you handle conflicts in a team?"
      ],
      scenarioBased: [
        "How would you design a real-time chat application?",
        "What would you do if a production bug is reported?"
      ],
      culturalFit: [
        "Why do you want to work at our company?"
      ]
    };
  }

  fallbackCandidateInsights(candidateData) {
    const { skills = [] } = candidateData;
    
    return `
      # Candidate Analysis - Fallback
      
      ## Strengths:
      - Strong technical background in ${skills.slice(0, 2).join(', ')}
      
      ## Areas for Development:
      - Could benefit from more leadership experience
      
      ## Recommended Roles:
      - Senior Developer
    `;
  }

  mockAIReport(analysisData, userProfile) {
    return `
# AI CAREER ANALYSIS REPORT (MOCK)
## Generated on: ${new Date().toLocaleDateString()}

## EXECUTIVE SUMMARY
Based on mock analysis, your profile suggests you are a **${analysisData.summary?.grade || 'B+'}** candidate with an overall score of **${analysisData.summary?.overallScore || 75}**.

## SKILLS ASSESSMENT
**Technical Skills**: ${(analysisData.extractedSkills?.technical || []).slice(0, 5).join(', ')}
**Skill Gaps**: ${(analysisData.extractedSkills?.missing || []).join(', ')}

## 30/60/90 DAY ACTION PLAN
**First 30 Days**: Complete one relevant online course.
**Days 31-60**: Build and deploy a portfolio project.
**Days 61-90**: Apply to 15+ targeted job positions.

---
*This is a mock report used due to missing API key.*
`;
  }
}

export default new AIService();
