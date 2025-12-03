import mongoose from 'mongoose';

const shortlistedSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  shortlistedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  shortlistedAt: {
    type: Date,
    default: Date.now
  },
  stage: {
    type: String,
    enum: [
      'new',
      'reviewed',
      'phone_screen',
      'technical_interview',
      'culture_interview',
      'final_interview',
      'offer_pending',
      'offer_accepted',
      'rejected',
      'on_hold'
    ],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  score: {
    technical: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    cultural: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    communication: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    overall: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  interviewSchedule: [{
    round: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['phone', 'video', 'in_person', 'technical_test']
    },
    scheduledAt: Date,
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    duration: Number, // in minutes
    meetingLink: String,
    location: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    feedback: {
      rating: Number,
      notes: String,
      strengths: [String],
      weaknesses: [String],
      submittedAt: Date,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  }],
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['general', 'feedback', 'follow_up', 'internal']
    }
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['resume', 'portfolio', 'certificate', 'test_result', 'offer_letter']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  communication: [{
    type: {
      type: String,
      enum: ['email', 'call', 'message', 'meeting']
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  nextAction: {
    type: {
      type: String,
      enum: ['schedule_interview', 'send_test', 'request_docs', 'send_offer', 'follow_up']
    },
    dueDate: Date,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  },
  offerDetails: {
    salary: Number,
    equity: String,
    bonus: String,
    benefits: [String],
    startDate: Date,
    offerLetterUrl: String,
    sentAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    rejectionReason: String
  },
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
shortlistedSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
shortlistedSchema.index({ stage: 1, priority: -1 });
shortlistedSchema.index({ 'interviewSchedule.scheduledAt': 1 });
shortlistedSchema.index({ 'nextAction.dueDate': 1 });

// Method to update stage
shortlistedSchema.methods.updateStage = async function(newStage, notes = '', userId = null) {
  const oldStage = this.stage;
  this.stage = newStage;
  
  this.statusHistory.push({
    status: newStage,
    changedAt: new Date(),
    changedBy: userId,
    notes: `Changed from ${oldStage} to ${newStage}: ${notes}`
  });
  
  await this.save();
  return this;
};

// Method to schedule interview
shortlistedSchema.methods.scheduleInterview = async function(interviewData) {
  const nextRound = this.interviewSchedule.length + 1;
  
  this.interviewSchedule.push({
    round: nextRound,
    ...interviewData,
    status: 'scheduled'
  });
  
  this.nextAction = {
    type: 'schedule_interview',
    dueDate: interviewData.scheduledAt,
    completed: true,
    completedAt: new Date()
  };
  
  await this.save();
  return this;
};

// Method to add feedback
shortlistedSchema.methods.addFeedback = async function(round, feedback) {
  const interview = this.interviewSchedule.find(i => i.round === round);
  if (interview) {
    interview.feedback = feedback;
    interview.status = 'completed';
    await this.save();
  }
  return this;
};

const Shortlisted = mongoose.model('Shortlisted', shortlistedSchema);
export default Shortlisted;