import Application from '../models/Application.js';
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { sendEmail } from '../services/emailService.js';
import { io } from '../server.js';

// Get all applications (HR view)
export const getAllHRApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get company jobs
    const jobs = await Job.find({ company: company._id });
    const jobIds = jobs.map(job => job._id);
    
    // Get applications
    const { status, jobId, candidateId, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    let query = { jobId: { $in: jobIds } };
    
    if (status) query.status = status;
    if (jobId) query.jobId = jobId;
    if (candidateId) query.candidateId = candidateId;
    
    if (startDate || endDate) {
      query.appliedAt = {};
      if (startDate) query.appliedAt.$gte = new Date(startDate);
      if (endDate) query.appliedAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const applications = await Application.find(query)
      .populate('candidateId', 'fullName email avatar')
      .populate({
        path: 'jobId',
        select: 'title company',
        populate: {
          path: 'company',
          select: 'name'
        }
      })
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        applications,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get HR applications error:', error);
    res.status(500).json({ 
      message: 'Error fetching HR applications',
      error: error.message 
    });
  }
};

// Get HR application by ID
export const getHRApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const application = await Application.findById(id)
      .populate('candidateId', 'fullName email mobile avatar profile')
      .populate({
        path: 'jobId',
        select: 'title description company location type salary',
        populate: {
          path: 'company',
          select: 'name logo website'
        }
      });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization - HR must belong to the company
    const company = await Company.findOne({ 'team.user': userId });
    if (!company) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const job = await Job.findById(application.jobId);
    if (!job || job.company.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      status: 'success',
      data: { application }
    });
  } catch (error) {
    console.error('Get HR application error:', error);
    res.status(500).json({ 
      message: 'Error fetching HR application',
      error: error.message 
    });
  }
};

// Update application status (HR only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization (HR only)
    const user = await User.findById(userId);
    if (user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldStatus = application.status;
    application.status = status;
    
    // Add to timeline
    application.timeline.push({
      event: 'status_change',
      description: `Status changed from ${oldStatus} to ${status}: ${notes || 'No notes provided'}`,
      metadata: {
        oldStatus,
        newStatus: status,
        changedBy: userId
      }
    });

    // Add note if provided
    if (notes) {
      application.notes.push({
        content: `Status update: ${notes}`,
        createdBy: userId,
        createdAt: new Date()
      });
    }

    await application.save();

    // Update candidate status if needed
    if (['interview', 'offer_sent', 'accepted', 'rejected'].includes(status)) {
      const candidate = await Candidate.findOne({ userId: application.candidateId });
      if (candidate) {
        candidate.status = status === 'accepted' ? 'selected' : status === 'rejected' ? 'rejected' : status;
        await candidate.save();
      }
    }

    // Send notification to candidate
    const candidate = await User.findById(application.candidateId);
    if (candidate?.email) {
      await sendEmail({
        to: candidate.email,
        subject: `Application Status Update: ${application.jobId?.title || 'Your Application'}`,
        template: 'status_update',
        data: {
          name: candidate.fullName,
          position: application.jobId?.title || 'the position',
          oldStatus,
          newStatus: status,
          notes: notes || 'No additional notes provided',
          companyName: req.user.companyName || 'Our Company'
        }
      });
    }

    // Emit real-time update
    io.to(`candidate-${application.candidateId}`).emit('application-updated', {
      applicationId: application._id,
      status,
      message: `Application status updated to ${status}`
    });

    res.json({
      status: 'success',
      message: 'Application status updated successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ 
      message: 'Error updating application status',
      error: error.message 
    });
  }
};

// Add note to application (HR only)
export const addApplicationNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization (HR only)
    const user = await User.findById(userId);
    if (user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    application.notes.push({
      content,
      createdBy: userId,
      createdAt: new Date()
    });

    await application.save();

    res.json({
      status: 'success',
      message: 'Note added successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Add application note error:', error);
    res.status(500).json({ 
      message: 'Error adding note to application',
      error: error.message 
    });
  }
};

