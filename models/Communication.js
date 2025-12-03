// backend/models/Communication.js
import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hrUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  type: {
    type: String,
    enum: [
      'whatsapp',
      'email',
      'sms',
      'interview_scheduled',
      'offer_sent',
      'task_assigned',
      'rejection',
      'selection',
      'general'
    ],
    required: true
  },
  messageType: {
    type: String,
    enum: [
      'interview_scheduled',
      'offer_sent',
      'selected',         // Keep this for messageType
      'rejected',         // Keep this for messageType
      'task_assigned',
      'general',
      'selection',        // Added
      'rejection'  
    ]
  },
  subject: String,
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  response: {
    content: String,
    receivedAt: Date
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    type: String
  }]
}, {
  timestamps: true
});

// Indexes
communicationSchema.index({ candidateId: 1, createdAt: -1 });
communicationSchema.index({ hrUserId: 1, createdAt: -1 });
communicationSchema.index({ type: 1, status: 1 });

const Communication = mongoose.model('Communication', communicationSchema);

export default Communication;