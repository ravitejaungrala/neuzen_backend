import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: [
      'applied',
      'under_review',
      'shortlisted',
      'rejected',
      'interview',
      'offer_sent',
      'accepted',
      'withdrawn',
      'on_hold'
    ],
    default: 'applied'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  coverLetter: String,
  answers: [{
    question: String,
    answer: String
  }],
  resumeUrl: String,
  source: {
    type: String,
    enum: ['linkedin', 'naukri', 'indeed', 'referral', 'direct', 'career_site', 'other'],
    default: 'direct'
  },
  interviewDate: Date,
  interviewTime: String,
  interviewLink: String,
  interviewer: String,
  interviewNotes: String,
  offerDetails: {
    salary: Number,
    startDate: Date,
    benefits: [String],
    offerLetterUrl: String,
    acceptedAt: Date
  },
  rejectionReason: String,
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  timeline: [{
    event: String,
    description: String,
    date: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  aiAnalysis: {
    skillsMatch: Number,
    experienceMatch: Number,
    cultureFit: Number,
    overallScore: Number,
    insights: [String],
    generatedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ matchScore: -1 });

// Virtual for candidate name
applicationSchema.virtual('candidateName').get(function() {
  return this.candidateId?.fullName || '';
});

// Virtual for job title
applicationSchema.virtual('jobTitle').get(function() {
  return this.jobId?.title || '';
});

// Method to update status with timeline entry
applicationSchema.methods.updateStatus = function(newStatus, notes = '', userId = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  this.timeline.push({
    event: 'status_change',
    description: `Status changed from ${oldStatus} to ${newStatus}: ${notes}`,
    metadata: {
      oldStatus,
      newStatus,
      changedBy: userId
    }
  });
  
  return this;
};

const Application = mongoose.model('Application', applicationSchema);

export default Application;