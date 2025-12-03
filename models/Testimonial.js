// backend/models/Testimonial.js
import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    minlength: [50, 'Testimonial must be at least 50 characters'],
    maxlength: [500, 'Testimonial cannot exceed 500 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 5
  },
  avatar: {
    type: String,
    default: null
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
testimonialSchema.index({ status: 1, featured: 1, createdAt: -1 });
testimonialSchema.index({ userId: 1 });

// Virtual for getting user details
testimonialSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

export default Testimonial;