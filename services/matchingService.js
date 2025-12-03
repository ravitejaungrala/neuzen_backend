// backend/services/matchingService.js
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import AIService from './aiService.js';

class MatchingService {
  async findBestCandidates(jobId, limit = 10) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      const candidates = await Candidate.find({ status: { $ne: 'rejected' } })
        .populate('userId', 'fullName email mobile avatar');

      const scoredCandidates = [];

      for (const candidate of candidates) {
        const matchResult = await AIService.calculateMatchScore(job, candidate);
        
        scoredCandidates.push({
          candidate,
          matchScore: matchResult.score,
          breakdown: matchResult.breakdown,
          aiInsights: matchResult.aiInsights,
          matchedSkills: matchResult.matchedSkills
        });
      }

      // Sort by match score and return top candidates
      return scoredCandidates
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Find best candidates error:', error);
      throw new Error('Failed to find best candidates');
    }
  }

  async updateAllCandidateMatches() {
    try {
      const candidates = await Candidate.find();
      const activeJobs = await Job.find({ status: 'active' });

      let updatedCount = 0;

      for (const candidate of candidates) {
        for (const job of activeJobs) {
          const matchResult = await AIService.calculateMatchScore(job, candidate);
          
          // Update match score
          const existingMatchIndex = candidate.matchScores.findIndex(
            score => score.jobId.toString() === job._id.toString()
          );

          if (existingMatchIndex > -1) {
            candidate.matchScores[existingMatchIndex] = {
              jobId: job._id,
              score: matchResult.score,
              breakdown: matchResult.breakdown,
              aiInsights: matchResult.aiInsights,
              calculatedAt: new Date()
            };
          } else {
            candidate.matchScores.push({
              jobId: job._id,
              score: matchResult.score,
              breakdown: matchResult.breakdown,
              aiInsights: matchResult.aiInsights,
              calculatedAt: new Date()
            });
          }
        }

        await candidate.save();
        updatedCount++;
      }

      return { updatedCount, totalCandidates: candidates.length };
    } catch (error) {
      console.error('Update all candidate matches error:', error);
      throw new Error('Failed to update candidate matches');
    }
  }

  async getCandidateSuggestions(candidateId) {
    try {
      const candidate = await Candidate.findById(candidateId)
        .populate('userId', 'fullName email');

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      const activeJobs = await Job.find({ status: 'active' });
      const suggestions = [];

      for (const job of activeJobs) {
        const matchResult = await AIService.calculateMatchScore(job, candidate);
        
        if (matchResult.score >= 70) { // Only suggest good matches
          suggestions.push({
            job: {
              _id: job._id,
              title: job.title,
              company: job.company,
              location: job.location,
              type: job.type
            },
            matchScore: matchResult.score,
            aiInsights: matchResult.aiInsights
          });
        }
      }

      // Sort by match score
      return suggestions.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Get candidate suggestions error:', error);
      throw new Error('Failed to get candidate suggestions');
    }
  }
}

export default new MatchingService();