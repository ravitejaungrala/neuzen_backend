import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['new', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired'],
    default: 'new'
  },
  stage: {
    type: String,
    enum: ['sourced', 'applied', 'screening', 'interview', 'offer', 'hired'],
    default: 'sourced'
  },
  interviewSchedule: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    date: Date,
    time: String,
    type: {
      type: String,
      enum: ['online', 'offline']
    },
    location: String,
    meetingLink: String,
    requirements: [String],
    documents: [String],
    duration: Number,
    interviewer: {
      type: String, // Change to String type
      required: true
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledAt: Date,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    feedback: {
      rating: Number,
      notes: String,
      submittedAt: Date
    }
  }],

  offerDetails: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    salary: Number,
    joiningDate: Date,
    benefits: [String],
    noticePeriod: String,
    offerLetterUrl: String,
    status: {
      type: String,
      enum: ['sent', 'accepted', 'rejected', 'negotiating'],
      default: 'sent'
    },
    sentAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  },

  tasks: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    title: String,
    description: String,
    deadline: Date,
    requirements: [String],
    submissionType: {
      type: String,
      enum: ['document', 'link', 'email']
    },
    instructions: String,
    attachments: [{
      filename: String,
      url: String
    }],
    submission: {
      content: String,
      fileUrl: String,
      submittedAt: Date,
      status: {
        type: String,
        enum: ['pending', 'submitted', 'reviewed', 'approved', 'rejected']
      },
      feedback: String
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending'
    }
  }],

  rejectionDetails: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    reason: String,
    feedback: String,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date
  },
  
  selectionDetails: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    selectedAt: Date,
    selectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    feedback: String
  },

  matchScores: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    },
    breakdown: {
      skills: Number,
      experience: Number,
      education: Number,
      keywords: Number
    }
  }],
  applications: [{
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
      enum: ['applied', 'under_review', 'shortlisted', 'rejected', 'interview', 'offer_sent', 'accepted', 'withdrawn'],
      default: 'applied'
    },
    coverLetter: String,
    interviewDate: Date,
    interviewTime: String,
    interviewLink: String,
    interviewNotes: String,
    interviewer: String,
    offerDetails: {
      salary: Number,
      startDate: Date,
      benefits: [String]
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
    }]
  }],
  tags: [{
    type: String,
    enum: ['top_candidate', 'urgent', 'high_potential', 'technical_expert', 'culture_fit']
  }],
  source: {
    type: String,
    enum: ['linkedin', 'naukri', 'indeed', 'referral', 'direct', 'campus', 'job_fair', 'other'],
    default: 'direct'
  },
  sourceDetails: {
    referralName: String,
    portalName: String,
    campaign: String
  },
  resumeAnalysis: {
    text: String,
    parsedData: {
      skills: [String],
      experience: [{
        company: String,
        title: String,
        duration: String,
        description: String
      }],
      education: [{
        institution: String,
        degree: String,
        year: String
      }],
      certifications: [String]
    },
    score: Number,
    extractedAt: Date
  },
  aiInsights: {
    strengths: [String],
    weaknesses: [String],
    missingSkills: [String],
    suggestedRoles: [String],
    careerPath: String,
    generatedAt: Date
  },
  engagementScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastContacted: Date,
  nextFollowUp: Date,
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for faster queries
candidateSchema.index({ status: 1, createdAt: -1 });
candidateSchema.index({ 'matchScores.score': -1 });
candidateSchema.index({ tags: 1 });
candidateSchema.index({ source: 1 });
candidateSchema.index({ 'applications.status': 1 });

// Virtual for full name
candidateSchema.virtual('fullName').get(function() {
  return this.userId?.fullName || '';
});

// Virtual for email
candidateSchema.virtual('email').get(function() {
  return this.userId?.email || '';
});

// Virtual for mobile
candidateSchema.virtual('mobile').get(function() {
  return this.userId?.mobile || '';
});

// Method to calculate overall match score
candidateSchema.methods.calculateOverallMatch = function() {
  if (this.matchScores.length === 0) return 0;
  const total = this.matchScores.reduce((sum, score) => sum + score.score, 0);
  return Math.round(total / this.matchScores.length);
};

// Method to add application
candidateSchema.methods.addApplication = async function(jobId, coverLetter = '') {
  this.applications.push({
    jobId,
    coverLetter,
    status: 'applied'
  });
  await this.save();
  return this;
};

// Method to update status
candidateSchema.methods.updateStatus = async function(newStatus, notes = '') {
  this.status = newStatus;
  
  if (notes) {
    this.applications[this.applications.length - 1]?.notes.push({
      content: notes,
      createdBy: 'system'
    });
  }
  
  await this.save();
  return this;
};

// Method to record selection
candidateSchema.methods.recordSelection = async function(jobId, selectedBy, feedback = '') {
  this.selectionDetails = {
    jobId,
    selectedAt: new Date(),
    selectedBy,
    feedback
  };
  
  this.status = 'selected';
  this.stage = 'hired';
  
  await this.save();
  return this;
};

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;