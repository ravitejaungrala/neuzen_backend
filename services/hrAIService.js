// backend/services/hrAIService.js - UPDATED WITH CORRECT MODEL
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * HRAIService uses the Gemini API to perform advanced HR tasks
 */
class HRAIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key-for-development');
    this.modelName = "gemini-1.5-flash-latest"; // UPDATED: Correct model name
  }

  // --- JSON Schema Definitions ---
  get analysisResponseSchema() {
    return {
      type: "object",
      properties: {
        overallScore: { type: "number", description: "A calculated score out of 100 representing overall suitability and fit for a typical role in the specified domain. Must be an integer." },
        summary: { type: "string", description: "A concise, professional summary (3-4 sentences) of the candidate's core profile and potential impact." },
        strengths: { type: "array", items: { type: "string" }, description: "Specific, quantifiable achievements and technical expertise." },
        weaknesses: { type: "array", items: { type: "string" }, description: "Identifiable gaps (e.g., employment, outdated skills, lack of diversity in project scope, lack of leadership experience)." },
        skillsGapAnalysis: {
          type: "object",
          properties: {
            strongSkills: { type: "array", items: { type: "string" }, description: "Key technical skills demonstrated by the candidate." },
            missingSkills: { type: "array", items: { type: "string" }, description: "Essential skills for a modern role in the field that are noticeably absent." },
            developmentAreas: { type: "array", items: { type: "string" }, description: "Specific areas for immediate professional development and training." }
          },
          required: ["strongSkills", "missingSkills", "developmentAreas"]
        },
        culturalFit: {
          type: "object",
          properties: {
            score: { type: "number", description: "A score out of 100 for alignment with a flexible, high-growth, or collaborative culture." },
            traits: { type: "array", items: { type: "string" }, description: "Inferred behavioral traits based on career trajectory (e.g., adaptable, risk-taker, detail-oriented)." },
            recommendedEnvironments: { type: "array", items: { type: "string" }, description: "Types of companies where the candidate would thrive (e.g., 'Large Enterprise', 'Early-stage Startup')." }
          },
          required: ["score", "traits", "recommendedEnvironments"]
        },
        careerProgression: {
          type: "object",
          properties: {
            potentialRoles: { type: "array", items: { type: "string" }, description: "Next 2-3 most logical career roles." },
            timeline: { type: "string", description: "Suggested timeline for achieving the next role (e.g., '12-18 months')." },
            developmentPath: { type: "string", description: "A short suggested development plan focusing on a specific career trajectory (e.g., 'Transition from IC to Managerial Track')." }
          },
          required: ["potentialRoles", "timeline", "developmentPath"]
        },
        interviewRecommendations: {
          type: "object",
          properties: {
            technicalQuestions: { type: "array", items: { type: "string" }, description: "High-value, complex technical questions to probe depth of knowledge." },
            behavioralQuestions: { type: "array", items: { type: "string" }, description: "Behavioral questions tailored to identified weaknesses or leadership potential." },
            redFlagsToWatch: { type: "array", items: { type: "string" }, description: "Specific items to scrutinize (e.g., job hopping, unexplained gaps, vague project contributions)." }
          },
          required: ["technicalQuestions", "behavioralQuestions", "redFlagsToWatch"]
        },
        compensationAnalysis: {
          type: "object",
          properties: {
            marketRate: { type: "string", description: "Estimated market rate range for this experience level and domain (e.g., '$100k - $140k')." },
            valueProposition: { type: "string", description: "The candidate's core value-add (e.g., 'Deep expertise in legacy system modernization')." },
            negotiationTips: { type: "array", items: { type: "string" }, description: "Actionable tips for the negotiation phase." }
          },
          required: ["marketRate", "valueProposition", "negotiationTips"]
        }
      },
      required: ["overallScore", "summary", "strengths", "weaknesses", "skillsGapAnalysis", "culturalFit", "careerProgression", "interviewRecommendations", "compensationAnalysis"]
    };
  }

  /**
   * Helper method to call Gemini AI
   */
  async callGeminiAI(prompt, systemInstruction = null, responseFormat = 'json') {
    try {
      if (this.genAI.apiKey === 'mock-key-for-development') {
        throw new Error('Mock key - using fallback');
      }

      const generationConfig = {
        temperature: 0.7,
        responseMimeType: responseFormat === 'json' ? "application/json" : "text/plain",
      };

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemInstruction,
        generationConfig: generationConfig,
      });

      const result = await model.generateContent(prompt);
      const response = result.response;

      if (responseFormat === 'json') {
        const text = response.text().trim();
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', text);
          // Try to extract JSON from response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          throw new Error("Invalid JSON response from AI");
        }
      }

      return response.text();
    } catch (error) {
      console.error('Gemini AI API error:', error.message);
      throw error;
    }
  }

  // --- Core Service Methods ---
  async analyzeResumeForHR(resumeText, candidateProfile = {}) {
    try {
      const prompt = this.createHRAnalysisPrompt(resumeText, candidateProfile);
      const systemInstruction = "You are an expert HR analyst and data scientist. Your job is to critically analyze candidate resumes. Provide an objective, data-driven assessment focusing on risk mitigation, growth potential, and actionable hiring insights. You MUST respond with valid JSON that strictly adheres to the provided schema.";

      const response = await this.callGeminiAI(
        prompt,
        systemInstruction,
        'json'
      );

      return {
        ...response,
        analyzedAt: new Date().toISOString(),
        aiModel: this.modelName
      };

    } catch (error) {
      console.error('HR AI Service error, returning mock data:', error.message);
      return this.generateMockAnalysis(resumeText, candidateProfile);
    }
  }

  async analyzeMatch(resumeText, jobDescription) {
    try {
      const prompt = this.createMatchAnalysisPrompt(resumeText, jobDescription);
      const systemInstruction = "You are a specialized AI designed for candidate screening. Your only task is to calculate a precise match score and detailed gap analysis between a resume and a job description. Be strict and objective. You MUST respond with valid JSON.";

      const response = await this.callGeminiAI(
        prompt,
        systemInstruction,
        'json'
      );

      return {
        ...response,
        analyzedAt: new Date().toISOString(),
        aiModel: this.modelName
      };
    } catch (error) {
      console.error('Match analysis error, returning mock data:', error.message);
      return this.generateMockMatchAnalysis();
    }
  }

  async generateJobDescription(jobData) {
    try {
      const { title, requiredSkills, experience, companyName } = jobData;

      const prompt = `Generate a compelling, modern, and SEO-optimized job description for a ${title} position at ${companyName}.
      
Requirements:
- Required Skills: ${requiredSkills.join(', ')}
- Experience: ${experience} years
- Company: ${companyName}

Structure MUST include the following sections:
1. **The Opportunity** (Job Title and inspiring summary)
2. **What You'll Do** (Responsibilities)
3. **What You'll Bring** (Requirements - separate 'Must Haves' and 'Bonus Points')
4. **Life at ${companyName}** (Culture and Benefits)
5. **About the Company** (Mission-focused closing)`;

      const systemInstruction = "You are an expert HR professional and talent acquisition specialist. You craft job descriptions that are highly compelling to attract top-tier candidates and are optimized for search visibility.";

      const response = await this.callGeminiAI(prompt, systemInstruction, 'text');

      return response;

    } catch (error) {
      console.error('Job description generation error, returning mock data:', error.message);
      return this.generateMockJobDescription(jobData);
    }
  }

  // --- Prompt Creation and Mock Data ---
  createHRAnalysisPrompt(resumeText, candidateProfile) {
    return `Perform a comprehensive and critical HR assessment on the candidate below.

**Assessment Directives:**
1.  **Objectivity:** Base all scores and analyses strictly on the provided resume content.
2.  **Criticality:** Identify both obvious and subtle risks.
3.  **Actionability:** Ensure all interview questions and negotiation tips are highly relevant and actionable.
4.  **Market Comparison:** Assume the resume is being evaluated against top-tier global talent.

RESUME CONTENT:
${resumeText.substring(0, 4000)}

CANDIDATE PROFILE (For context):
- Name: ${candidateProfile.fullName || 'Candidate'}
- Current Role/Target: ${candidateProfile.currentRole || 'Target Role Not Specified'}
- Years of Experience: ${candidateProfile.experience || 'Not specified'}

Generate the comprehensive analysis strictly following the provided JSON schema.`;
  }

  createMatchAnalysisPrompt(resumeText, jobDescription) {
    return `Calculate the direct match percentage (Match Score) and conduct a detailed gap analysis between the RESUME and the JOB DESCRIPTION below.

**Goal:** Provide an unbiased, strict assessment of how well the candidate's history fulfills the explicit requirements of the role.

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

RESUME CONTENT:
${resumeText.substring(0, 4000)}

Generate the analysis strictly following the provided JSON schema.`;
  }

  generateMockAnalysis(resumeText, candidateProfile) {
    return {
      overallScore: Math.floor(Math.random() * 30) + 65,
      summary: "Strong technical candidate with good experience in web development. Demonstrates a capacity for leadership and growth in specialized domains, but requires validation on system design expertise.",
      strengths: [
        "Solid foundation in modern web technologies, specifically React/Node.js.",
        "Demonstrated ability to drive projects from concept to deployment.",
        "Team player with clear collaborative mindset and cross-functional experience."
      ],
      weaknesses: [
        "Limited exposure to large-scale distributed systems or cloud architecture (AWS/Azure).",
        "Could benefit from more recent contributions to open-source or specific side projects to showcase passion.",
        "Job tenures appear slightly short (average 2 years), requiring interview clarification."
      ],
      skillsGapAnalysis: {
        strongSkills: ["JavaScript", "React", "Node.js", "HTML/CSS", "Git", "Agile"],
        missingSkills: ["TypeScript", "Docker", "AWS/Cloud", "GraphQL", "Microservices Architecture"],
        developmentAreas: ["Advanced React patterns (e.g., state management optimization)", "System design interviews", "DevOps and CI/CD pipelines"]
      },
      culturalFit: {
        score: 78,
        traits: ["Adaptable", "Detail-oriented", "Proactive communicator"],
        recommendedEnvironments: ["Scale-up tech companies (50-500 employees)", "Product-focused development teams", "Remote-first organizations"]
      },
      careerProgression: {
        potentialRoles: ["Senior Developer II", "Tech Lead (Frontend Focus)", "Specialist Engineer"],
        timeline: "12-18 months (Senior Dev II) / 24-36 months (Tech Lead)",
        developmentPath: "Focus on deepening system design skills and mentoring junior team members to prepare for a Tech Lead role."
      },
      interviewRecommendations: {
        technicalQuestions: [
          "Describe a system architecture challenge you solved recently and why your solution was better than alternatives.",
          "Walk us through optimizing a React application for performance in a high-traffic environment.",
          "Explain the trade-offs between monolithic vs. microservices architecture based on your project experience."
        ],
        behavioralQuestions: [
          "Tell us about a time you had to pivot your approach mid-project due to a major technical blocker.",
          "How do you handle a disagreement with a technical lead regarding implementation strategy?",
          "Describe your process for providing critical feedback during a code review."
        ],
        redFlagsToWatch: [
          "Inquire specifically about the reasons for short stays at past employers.",
          "Validate depth of experience in unit/integration testing beyond basic coverage.",
          "Check for clarity on ownership vs. contribution in team projects."
        ]
      },
      compensationAnalysis: {
        marketRate: "$95,000 - $135,000 (Mid-level to Senior Developer, US Market)",
        valueProposition: "Strong individual contributor ready for the next level of ownership and specialized technical challenges.",
        negotiationTips: [
          "Anchor the negotiation on demonstrated project complexity and specialized skills.",
          "Highlight interest in taking on early leadership or mentorship opportunities.",
          "Be prepared to offer total compensation breakdown (equity, bonus) vs. base salary."
        ]
      },
      analyzedAt: new Date().toISOString(),
      aiModel: "mock-analysis"
    };
  }

  generateMockMatchAnalysis() {
    return {
      matchScore: Math.floor(Math.random() * 30) + 55,
      matchSummary: "The candidate possesses a strong technical baseline, but there are significant gaps in required cloud infrastructure experience and senior-level system design knowledge critical for this role.",
      keyAlignments: [
        "4+ years of experience with core requirements (React, Node.js).",
        "Experience leading small project teams, satisfying the 'mentorship' requirement.",
        "Clear quantitative results cited in the resume related to application performance."
      ],
      gapsToJob: [
        "Job requires 2+ years of AWS certification/experience; resume shows none.",
        "Lack of experience with event-driven microservices architecture.",
        "Resume does not mention specific experience with security compliance (e.g., SOC 2, HIPAA)."
      ],
      interviewFocusAreas: [
        "Deep dive into cloud knowledge, focusing on resource deployment and cost management.",
        "Explore how they would handle a complete system failure.",
        "Ask for specific examples of complex architectural decisions they made."
      ],
      analyzedAt: new Date().toISOString(),
      aiModel: "mock-analysis"
    };
  }

  generateMockJobDescription(jobData) {
    const { title, requiredSkills, experience, companyName } = jobData;

    return `
# ${title} - Join the Innovation Team at ${companyName}

## 1. The Opportunity
We are seeking a highly motivated and skilled **${title}** to lead critical initiatives within our product development lifecycle.

## 2. What You'll Do
- Design, develop, and deploy highly scalable features using modern practices.
- Collaborate closely with Product and Design teams to translate user needs into technical specifications.
- Drive continuous improvement by implementing robust code quality, testing, and CI/CD pipelines.
- Mentor junior developers and contribute to the technical direction of the team.

## 3. What You'll Bring
### Must Haves:
- **${experience}+ years** of professional experience in software development.
- Strong proficiency in **${requiredSkills.slice(0, 3).join(', ')}**.
- Proven experience with complex state management and performance optimization.
- Excellent communication and collaboration skills.

### Bonus Points (Nice-to-Haves):
- Experience with cloud platforms (AWS, Azure, GCP).
- Knowledge of containerization technologies (Docker/Kubernetes).
- Contributions to open-source projects or a strong portfolio.

## 4. Life at ${companyName}
We believe in empowering our employees with autonomy and trust. Our culture is built on continuous learning and mutual respect.

## 5. About the Company
${companyName} is pioneering the future of technology. Join us to solve challenging problems and build products that truly make a difference.`;
  }
}

export default new HRAIService();
