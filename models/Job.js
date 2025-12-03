import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  shortDescription: String,
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  },
  department: String,
  location: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote', 'hybrid'],
    default: 'full-time'
  },
  experience: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 20
    }
  },
  salary: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    isNegotiable: {
      type: Boolean,
      default: false
    },
    bonus: String
  },
  requiredSkills: [{
    name: String,
    level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  preferredSkills: [String],
  responsibilities: [String],
  requirements: [String],
  benefits: [String],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'internal'],
    default: 'public'
  },
  applicationDeadline: Date,
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recruiters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  category: String,
  industry: String,
  tags: [String],
  applicationProcess: {
    requiresCoverLetter: {
      type: Boolean,
      default: false
    },
    requiresResume: {
      type: Boolean,
      default: true
    },
    questions: [{
      question: String,
      type: {
        type: String,
        enum: ['text', 'textarea', 'multiple_choice', 'file'],
        default: 'text'
      },
      required: Boolean,
      options: [String]
    }],
    stages: [{
      name: String,
      order: Number,
      required: Boolean
    }]
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shortlisted: {
      type: Number,
      default: 0
    },
    interviewed: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  aiGenerated: {
    description: Boolean,
    requirements: Boolean,
    skills: Boolean,
    generatedAt: Date
  },
  settings: {
    autoScreening: {
      type: Boolean,
      default: true
    },
    minMatchScore: {
      type: Number,
      default: 60
    },
    notifyOnApplication: {
      type: Boolean,
      default: true
    }
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
jobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ company: 1, status: 1 });
jobSchema.index({ location: 1, type: 1 });
jobSchema.index({ 'metrics.applications': -1 });

// Virtual for active days
jobSchema.virtual('activeDays').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update metrics
jobSchema.methods.updateMetrics = async function(type, value = 1) {
  const metricPath = `metrics.${type}`;
  const currentValue = this.metrics[type] || 0;
  
  this.set(metricPath, currentValue + value);
  
  // Update conversion rate
  if (this.metrics.applications > 0) {
    this.metrics.conversionRate = (this.metrics.hired / this.metrics.applications) * 100;
  }
  
  await this.save();
  return this;
};

// Method to calculate match score for a candidate
jobSchema.methods.calculateMatchScore = function(candidateSkills, candidateExperience) {
  let score = 0;
  const maxScore = 100;
  
  // Skills match (50%)
  const requiredSkills = this.requiredSkills.filter(skill => skill.isRequired);
  const candidateSkillNames = candidateSkills.map(s => s.name.toLowerCase());
  
  const matchedSkills = requiredSkills.filter(skill => 
    candidateSkillNames.includes(skill.name.toLowerCase())
  );
  
  const skillMatchPercentage = requiredSkills.length > 0 
    ? (matchedSkills.length / requiredSkills.length) * 50 
    : 0;
  
  // Experience match (30%)
  const expMatchPercentage = candidateExperience >= this.experience.min 
    ? 30 
    : (candidateExperience / this.experience.min) * 30;
  
  // Preferred skills bonus (20%)
  const preferredSkills = this.preferredSkills || [];
  const matchedPreferred = preferredSkills.filter(skill => 
    candidateSkillNames.includes(skill.toLowerCase())
  );
  
  const preferredMatchPercentage = preferredSkills.length > 0 
    ? (matchedPreferred.length / preferredSkills.length) * 20 
    : 0;
  
  score = skillMatchPercentage + expMatchPercentage + preferredMatchPercentage;
  
  return {
    score: Math.round(score),
    breakdown: {
      skills: Math.round(skillMatchPercentage),
      experience: Math.round(expMatchPercentage),
      preferred: Math.round(preferredMatchPercentage)
    }
  };
};

const Job = mongoose.model('Job', jobSchema);

export default Job;