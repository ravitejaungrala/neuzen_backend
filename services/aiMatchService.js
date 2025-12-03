// backend/services/aiMatchService.js - UPDATED COMPREHENSIVE VERSION
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class AIMatchService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cache = new Map();
    this.CACHE_TTL = {
      SHORT: 1800000, // 30 minutes
      LONG: 3600000   // 1 hour
    };
  }

  // ==================== NEW: Dynamic Search Criteria Matching ====================

  // Calculate dynamic match score based on search criteria
  async calculateDynamicMatch(candidate, searchCriteria = {}) {
    try {
      const cacheKey = `${candidate._id}-${JSON.stringify(searchCriteria)}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const candidateSkills = this.extractCandidateSkills(candidate);
      const candidateExperience = this.extractCandidateExperience(candidate);
      const candidateEducation = this.extractCandidateEducation(candidate);
      
      // Prepare criteria for analysis
      const criteria = {
        skills: searchCriteria.skills || [],
        searchTerm: searchCriteria.searchTerm || '',
        location: searchCriteria.location || '',
        minExperience: searchCriteria.minExperience || 0,
        status: searchCriteria.status || 'all',
        jobTitle: searchCriteria.jobTitle || '',
        industry: searchCriteria.industry || ''
      };

      // Calculate match based on search criteria
      const matchResult = await this.analyzeAgainstCriteria(
        candidate, 
        criteria, 
        candidateSkills, 
        candidateExperience, 
        candidateEducation
      );

      // Cache for 30 minutes
      this.cache.set(cacheKey, matchResult);
      setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL.SHORT);

      return matchResult;
    } catch (error) {
      console.error('Dynamic match calculation error:', error);
      return this.getFallbackDynamicMatch(candidate, searchCriteria);
    }
  }

  // Analyze candidate against search criteria
  async analyzeAgainstCriteria(candidate, criteria, candidateSkills, candidateExperience, candidateEducation) {
    // Basic score calculation
    const basicScore = this.calculateBasicMatch(
      candidateSkills,
      candidateExperience,
      candidateEducation,
      criteria
    );

    // Get AI-enhanced insights
    const aiAnalysis = await this.getDynamicAIAnalysis(
      candidate,
      criteria,
      basicScore
    );

    // Calculate final score
    const finalScore = Math.round(
      (basicScore.overall * 0.5) + (aiAnalysis.overallScore * 0.5)
    );

    return {
      score: finalScore,
      breakdown: {
        skills: basicScore.skills,
        experience: basicScore.experience,
        education: basicScore.education,
        relevance: basicScore.relevance,
        location: basicScore.location,
        aiEnhancement: aiAnalysis.overallScore
      },
      insights: aiAnalysis.insights,
      strengths: aiAnalysis.strengths,
      suggestions: aiAnalysis.suggestions,
      matchedCriteria: this.getMatchedCriteria(candidate, criteria)
    };
  }

  // Calculate basic match against criteria
  calculateBasicMatch(candidateSkills, candidateExperience, candidateEducation, criteria) {
    const scores = {
      skills: 0,
      experience: 0,
      education: 0,
      relevance: 0,
      location: 0,
      overall: 0
    };

    // Skills match (40% weight)
    if (criteria.skills && criteria.skills.length > 0) {
      const candidateSkillNames = candidateSkills.map(s => s.name.toLowerCase());
      const matchedSkills = criteria.skills.filter(searchSkill => 
        candidateSkillNames.some(candidateSkill => 
          candidateSkill.includes(searchSkill.toLowerCase()) || 
          searchSkill.toLowerCase().includes(candidateSkill)
        )
      );
      scores.skills = (matchedSkills.length / criteria.skills.length) * 40;
    }

    // Experience match (20% weight)
    if (criteria.minExperience > 0) {
      const expYears = candidateExperience.totalYears;
      if (expYears >= criteria.minExperience) {
        scores.experience = 20;
      } else {
        scores.experience = (expYears / criteria.minExperience) * 20;
      }
    }

    // Education/relevance based on search term (20% weight)
    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.toLowerCase();
      const candidateText = this.getCandidateTextForSearch(candidate).toLowerCase();
      
      // Calculate relevance based on search term matches
      const searchWords = searchTerm.split(' ').filter(word => word.length > 2);
      const matchedWords = searchWords.filter(word => 
        candidateText.includes(word)
      );
      
      scores.relevance = (matchedWords.length / Math.max(searchWords.length, 1)) * 20;
    }

    // Job title match (10% weight)
    if (criteria.jobTitle) {
      const jobTitle = criteria.jobTitle.toLowerCase();
      const candidateTitles = this.extractCandidateTitles(candidate);
      const hasTitleMatch = candidateTitles.some(title => 
        title.toLowerCase().includes(jobTitle) || jobTitle.includes(title.toLowerCase())
      );
      if (hasTitleMatch) {
        scores.education += 5; // Using education field partially for title match
      }
    }

    // Location match (10% weight)
    if (criteria.location) {
      const candidateLocation = candidate.userId?.profile?.location?.toLowerCase() || '';
      if (candidateLocation.includes(criteria.location.toLowerCase())) {
        scores.location = 10;
      } else if (criteria.location.toLowerCase() === 'remote' && 
                candidate.userId?.profile?.remoteWorkPreference) {
        scores.location = 10;
      }
    }

    scores.overall = Math.round(scores.skills + scores.experience + scores.education + 
                               scores.relevance + scores.location);
    return scores;
  }

  // Get AI analysis based on search criteria
  async getDynamicAIAnalysis(candidate, criteria, basicScore) {
    try {
      const candidateText = this.prepareCandidateText(candidate);
      
      let prompt = `Analyze this candidate's suitability based on the following search criteria:\n\n`;
      
      if (criteria.searchTerm) {
        prompt += `Search Term: "${criteria.searchTerm}"\n`;
      }
      if (criteria.skills?.length > 0) {
        prompt += `Required Skills: ${criteria.skills.join(', ')}\n`;
      }
      if (criteria.location) {
        prompt += `Location: ${criteria.location}\n`;
      }
      if (criteria.minExperience > 0) {
        prompt += `Minimum Experience: ${criteria.minExperience} years\n`;
      }
      if (criteria.jobTitle) {
        prompt += `Job Title: ${criteria.jobTitle}\n`;
      }
      if (criteria.industry) {
        prompt += `Industry: ${criteria.industry}\n`;
      }

      prompt += `\nCANDIDATE PROFILE:\n${candidateText}\n\n`;
      prompt += `Provide analysis in this JSON format:\n{\n  "overallScore": number,\n  "insights": [string],\n  "strengths": [string],\n  "suggestions": [string]\n}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert HR recruiter analyzing candidate suitability against search criteria."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Dynamic AI analysis error:', error);
      return {
        overallScore: basicScore.overall,
        insights: ['AI analysis based on your search criteria'],
        strengths: ['Relevant background for search criteria'],
        suggestions: ['Candidate matches key search requirements']
      };
    }
  }

  // Get matched criteria
  getMatchedCriteria(candidate, criteria) {
    const matches = [];
    const candidateSkills = this.extractCandidateSkills(candidate);
    const candidateSkillNames = candidateSkills.map(s => s.name.toLowerCase());

    if (criteria.skills?.length > 0) {
      const matchedSkills = criteria.skills.filter(skill => 
        candidateSkillNames.some(cs => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
      );
      matches.push(...matchedSkills.map(skill => `Skill: ${skill}`));
    }

    if (criteria.searchTerm) {
      const searchWords = criteria.searchTerm.toLowerCase().split(' ');
      const candidateText = this.getCandidateTextForSearch(candidate).toLowerCase();
      const matchedWords = searchWords.filter(word => 
        word.length > 2 && candidateText.includes(word)
      );
      if (matchedWords.length > 0) {
        matches.push(`Keywords: ${matchedWords.join(', ')}`);
      }
    }

    if (criteria.location) {
      const candidateLocation = candidate.userId?.profile?.location?.toLowerCase() || '';
      if (candidateLocation.includes(criteria.location.toLowerCase())) {
        matches.push(`Location: ${criteria.location}`);
      } else if (criteria.location.toLowerCase() === 'remote' && 
                candidate.userId?.profile?.remoteWorkPreference) {
        matches.push('Location: Remote Work Preference');
      }
    }

    if (criteria.jobTitle) {
      const candidateTitles = this.extractCandidateTitles(candidate);
      const hasTitleMatch = candidateTitles.some(title => 
        title.toLowerCase().includes(criteria.jobTitle.toLowerCase())
      );
      if (hasTitleMatch) {
        matches.push(`Job Title: ${criteria.jobTitle}`);
      }
    }

    return matches;
  }

  getFallbackDynamicMatch(candidate, criteria) {
    const candidateSkills = this.extractCandidateSkills(candidate);
    const candidateExperience = this.extractCandidateExperience(candidate);
    const candidateEducation = this.extractCandidateEducation(candidate);

    const basicScore = this.calculateBasicMatch(
      candidateSkills,
      candidateExperience,
      candidateEducation,
      criteria
    );

    return {
      score: basicScore.overall,
      breakdown: {
        skills: basicScore.skills,
        experience: basicScore.experience,
        education: basicScore.education,
        relevance: basicScore.relevance,
        location: basicScore.location,
        aiEnhancement: 0
      },
      insights: ['Basic match calculation'],
      strengths: ['Candidate meets basic criteria'],
      suggestions: ['Consider detailed review'],
      matchedCriteria: []
    };
  }

  // Batch calculate dynamic matches
  async batchCalculateDynamicMatches(candidates, criteria) {
    const results = [];
    
    for (const candidate of candidates) {
      try {
        const matchResult = await this.calculateDynamicMatch(candidate, criteria);
        results.push({
          candidateId: candidate._id,
          candidateName: candidate.userId?.fullName,
          ...matchResult
        });
      } catch (error) {
        console.error(`Error calculating match for candidate ${candidate._id}:`, error);
        const fallback = this.getFallbackDynamicMatch(candidate, criteria);
        results.push({
          candidateId: candidate._id,
          candidateName: candidate.userId?.fullName,
          ...fallback
        });
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  // ==================== ORIGINAL: Job-Specific Matching ====================

  // Calculate match score between candidate and job
  async calculateMatchScore(candidate, job) {
    try {
      const cacheKey = `${candidate._id}-${job._id}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const candidateSkills = this.extractCandidateSkills(candidate);
      const candidateExperience = this.extractCandidateExperience(candidate);
      const candidateEducation = this.extractCandidateEducation(candidate);
      
      const jobRequirements = {
        requiredSkills: job.requiredSkills?.map(s => s.name) || [],
        preferredSkills: job.preferredSkills || [],
        experience: job.experience || { min: 0, max: 10 },
        education: job.requirements?.filter(r => r.toLowerCase().includes('degree') || 
          r.toLowerCase().includes('education')) || [],
        responsibilities: job.responsibilities || [],
        description: job.description || ''
      };

      // Calculate basic scores
      const basicScore = this.calculateJobBasicScore(
        candidateSkills, 
        candidateExperience, 
        candidateEducation, 
        jobRequirements
      );

      // Get AI-enhanced analysis
      const aiAnalysis = await this.getJobAIAnalysis(
        candidate, 
        job, 
        basicScore
      );

      // Calculate final score (60% basic, 40% AI analysis)
      const finalScore = Math.round(
        (basicScore.overall * 0.6) + (aiAnalysis.overallScore * 0.4)
      );

      const result = {
        score: finalScore,
        breakdown: {
          skills: basicScore.skills,
          experience: basicScore.experience,
          education: basicScore.education,
          responsibilities: basicScore.responsibilities || 0,
          aiEnhancement: aiAnalysis.overallScore
        },
        aiInsights: aiAnalysis.insights,
        strengths: aiAnalysis.strengths,
        weaknesses: aiAnalysis.weaknesses,
        suggestions: aiAnalysis.suggestions
      };

      // Cache for 1 hour
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), this.CACHE_TTL.LONG);

      return result;
    } catch (error) {
      console.error('AI match calculation error:', error);
      return this.getFallbackJobScore(candidate, job);
    }
  }

  // Calculate basic match score for jobs
  calculateJobBasicScore(candidateSkills, candidateExperience, candidateEducation, jobRequirements) {
    const scores = {
      skills: 0,
      experience: 0,
      education: 0,
      responsibilities: 0,
      overall: 0
    };

    // Skills match (40% weight)
    if (jobRequirements.requiredSkills.length > 0) {
      const candidateSkillNames = candidateSkills.map(s => s.name.toLowerCase());
      const matchedSkills = jobRequirements.requiredSkills.filter(jobSkill => 
        candidateSkillNames.some(candidateSkill => 
          candidateSkill.includes(jobSkill.toLowerCase()) || 
          jobSkill.toLowerCase().includes(candidateSkill)
        )
      );
      scores.skills = (matchedSkills.length / jobRequirements.requiredSkills.length) * 40;
      
      // Bonus for preferred skills (10% of 40)
      const preferredSkills = jobRequirements.preferredSkills || [];
      if (preferredSkills.length > 0) {
        const matchedPreferred = preferredSkills.filter(skill => 
          candidateSkillNames.includes(skill.toLowerCase())
        );
        scores.skills += (matchedPreferred.length / preferredSkills.length) * 4;
      }
    }

    // Experience match (30% weight)
    if (jobRequirements.experience) {
      const expYears = candidateExperience.totalYears;
      const requiredMin = jobRequirements.experience.min || 0;
      
      if (expYears >= requiredMin) {
        scores.experience = 30; // Full score if meets minimum
      } else if (requiredMin > 0) {
        scores.experience = (expYears / requiredMin) * 30;
      }
    }

    // Education match (20% weight)
    if (jobRequirements.education.length > 0) {
      const candidateDegrees = candidateEducation.map(edu => 
        edu.degree?.toLowerCase() || ''
      );
      
      const educationScore = jobRequirements.education.some(req => 
        candidateDegrees.some(degree => 
          degree.includes(req.toLowerCase()) || req.toLowerCase().includes(degree)
        )
      ) ? 20 : 10;
      
      scores.education = educationScore;
    }

    // Responsibility/keyword match (10% weight)
    if (jobRequirements.responsibilities.length > 0) {
      const candidateExpText = candidateExperience.experiences
        .map(exp => exp.description || '')
        .join(' ')
        .toLowerCase();
      
      const matchedResponsibilities = jobRequirements.responsibilities.filter(resp => 
        candidateExpText.includes(resp.toLowerCase())
      );
      
      scores.responsibilities = (matchedResponsibilities.length / Math.max(jobRequirements.responsibilities.length, 1)) * 10;
    }

    scores.overall = Math.round(scores.skills + scores.experience + scores.education + scores.responsibilities);
    return scores;
  }

  // Get AI-enhanced analysis for jobs
  async getJobAIAnalysis(candidate, job, basicScore) {
    try {
      const candidateText = this.prepareCandidateText(candidate);
      const jobText = this.prepareJobText(job);
      
      const prompt = `
      Analyze the match between a candidate and a job position.

      CANDIDATE PROFILE:
      ${candidateText}

      JOB DESCRIPTION:
      ${jobText}

      Please provide:
      1. Overall match score (0-100)
      2. Key strengths match
      3. Areas for improvement
      4. Specific suggestions for the candidate
      5. Role suitability assessment

      Format your response as JSON:
      {
        "overallScore": number,
        "insights": [string],
        "strengths": [string],
        "weaknesses": [string],
        "suggestions": [string]
      }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert HR recruiter and talent acquisition specialist. Analyze candidate-job matches objectively."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(response.choices[0].message.content);
      
      return {
        overallScore: aiResponse.overallScore || basicScore.overall,
        insights: aiResponse.insights || [],
        strengths: aiResponse.strengths || [],
        weaknesses: aiResponse.weaknesses || [],
        suggestions: aiResponse.suggestions || []
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.getFallbackJobAIAnalysis(candidate, job, basicScore);
    }
  }

  getFallbackJobScore(candidate, job) {
    // Fallback calculation without AI
    const candidateSkills = this.extractCandidateSkills(candidate);
    const candidateExperience = this.extractCandidateExperience(candidate);
    const candidateEducation = this.extractCandidateEducation(candidate);
    
    const jobRequirements = {
      requiredSkills: job.requiredSkills?.map(s => s.name) || [],
      preferredSkills: job.preferredSkills || [],
      experience: job.experience || { min: 0, max: 10 }
    };

    const basicScore = this.calculateJobBasicScore(
      candidateSkills, 
      candidateExperience, 
      candidateEducation, 
      jobRequirements
    );

    return {
      score: basicScore.overall,
      breakdown: {
        skills: basicScore.skills,
        experience: basicScore.experience,
        education: basicScore.education,
        responsibilities: basicScore.responsibilities || 0,
        aiEnhancement: 0
      },
      aiInsights: ['AI analysis unavailable. Using basic scoring.'],
      strengths: ['Skills match', 'Experience alignment'],
      weaknesses: ['Consider improving specific skills'],
      suggestions: ['Update your profile with more details']
    };
  }

  getFallbackJobAIAnalysis(candidate, job, basicScore) {
    return {
      overallScore: basicScore.overall,
      insights: ['AI analysis temporarily unavailable'],
      strengths: ['Relevant skills', 'Applicable experience'],
      weaknesses: ['Could improve specific technical skills'],
      suggestions: ['Consider obtaining relevant certifications']
    };
  }

  // Batch process multiple candidates for a job
  async batchCalculateJobMatchScores(candidates, job) {
    const results = [];
    
    for (const candidate of candidates) {
      try {
        const matchScore = await this.calculateMatchScore(candidate, job);
        results.push({
          candidateId: candidate._id,
          candidateName: candidate.userId?.fullName,
          ...matchScore
        });
      } catch (error) {
        console.error(`Error calculating score for candidate ${candidate._id}:`, error);
        const fallback = this.getFallbackJobScore(candidate, job);
        results.push({
          candidateId: candidate._id,
          candidateName: candidate.userId?.fullName,
          ...fallback
        });
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  // ==================== COMMON HELPER METHODS ====================

  // Extract candidate skills from multiple sources
  extractCandidateSkills(candidate) {
    const skills = [];
    
    // From candidate.skills
    if (candidate.skills) {
      skills.push(...candidate.skills.map(s => ({
        name: s.name,
        proficiency: s.proficiency || 5,
        source: 'candidate'
      })));
    }
    
    // From user profile skills
    if (candidate.userId?.profile?.skills) {
      skills.push(...candidate.userId.profile.skills.map(s => ({
        name: s.name,
        proficiency: s.proficiency || 5,
        source: 'profile'
      })));
    }
    
    // From resume analysis
    if (candidate.resumeAnalysis?.parsedData?.skills) {
      skills.push(...candidate.resumeAnalysis.parsedData.skills.map(s => ({
        name: s,
        proficiency: 5,
        source: 'resume'
      })));
    }
    
    // Remove duplicates, keep highest proficiency
    const skillMap = new Map();
    skills.forEach(skill => {
      const existing = skillMap.get(skill.name);
      if (!existing || skill.proficiency > existing.proficiency) {
        skillMap.set(skill.name, skill);
      }
    });
    
    return Array.from(skillMap.values());
  }

  // Extract candidate experience
  extractCandidateExperience(candidate) {
    let totalMonths = 0;
    const experience = [];
    
    // From candidate.experience
    if (candidate.experience) {
      candidate.experience.forEach(exp => {
        if (exp.startDate) {
          const start = new Date(exp.startDate);
          const end = exp.current ? new Date() : new Date(exp.endDate || new Date());
          const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                        (end.getMonth() - start.getMonth());
          totalMonths += Math.max(months, 0);
        }
        experience.push({
          company: exp.company,
          position: exp.position,
          duration: exp.current ? 'Present' : `${exp.startDate} - ${exp.endDate}`,
          description: exp.description
        });
      });
    }
    
    // From user profile experience
    if (candidate.userId?.profile?.experience) {
      candidate.userId.profile.experience.forEach(exp => {
        if (exp.startDate) {
          const start = new Date(exp.startDate);
          const end = exp.current ? new Date() : new Date(exp.endDate || new Date());
          const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                        (end.getMonth() - start.getMonth());
          totalMonths += Math.max(months, 0);
        }
        experience.push({
          company: exp.company,
          position: exp.position,
          duration: exp.current ? 'Present' : `${exp.startDate} - ${exp.endDate}`,
          description: exp.description
        });
      });
    }
    
    return {
      totalYears: Math.floor(totalMonths / 12),
      totalMonths: totalMonths % 12,
      experiences: experience
    };
  }

  // Extract candidate education
  extractCandidateEducation(candidate) {
    const education = [];
    
    // From candidate.education
    if (candidate.education) {
      education.push(...candidate.education);
    }
    
    // From user profile education
    if (candidate.userId?.profile?.education) {
      education.push(...candidate.userId.profile.education);
    }
    
    // From resume analysis
    if (candidate.resumeAnalysis?.parsedData?.education) {
      education.push(...candidate.resumeAnalysis.parsedData.education.map(edu => ({
        degree: edu.degree || 'Not specified',
        institution: edu.institution,
        year: edu.year
      })));
    }
    
    return education;
  }

  // Extract candidate job titles
  extractCandidateTitles(candidate) {
    const titles = [];
    
    // From experience
    if (candidate.experience) {
      titles.push(...candidate.experience.map(exp => exp.position));
    }
    
    // From user profile
    if (candidate.userId?.profile?.experience) {
      titles.push(...candidate.userId.profile.experience.map(exp => exp.position));
    }
    
    // From resume analysis
    if (candidate.resumeAnalysis?.parsedData?.experience) {
      titles.push(...candidate.resumeAnalysis.parsedData.experience.map(exp => exp.position));
    }
    
    // Remove duplicates
    return [...new Set(titles.filter(title => title))];
  }

  // Prepare candidate text for search
  getCandidateTextForSearch(candidate) {
    const user = candidate.userId || {};
    const profile = user.profile || {};
    
    const skills = this.extractCandidateSkills(candidate);
    const experience = this.extractCandidateExperience(candidate);
    const education = this.extractCandidateEducation(candidate);
    const titles = this.extractCandidateTitles(candidate);
    
    return `
    Name: ${user.fullName || 'Unknown'}
    Current Position: ${titles[0] || 'Not specified'}
    Experience: ${experience.totalYears} years ${experience.totalMonths} months
    Skills: ${skills.map(s => s.name).join(', ')}
    Education: ${education.map(edu => edu.degree).join(', ')}
    Location: ${profile.location || 'Not specified'}
    Bio: ${profile.bio || ''}
    Experience Details: ${experience.experiences.map(exp => `${exp.position} at ${exp.company}`).join('; ')}
    `;
  }

  prepareCandidateText(candidate) {
    const user = candidate.userId || {};
    const profile = user.profile || {};
    
    const skills = this.extractCandidateSkills(candidate);
    const experience = this.extractCandidateExperience(candidate);
    const education = this.extractCandidateEducation(candidate);
    
    return `
    Name: ${user.fullName || 'Unknown'}
    Experience: ${experience.totalYears} years ${experience.totalMonths} months
    Skills: ${skills.map(s => `${s.name} (${s.proficiency}/10)`).join(', ')}
    Education: ${education.map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}
    Bio: ${profile.bio || 'No bio provided'}
    `;
  }

  prepareJobText(job) {
    return `
    Position: ${job.title}
    Company: ${job.companyName}
    Location: ${job.location}
    Type: ${job.type}
    Required Skills: ${job.requiredSkills?.map(s => s.name).join(', ') || 'Not specified'}
    Preferred Skills: ${job.preferredSkills?.join(', ') || 'None'}
    Experience Required: ${job.experience?.min || 0}+ years
    Responsibilities: ${job.responsibilities?.join(', ') || 'Not specified'}
    Description: ${job.description?.substring(0, 500)}...
    `;
  }

  // Generate comprehensive candidate insights
  async generateCandidateInsights(candidate) {
    try {
      const candidateText = this.prepareCandidateText(candidate);
      
      const prompt = `
      Analyze this candidate profile and provide comprehensive insights:

      CANDIDATE PROFILE:
      ${candidateText}

      Provide analysis in this JSON format:
      {
        "careerSummary": string,
        "keyStrengths": [string],
        "developmentAreas": [string],
        "suggestedRoles": [string],
        "marketValue": "entry-level|mid-level|senior|expert",
        "skillGaps": [string],
        "recommendations": [string]
      }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert career coach and talent analyst. Provide objective, constructive feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Candidate insights generation error:', error);
      return this.getFallbackCandidateInsights(candidate);
    }
  }

  getFallbackCandidateInsights(candidate) {
    const experience = this.extractCandidateExperience(candidate);
    const skills = this.extractCandidateSkills(candidate);
    
    return {
      careerSummary: `Professional with ${experience.totalYears} years of experience`,
      keyStrengths: skills.slice(0, 3).map(s => `Proficient in ${s.name}`),
      developmentAreas: ['Could expand technical skill set'],
      suggestedRoles: ['Software Developer', 'Technical Specialist'],
      marketValue: experience.totalYears > 5 ? 'senior' : 
                  experience.totalYears > 2 ? 'mid-level' : 'entry-level',
      skillGaps: ['Advanced cloud technologies'],
      recommendations: ['Consider professional certifications']
    };
  }

  // Clear cache (useful for testing or when cache becomes too large)
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats (for monitoring)
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const aiMatchService = new AIMatchService();
export default aiMatchService;