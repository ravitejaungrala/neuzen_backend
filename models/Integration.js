import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: [
      'linkedin',
      'gmail',
      'outlook',
      'whatsapp',
      'google_drive',
      'onedrive',
      'sharepoint',
      'naukri',
      'indeed',
      'monster',
      'github',
      'slack',
      'teams',
      'zoom',
      'calendar'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['email', 'storage', 'social', 'job_portal', 'communication', 'calendar'],
    required: true
  },
  connected: {
    type: Boolean,
    default: false
  },
  credentials: {
    apiKey: String,
    apiSecret: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date
  },
  settings: {
    autoSync: {
      type: Boolean,
      default: false
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    syncDirection: {
      type: String,
      enum: ['import', 'export', 'both'],
      default: 'import'
    }
  },
  lastSynced: Date,
  itemsSynced: {
    candidates: {
      type: Number,
      default: 0
    },
    jobs: {
      type: Number,
      default: 0
    },
    contacts: {
      type: Number,
      default: 0
    },
    emails: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'syncing'],
    default: 'inactive'
  },
  errorLog: [{
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  webhookUrl: String,
  webhookSecret: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
integrationSchema.index({ userId: 1, platform: 1 }, { unique: true });
integrationSchema.index({ userId: 1, connected: 1 });
integrationSchema.index({ lastSynced: -1 });

// Method to sync integration
integrationSchema.methods.sync = async function() {
  this.status = 'syncing';
  this.lastSynced = new Date();
  await this.save();
  
  // Simulate sync process
  setTimeout(async () => {
    this.status = 'active';
    this.itemsSynced.candidates += Math.floor(Math.random() * 10) + 1;
    this.itemsSynced.jobs += Math.floor(Math.random() * 5) + 1;
    await this.save();
  }, 2000);
  
  return this;
};

// Method to disconnect
integrationSchema.methods.disconnect = async function() {
  this.connected = false;
  this.credentials = {};
  this.status = 'inactive';
  await this.save();
  return this;
};

const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;