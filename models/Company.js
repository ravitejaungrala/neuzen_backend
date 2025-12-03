import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true
  },
  description: String,
  website: String,
  logo: String,
  industry: String,
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  founded: Number,
  headquarters: String,
  contact: {
    email: String,
    phone: String,
    address: String
  },
  social: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  settings: {
    theme: {
      primaryColor: {
        type: String,
        default: '#FF6B35'
      },
      secondaryColor: {
        type: String,
        default: '#2A9D8F'
      }
    },
    branding: {
      logoUrl: String,
      favicon: String,
      banner: String
    },
    email: {
      fromName: String,
      fromEmail: String,
      signature: String
    },
    notifications: {
      newApplication: Boolean,
      candidateUpdate: Boolean,
      interviewSchedule: Boolean,
      dailyDigest: Boolean
    }
  },
  integrations: [{
    platform: String,
    connected: Boolean,
    apiKey: String,
    settings: mongoose.Schema.Types.Mixed,
    lastSynced: Date
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'expired', 'trial'],
      default: 'trial'
    },
    currentPeriodEnd: Date,
    features: [String]
  },
  stats: {
    totalJobs: {
      type: Number,
      default: 0
    },
    activeJobs: {
      type: Number,
      default: 0
    },
    totalCandidates: {
      type: Number,
      default: 0
    },
    totalHires: {
      type: Number,
      default: 0
    },
    avgTimeToHire: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'recruiter', 'hiring_manager', 'interviewer'],
      default: 'recruiter'
    },
    permissions: [String]
  }]
}, {
  timestamps: true
});

const Company = mongoose.model('Company', companySchema);

export default Company;