// backend/controllers/hrAIAnalysisController.js
import aiMatchService from '../services/aiMatchService.js';
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

// Analyze candidate for specific job
export const analyzeCandidateForJob = async (req, res) => {
  try {
    const { candidateId, jobId } = req.params;
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email avatar profile');
    
    if (!candidate) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    // Calculate match score
    const matchAnalysis = await aiMatchService.calculateMatchScore(candidate, job);
    
    // Update candidate's match scores
    const existingScoreIndex = candidate.matchScores.findIndex(
      score => score.jobId.toString() === jobId
    );
    
    if (existingScoreIndex >= 0) {
      candidate.matchScores[existingScoreIndex] = {
        jobId,
        score: matchAnalysis.score,
        calculatedAt: new Date(),
        breakdown: matchAnalysis.breakdown
      };
    } else {
      candidate.matchScores.push({
        jobId,
        score: matchAnalysis.score,
        calculatedAt: new Date(),
        breakdown: matchAnalysis.breakdown
      });
    }
    
    // Update AI insights
    candidate.aiInsights = {
      strengths: matchAnalysis.strengths,
      weaknesses: matchAnalysis.weaknesses,
      missingSkills: matchAnalysis.suggestions,
      suggestedRoles: await getSuggestedRoles(candidate),
      generatedAt: new Date()
    };
    
    await candidate.save();
    
    res.json({
      status: 'success',
      data: {
        matchAnalysis,
        candidate: {
          _id: candidate._id,
          name: candidate.userId.fullName,
          email: candidate.userId.email
        },
        job: {
          _id: job._id,
          title: job.title,
          companyName: job.companyName
        }
      }
    });
  } catch (error) {
    console.error('Analyze candidate for job error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error analyzing candidate',
      error: error.message 
    });
  }
};

// Batch analyze candidates for a job
export const batchAnalyzeCandidatesForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { candidateIds } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    // Get candidates
    const candidates = await Candidate.find({ 
      _id: { $in: candidateIds } 
    }).populate('userId', 'fullName email avatar profile');
    
    // Calculate match scores for all candidates
    const matchResults = await aiMatchService.batchCalculateMatchScores(candidates, job);
    
    // Update candidates with new scores
    const updatePromises = candidates.map(async (candidate) => {
      const result = matchResults.find(r => r.candidateId.toString() === candidate._id.toString());
      if (result) {
        const existingScoreIndex = candidate.matchScores.findIndex(
          score => score.jobId.toString() === jobId
        );
        
        if (existingScoreIndex >= 0) {
          candidate.matchScores[existingScoreIndex] = {
            jobId,
            score: result.score,
            calculatedAt: new Date(),
            breakdown: result.breakdown
          };
        } else {
          candidate.matchScores.push({
            jobId,
            score: result.score,
            calculatedAt: new Date(),
            breakdown: result.breakdown
          });
        }
        
        // Update candidate status based on score
        if (result.score >= 80) {
          candidate.status = 'shortlisted';
        } else if (result.score >= 60) {
          candidate.status = 'review';
        }
        
        await candidate.save();
      }
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      status: 'success',
      data: {
        job: {
          _id: job._id,
          title: job.title
        },
        matchResults: matchResults.map(result => ({
          candidateId: result.candidateId,
          candidateName: result.candidateName,
          score: result.score,
          breakdown: result.breakdown,
          strengths: result.strengths.slice(0, 3),
          suggestions: result.suggestions.slice(0, 2)
        }))
      }
    });
  } catch (error) {
    console.error('Batch analyze candidates error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error batch analyzing candidates',
      error: error.message 
    });
  }
};

// Get AI insights for candidate
export const getCandidateAIInsights = async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email profile');
    
    if (!candidate) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate not found' 
      });
    }
    
    // Generate or retrieve insights
    let insights = candidate.aiInsights;
    
    if (!insights || !insights.generatedAt || 
        Date.now() - new Date(insights.generatedAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      // Generate fresh insights if older than 7 days
      insights = await aiMatchService.generateCandidateInsights(candidate);
      candidate.aiInsights = {
        ...insights,
        generatedAt: new Date()
      };
      await candidate.save();
    }
    
    // Get candidate's match scores for all jobs
    const matchScores = candidate.matchScores || [];
    
    res.json({
      status: 'success',
      data: {
        candidate: {
          _id: candidate._id,
          name: candidate.userId.fullName,
          email: candidate.userId.email
        },
        insights,
        matchScores: matchScores.sort((a, b) => b.score - a.score).slice(0, 5),
        overallMatch: matchScores.length > 0 ? 
          Math.round(matchScores.reduce((sum, score) => sum + score.score, 0) / matchScores.length) : 0
      }
    });
  } catch (error) {
    console.error('Get candidate AI insights error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error getting AI insights',
      error: error.message 
    });
  }
};