// Schedule interview (HR only)
export const scheduleInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { interviewDate, interviewTime, interviewLink, interviewer, notes } = req.body;
    const userId = req.user.id;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization (HR only)
    const user = await User.findById(userId);
    if (user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update application
    application.status = 'interview';
    application.interviewDate = interviewDate;
    application.interviewTime = interviewTime;
    application.interviewLink = interviewLink;
    application.interviewer = interviewer;
    
    // Add to timeline
    application.timeline.push({
      event: 'interview_scheduled',
      description: `Interview scheduled for ${new Date(interviewDate).toLocaleDateString()} at ${interviewTime}`,
      metadata: {
        interviewDate,
        interviewTime,
        interviewLink,
        interviewer
      }
    });

    // Add note if provided
    if (notes) {
      application.notes.push({
        content: `Interview scheduled: ${notes}`,
        createdBy: userId,
        createdAt: new Date()
      });
    }

    await application.save();

    // Send email to candidate
    const candidate = await User.findById(application.candidateId);
    const job = await Job.findById(application.jobId);
    
    if (candidate?.email) {
      await sendEmail({
        to: candidate.email,
        subject: `Interview Scheduled: ${job?.title || 'Position'}`,
        template: 'interview_scheduled',
        data: {
          name: candidate.fullName,
          interviewDate: new Date(interviewDate).toLocaleDateString(),
          interviewTime,
          interviewLink,
          interviewer,
          position: job?.title || 'the position',
          companyName: req.user.companyName || 'Our Company',
          preparationTips: 'Please prepare for technical and behavioral questions.'
        }
      });
    }

    // Emit real-time update
    io.to(`candidate-${application.candidateId}`).emit('interview-scheduled', {
      applicationId: application._id,
      interviewDate,
      interviewTime,
      interviewLink
    });

    res.json({
      status: 'success',
      message: 'Interview scheduled successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ 
      message: 'Error scheduling interview',
      error: error.message 
    });
  }
};

// Send offer letter (HR only)
export const sendOfferLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { salary, startDate, benefits, notes } = req.body;
    const userId = req.user.id;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization (HR only)
    const user = await User.findById(userId);
    if (user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update application
    application.status = 'offer_sent';
    application.offerDetails = {
      salary,
      startDate,
      benefits: benefits || [],
      offerLetterUrl: `https://ai-hire.com/offer-letters/${application._id}`
    };
    
    // Add to timeline
    application.timeline.push({
      event: 'offer_sent',
      description: `Offer letter sent with salary ${salary}`,
      metadata: {
        salary,
        startDate,
        benefits
      }
    });

    // Add note if provided
    if (notes) {
      application.notes.push({
        content: `Offer sent: ${notes}`,
        createdBy: userId,
        createdAt: new Date()
      });
    }

    await application.save();

    // Send email to candidate
    const candidate = await User.findById(application.candidateId);
    const job = await Job.findById(application.jobId);
    
    if (candidate?.email) {
      await sendEmail({
        to: candidate.email,
        subject: `Job Offer: ${job?.title || 'Position'}`,
        template: 'offer_letter',
        data: {
          name: candidate.fullName,
          position: job?.title || 'the position',
          salary: `$${salary.toLocaleString()}`,
          startDate: new Date(startDate).toLocaleDateString(),
          benefits: benefits?.join(', ') || 'Standard benefits package',
          companyName: req.user.companyName || 'Our Company',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      });
    }

    // Emit real-time update
    io.to(`candidate-${application.candidateId}`).emit('offer-sent', {
      applicationId: application._id,
      salary,
      startDate
    });

    res.json({
      status: 'success',
      message: 'Offer letter sent successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Send offer letter error:', error);
    res.status(500).json({ 
      message: 'Error sending offer letter',
      error: error.message 
    });
  }
};

// Reject application (HR only)
export const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, feedback } = req.body;
    const userId = req.user.id;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization (HR only)
    const user = await User.findById(userId);
    if (user.role !== 'hr') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update application
    application.status = 'rejected';
    application.rejectionReason = reason;
    
    // Add to timeline
    application.timeline.push({
      event: 'rejected',
      description: `Application rejected: ${reason}`,
      metadata: { reason, feedback }
    });

    // Add note if provided
    if (feedback) {
      application.notes.push({
        content: `Rejection feedback: ${feedback}`,
        createdBy: userId,
        createdAt: new Date()
      });
    }

    await application.save();

    // Send email to candidate
    const candidate = await User.findById(application.candidateId);
    const job = await Job.findById(application.jobId);
    
    if (candidate?.email) {
      await sendEmail({
        to: candidate.email,
        subject: `Application Update: ${job?.title || 'Position'}`,
        template: 'rejection',
        data: {
          name: candidate.fullName,
          position: job?.title || 'the position',
          reason: reason || 'We have decided to move forward with other candidates.',
          feedback: feedback || 'We encourage you to apply for future positions.',
          companyName: req.user.companyName || 'Our Company'
        }
      });
    }

    res.json({
      status: 'success',
      message: 'Application rejected successfully',
      data: { application }
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ 
      message: 'Error rejecting application',
      error: error.message 
    });
  }
};