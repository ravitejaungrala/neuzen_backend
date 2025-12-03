// backend/models/User.js - Update the profile schema
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['hr', 'candidate'],
    default: 'candidate'
  },
  companyName: {
    type: String,
    required: function() { return this.role === 'hr'; }
  },
  avatar: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },

  // Profile data - UPDATED WITH PROJECTS
  profile: {
    location: String,
    website: String,
    github: String,
    linkedin: String,
    portfolio: String,
    bio: String,
    // Add testimonial field
   testimonial: {
    content: {
      type: String,
      default: ''
    },
    position: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  
    // Skills array
    skills: [{
      name: String,
      proficiency: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      },
      yearsOfExperience: {
        type: Number,
        default: 0
      }
    }],
    
    // Experience array
    experience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      isFresher: {
        type: Boolean,
        default: false
      },
      description: String
    }],
    
    // Education array
    education: [{
      degree: String,
      institution: String,
      year: Number,
      gpa: String,
      fieldOfStudy: String
    }],
    
    // NEW: Projects array
    projects: [{
      title: String,
      description: String,
      technologies: [String],
      githubLink: String,
      liveLink: String,
      duration: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Certifications
    certifications: [String],
    
    // Resume
    resume: {
      url: String,
      originalName: String,
      fileSize: Number,
      fileType: String,
      uploadedAt: Date,
      filePath: String
    }
  },aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    jobAlerts: {
      active: { type: Boolean, default: true },
      frequency: { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
      keywords: [String],
      locations: [String]
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'connections_only'],
        default: 'connections_only'
      },
      resumeVisibility: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    }
  },

  // Job search data for candidates
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],

  // Applications for candidates
  applications: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
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
    interviewDate: Date
  }]
}, {
  timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew && this.isModified('password')) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;