// Get job analysis with top candidates
export const getJobAnalysis = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit = 10 } = req.query;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Job not found' 
      });
    }
    
    // Get all candidates
    const candidates = await Candidate.find({})
      .populate('userId', 'fullName email avatar profile skills experience education')
      .limit(parseInt(limit));
    
    // Calculate match scores for all candidates
    const matchResults = await aiMatchService.batchCalculateMatchScores(candidates, job);
    
    // Get job statistics
    const totalCandidates = candidates.length;
    const averageScore = matchResults.length > 0 ? 
      Math.round(matchResults.reduce((sum, r) => sum + r.score, 0) / matchResults.length) : 0;
    
    const scoreDistribution = {
      excellent: matchResults.filter(r => r.score >= 80).length,
      good: matchResults.filter(r => r.score >= 60 && r.score < 80).length,
      average: matchResults.filter(r => r.score >= 40 && r.score < 60).length,
      poor: matchResults.filter(r => r.score < 40).length
    };
    
    // Get top 5 skills missing across candidates
    const allMissingSkills = {};
    matchResults.forEach(result => {
      result.suggestions?.forEach(suggestion => {
        if (suggestion.toLowerCase().includes('skill')) {
          const skill = suggestion.replace(/.*skill\s*/i, '').trim();
          if (skill) {
            allMissingSkills[skill] = (allMissingSkills[skill] || 0) + 1;
          }
        }
      });
    });
    
    const topMissingSkills = Object.entries(allMissingSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));
    
    res.json({
      status: 'success',
      data: {
        job: {
          _id: job._id,
          title: job.title,
          requiredSkills: job.requiredSkills,
          experience: job.experience
        },
        statistics: {
          totalCandidates,
          averageScore,
          scoreDistribution,
          topMissingSkills
        },
        topCandidates: matchResults
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(result => ({
            candidateId: result.candidateId,
            name: result.candidateName,
            score: result.score,
            strengths: result.strengths.slice(0, 2),
            matchBreakdown: result.breakdown
          }))
      }
    });
  } catch (error) {
    console.error('Get job analysis error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error analyzing job',
      error: error.message 
    });
  }
};

// Generate interview questions for candidate
export const generateInterviewQuestions = async (req, res) => {
  try {
    const { candidateId, jobId } = req.params;
    const { type = 'technical', count = 5 } = req.query;
    
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName profile');
    
    const job = await Job.findById(jobId);
    
    if (!candidate || !job) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Candidate or job not found' 
      });
    }
    
    const candidateText = aiMatchService.prepareCandidateText(candidate);
    const jobText = aiMatchService.prepareJobText(job);
    
    const prompt = `
    Generate ${count} ${type} interview questions for this candidate based on the job requirements.
    
    CANDIDATE:
    ${candidateText}
    
    JOB:
    ${jobText}
    
    Generate ${type} questions that assess:
    1. Technical skills relevant to the job
    2. Problem-solving abilities
    3. Experience with required technologies
    4. Scenario-based situations
    
    Format as JSON:
    {
      "questions": [
        {
          "question": "string",
          "type": "technical|behavioral|scenario",
          "difficulty": "easy|medium|hard",
          "expectedAnswer": "string",
          "scoringCriteria": ["string"]
        }
      ]
    }
    `;
    
    // This would call OpenAI - for now returning mock data
    const mockQuestions = generateMockQuestions(type, count);
    
    res.json({
      status: 'success',
      data: {
        candidate: candidate.userId.fullName,
        job: job.title,
        questions: mockQuestions
      }
    });
  } catch (error) {
    console.error('Generate interview questions error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error generating interview questions',
      error: error.message 
    });
  }
};

// Helper function to get suggested roles
async function getSuggestedRoles(candidate) {
  const experience = aiMatchService.extractCandidateExperience(candidate);
  const skills = aiMatchService.extractCandidateSkills(candidate);
  
  // Simple role suggestion based on skills and experience
  const roles = [];
  
  if (skills.some(s => s.name.toLowerCase().includes('react') || 
                      s.name.toLowerCase().includes('javascript'))) {
    roles.push('Frontend Developer');
  }
  
  if (skills.some(s => s.name.toLowerCase().includes('node') || 
                      s.name.toLowerCase().includes('backend'))) {
    roles.push('Backend Developer');
  }
  
  if (skills.some(s => s.name.toLowerCase().includes('full') || 
                      s.name.toLowerCase().includes('stack'))) {
    roles.push('Full Stack Developer');
  }
  
  if (experience.totalYears > 5) {
    roles.push('Senior Developer', 'Tech Lead');
  }
  
  if (skills.some(s => s.name.toLowerCase().includes('cloud') || 
                      s.name.toLowerCase().includes('aws'))) {
    roles.push('Cloud Engineer');
  }
  
  return roles.length > 0 ? roles : ['Software Developer', 'Technical Specialist'];
}

// Helper function for mock questions
function generateMockQuestions(type, count) {
  const questions = [];
  const types = ['technical', 'behavioral', 'scenario'];
  
  for (let i = 1; i <= count; i++) {
    const qType = type === 'mixed' ? types[Math.floor(Math.random() * types.length)] : type;
    
    questions.push({
      question: `Sample ${qType} question ${i} about relevant skills and experience`,
      type: qType,
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
      expectedAnswer: `Expected answer would demonstrate proficiency in the required area`,
      scoringCriteria: [
        'Technical accuracy',
        'Problem-solving approach',
        'Communication clarity',
        'Relevance to job requirements'
      ]
    });
  }
  
  return questions;
}