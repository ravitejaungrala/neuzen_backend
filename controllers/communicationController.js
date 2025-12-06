// backend/controllers/communicationController.js - COMPLETE FIXED VERSION
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Communication from '../models/Communication.js';
import nodemailer from 'nodemailer';

// ==================== EMAIL CONFIGURATION ====================
const createTransporter = () => {
  console.log('📧 Creating email transporter with:', process.env.EMAIL_USER);
  return nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email sending function
const sendEmailFunction = async (emailData) => {
  try {
    console.log('📧 Attempting to send email to:', emailData.to);
    console.log('📧 Subject:', emailData.subject);
    
    // Check environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials missing in .env file');
      throw new Error('Email service configuration missing');
    }
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"AI Hire Platform" <${process.env.EMAIL_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments || []
    };
    
    console.log('📧 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully! Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

// ==================== HELPER FUNCTIONS ====================
// Helper: Format phone number for WhatsApp
const formatPhoneNumberForWhatsApp = (phoneNumber) => {
  if (!phoneNumber) return null;
  let cleaned = phoneNumber.replace(/\D/g, '');
  cleaned = cleaned.replace(/^0+/, '');
  
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  return cleaned;
};

// Helper: Generate WhatsApp message
const generateWhatsAppMessage = (type, data) => {
  switch (type) {
    case 'interview_scheduled':
      return `Hi ${data.candidateName},
      
🎉 Congratulations! You've been shortlisted for ${data.jobTitle} at ${data.companyName}.

📅 Interview Details:
Date: ${data.interviewDate}
Time: ${data.interviewTime}
Type: ${data.interviewType}
${data.interviewType === 'offline' ? `📍 Location: ${data.location}` : '💻 Platform: Virtual Meeting'}

📋 Requirements:
${data.requirements?.map(req => `• ${req}`).join('\n')}

📄 Documents needed:
${data.documents?.map(doc => `• ${doc}`).join('\n')}

⏰ Duration: ${data.duration} minutes
👤 Interviewer: ${data.interviewer}

See you then! Best of luck!`;

    case 'offer_sent':
      return `Hi ${data.candidateName},
      
🎊 Congratulations! You've been selected for ${data.jobTitle} at ${data.companyName}!

💰 Offer Details:
Salary: ${data.salary}
Joining Date: ${data.joiningDate}
Benefits: ${data.benefits}
Notice Period: ${data.noticePeriod}

${data.offerLetterUrl ? `📄 Offer Letter: ${data.offerLetterUrl}` : '📄 Check your email for official offer letter'}

Please confirm your acceptance within 7 days.

We're excited to welcome you to our team!`;

    case 'selected':
      return `Hi ${data.candidateName},
      
🎊 Congratulations! You have been SELECTED for ${data.jobTitle} at ${data.companyName}!
This is a huge achievement! 🎉

We will contact you shortly with the official offer details and next steps.

Welcome to the team! 🎈`;

    case 'rejected':
      return `Hi ${data.candidateName},
      
Thank you for applying for ${data.jobTitle} at ${data.companyName}.

After careful consideration, we've decided to move forward with other candidates at this time.

${data.feedback ? `Feedback: ${data.feedback}` : 'We encourage you to apply for future opportunities.'}

We appreciate your time and interest in our company.

Best wishes for your job search!`;

    default:
      return `Hi ${data.candidateName},

${data.message || 'This is a communication from the recruitment team.'}

Best regards,
${data.companyName} Team`;
  }
};

// Helper: Generate Email HTML
const generateEmailHTML = (type, data) => {
  const getStatusColor = (type) => {
    switch (type) {
      case 'selected': return '#28a745';
      case 'offer_sent': return '#17a2b8';
      case 'interview_scheduled': return '#ffc107';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    .header {
      background: ${getStatusColor(type)};
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .details-card {
      background: #f8f9fa;
      padding: 15px;
      margin: 15px 0;
    }
    .footer {
      background: #343a40;
      color: white;
      text-align: center;
      padding: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${type === 'interview_scheduled' ? 'Interview Scheduled' : 
                type === 'offer_sent' ? 'Job Offer Letter' : 
                type === 'selected' ? 'Congratulations!' : 'Application Update'}</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${data.candidateName}</strong>,</p>
      ${data.detailsHtml || ''}
      ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
      ${data.nextSteps ? `<p><strong>Next Steps:</strong> ${data.nextSteps}</p>` : ''}
      <p>Best regards,<br>
      <strong>${data.companyName} Hiring Team</strong></p>
    </div>
    <div class="footer">
      <p>${data.companyName} | Automated Message</p>
    </div>
  </div>
</body>
</html>`;
};

// ==================== CONTROLLER FUNCTIONS ====================

// Test Route
export const testRoute = async (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'Communication routes are working!',
      timestamp: new Date().toISOString(),
      routes: [
        '/candidate/:candidateId/whatsapp',
        '/candidate/:candidateId/email',
        '/candidate/:candidateId/schedule-interview',
        '/candidate/:candidateId/send-offer',
        '/candidate/:candidateId/select',
        '/candidate/:candidateId/reject'
      ]
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Schedule Interview
export const scheduleInterview = async (req, res) => {
  try {
    console.log('=== scheduleInterview called ===');
    console.log('User:', req.user?._id, req.user?.email);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { candidateId } = req.params;
    const {
      jobId,
      interviewDate,
      interviewTime,
      interviewType = 'online',
      location,
      requirements = ['Laptop with webcam', 'Stable internet connection'],
      documents = ['Updated Resume', 'ID Proof'],
      duration = 60,
      interviewer,
      notes,
      sendWhatsApp = true,
      sendEmail = true
    } = req.body;
    
    const hrUser = req.user;
    
    // Validate jobId
    if (!jobId || jobId.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Update candidate
    candidate.status = 'interview';
    candidate.interviewSchedule = candidate.interviewSchedule || [];
    
    const interview = {
      jobId: jobId,
      date: new Date(interviewDate),
      time: interviewTime,
      type: interviewType,
      location: interviewType === 'online' ? 'Virtual Meeting' : location,
      requirements: requirements,
      documents: documents,
      duration: duration,
      interviewer: interviewer || hrUser.fullName,
      status: 'scheduled',
      scheduledBy: hrUser._id,
      scheduledAt: new Date(),
      notes: notes
    };
    
    candidate.interviewSchedule.push(interview);
    await candidate.save();
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'interview_scheduled',
      messageType: 'interview_scheduled',
      content: `Interview scheduled for ${new Date(interviewDate).toLocaleDateString()} at ${interviewTime}`,
      status: 'sent',
      metadata: interview
    });
    
    await communication.save();
    
    // Prepare response
    const responseData = {
      interview,
      candidate: {
        name: candidate.userId.fullName,
        email: candidate.userId.email,
        phone: candidate.userId.mobile,
        status: candidate.status
      },
      job: {
        title: job.title,
        company: job.company.name
      },
      communications: {}
    };
    
    // Send WhatsApp
    if (sendWhatsApp && candidate.userId?.mobile) {
      const whatsappMessage = generateWhatsAppMessage('interview_scheduled', {
        candidateName: candidate.userId.fullName,
        jobTitle: job.title,
        companyName: hrUser.companyName || job.company.name,
        interviewDate: new Date(interviewDate).toLocaleDateString(),
        interviewTime,
        interviewType,
        location: interviewType === 'online' ? 'Virtual Meeting' : location,
        requirements,
        documents,
        duration: `${duration} minutes`,
        interviewer: interviewer || hrUser.fullName
      });
      
      const phoneNumber = formatPhoneNumberForWhatsApp(candidate.userId.mobile);
      if (phoneNumber) {
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        responseData.communications.whatsapp = {
          url: whatsappUrl,
          messagePreview: whatsappMessage.substring(0, 100) + '...',
          sent: true
        };
      }
    }
    
    // Send Email
    if (sendEmail && candidate.userId?.email) {
      try {
        console.log('📧 Preparing interview email for:', candidate.userId.email);
        
        const emailHtml = generateEmailHTML('interview_scheduled', {
          candidateName: candidate.userId.fullName,
          jobTitle: job.title,
          companyName: hrUser.companyName || job.company.name,
          detailsHtml: `<div class="details-card">
            <h3>Interview Details:</h3>
            <p><strong>Date:</strong> ${new Date(interviewDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${interviewTime}</p>
            <p><strong>Type:</strong> ${interviewType}</p>
            ${interviewType === 'offline' ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Interviewer:</strong> ${interviewer || hrUser.fullName}</p>
            <p><strong>Requirements:</strong><br>${requirements.map(req => `• ${req}`).join('<br>')}</p>
            <p><strong>Documents Required:</strong><br>${documents.map(doc => `• ${doc}`).join('<br>')}</p>
          </div>`,
          nextSteps: 'Please join 5 minutes before the scheduled time.'
        });
        
        const emailText = `Dear ${candidate.userId.fullName},

Interview Scheduled for ${job.title}

Date: ${new Date(interviewDate).toLocaleDateString()}
Time: ${interviewTime}
Type: ${interviewType}
${interviewType === 'offline' ? `Location: ${location}` : 'Platform: Virtual Meeting'}

Requirements:
${requirements.map(req => `• ${req}`).join('\n')}

Documents Required:
${documents.map(doc => `• ${doc}`).join('\n')}

Duration: ${duration} minutes
Interviewer: ${interviewer || hrUser.fullName}

Best regards,
${hrUser.companyName || job.company.name} Hiring Team`;
        
        await sendEmailFunction({
          to: candidate.userId.email,
          subject: `Interview Scheduled: ${job.title} - ${hrUser.companyName || job.company.name}`,
          text: emailText,
          html: emailHtml
        });
        
        responseData.communications.email = {
          sent: true,
          to: candidate.userId.email
        };
        
        console.log('✅ Interview email sent successfully');
      } catch (emailError) {
        console.error('❌ Interview email error:', emailError.message);
        responseData.communications.email = {
          sent: false,
          error: emailError.message
        };
      }
    }
    
    res.json({
      status: 'success',
      message: 'Interview scheduled successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

// Send Offer Letter
export const sendOfferLetter = async (req, res) => {
  try {
    console.log('=== sendOfferLetter called ===');
    console.log('User:', req.user?._id, req.user?.email);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { candidateId } = req.params;
    const {
      jobId,
      salary,
      joiningDate,
      benefits = ['Health Insurance', 'Flexible Hours'],
      noticePeriod = '30 days',
      offerLetterUrl = '',
      sendWhatsApp = true,
      sendEmail = true
    } = req.body;
    
    const hrUser = req.user;
    
    // Validate required fields
    if (!jobId || jobId.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    if (!salary || salary.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Salary is required'
      });
    }
    
    if (!joiningDate || joiningDate.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Joining date is required'
      });
    }
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Update candidate
    candidate.status = 'offer_pending';
    candidate.offerDetails = {
      jobId: jobId,
      salary,
      joiningDate: new Date(joiningDate),
      benefits,
      noticePeriod,
      offerLetterUrl,
      status: 'sent',
      sentAt: new Date(),
      sentBy: hrUser._id
    };
    
    await candidate.save();
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'offer_sent',
      messageType: 'offer_sent',
      content: `Offer letter sent for ${job.title} with salary ₹${salary}`,
      status: 'sent',
      metadata: candidate.offerDetails
    });
    
    await communication.save();
    
    // Prepare response
    const responseData = {
      offer: candidate.offerDetails,
      candidate: {
        name: candidate.userId.fullName,
        email: candidate.userId.email,
        phone: candidate.userId.mobile,
        status: candidate.status
      },
      job: {
        title: job.title,
        company: job.company.name
      },
      communications: {}
    };
    
    // Send WhatsApp
    if (sendWhatsApp && candidate.userId?.mobile) {
      const whatsappMessage = generateWhatsAppMessage('offer_sent', {
        candidateName: candidate.userId.fullName,
        jobTitle: job.title,
        companyName: hrUser.companyName || job.company.name,
        salary: `₹${Number(salary).toLocaleString()}`,
        joiningDate: new Date(joiningDate).toLocaleDateString(),
        benefits: benefits.join(', '),
        noticePeriod: noticePeriod,
        offerLetterUrl: offerLetterUrl
      });
      
      const phoneNumber = formatPhoneNumberForWhatsApp(candidate.userId.mobile);
      if (phoneNumber) {
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        responseData.communications.whatsapp = {
          url: whatsappUrl,
          messagePreview: whatsappMessage.substring(0, 100) + '...',
          sent: true
        };
      }
    }
    
    // Send Email
    if (sendEmail && candidate.userId?.email) {
      try {
        console.log('📧 Preparing offer email for:', candidate.userId.email);
        
        const emailHtml = generateEmailHTML('offer_sent', {
          candidateName: candidate.userId.fullName,
          jobTitle: job.title,
          companyName: hrUser.companyName || job.company.name,
          detailsHtml: `<div class="details-card">
            <h3>Offer Details:</h3>
            <p><strong>Position:</strong> ${job.title}</p>
            <p><strong>Salary:</strong> ₹${Number(salary).toLocaleString()}</p>
            <p><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString()}</p>
            <p><strong>Benefits:</strong><br>${benefits.map(benefit => `• ${benefit}`).join('<br>')}</p>
            <p><strong>Notice Period:</strong> ${noticePeriod}</p>
            ${offerLetterUrl ? `<p><strong>Offer Letter:</strong> <a href="${offerLetterUrl}">Download</a></p>` : ''}
          </div>`,
          nextSteps: 'Please confirm your acceptance within 7 days.'
        });
        
        const emailText = `Dear ${candidate.userId.fullName},

Congratulations! You have received an offer for ${job.title} at ${hrUser.companyName || job.company.name}.

Offer Details:
Position: ${job.title}
Salary: ₹${Number(salary).toLocaleString()}
Joining Date: ${new Date(joiningDate).toLocaleDateString()}
Benefits: ${benefits.join(', ')}
Notice Period: ${noticePeriod}
${offerLetterUrl ? `Offer Letter: ${offerLetterUrl}` : ''}

Please confirm your acceptance within 7 days.

Best regards,
${hrUser.companyName || job.company.name} Hiring Team`;
        
        await sendEmailFunction({
          to: candidate.userId.email,
          subject: `Offer Letter: ${job.title} - ${hrUser.companyName || job.company.name}`,
          text: emailText,
          html: emailHtml
        });
        
        responseData.communications.email = {
          sent: true,
          to: candidate.userId.email
        };
        
        console.log('✅ Offer email sent successfully');
      } catch (emailError) {
        console.error('❌ Offer email error:', emailError.message);
        responseData.communications.email = {
          sent: false,
          error: emailError.message
        };
      }
    }
    
    res.json({
      status: 'success',
      message: 'Offer letter sent successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error('Send offer letter error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending offer letter',
      error: error.message
    });
  }
};

// Mark as Selected
export const markAsSelected = async (req, res) => {
  try {
    console.log('=== markAsSelected called ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { candidateId } = req.params;
    const {
      jobId,
      sendWhatsApp = true,
      sendEmail = true,
      feedback
    } = req.body;
    
    const hrUser = req.user;
    
    // Validate jobId
    if (!jobId || jobId.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Update candidate
    candidate.status = 'selected';
    candidate.selectionDetails = {
      jobId: jobId,
      selectedAt: new Date(),
      selectedBy: hrUser._id,
      feedback: feedback
    };
    
    await candidate.save();
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'selection',
      messageType: 'selected',
      content: `Selected for ${job.title}`,
      status: 'sent',
      metadata: candidate.selectionDetails
    });
    
    await communication.save();
    
    // Prepare response
    const responseData = {
      candidate: {
        name: candidate.userId.fullName,
        email: candidate.userId.email,
        phone: candidate.userId.mobile,
        status: candidate.status
      },
      job: {
        title: job.title,
        company: job.company.name
      },
      communications: {}
    };
    
    // Send WhatsApp
    if (sendWhatsApp && candidate.userId?.mobile) {
      const whatsappMessage = generateWhatsAppMessage('selected', {
        candidateName: candidate.userId.fullName,
        jobTitle: job.title,
        companyName: hrUser.companyName || job.company.name,
        feedback: feedback
      });
      
      const phoneNumber = formatPhoneNumberForWhatsApp(candidate.userId.mobile);
      if (phoneNumber) {
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        responseData.communications.whatsapp = {
          url: whatsappUrl,
          messagePreview: whatsappMessage.substring(0, 100) + '...',
          sent: true
        };
      }
    }
    
    // Send Email
    if (sendEmail && candidate.userId?.email) {
      try {
        console.log('📧 Preparing selection email for:', candidate.userId.email);
        
        const emailHtml = generateEmailHTML('selected', {
          candidateName: candidate.userId.fullName,
          jobTitle: job.title,
          companyName: hrUser.companyName || job.company.name,
          feedback: feedback,
          nextSteps: 'Our HR team will contact you shortly with the next steps.'
        });
        
        const emailText = `Dear ${candidate.userId.fullName},

Congratulations! You have been SELECTED for the position of ${job.title} at ${hrUser.companyName || job.company.name}!

${feedback ? `Feedback: ${feedback}` : ''}

Our HR team will contact you shortly with the offer details and next steps.

Welcome to the team!

Best regards,
${hrUser.companyName || job.company.name} Hiring Team`;
        
        await sendEmailFunction({
          to: candidate.userId.email,
          subject: `Congratulations! Selected for ${job.title} - ${hrUser.companyName || job.company.name}`,
          text: emailText,
          html: emailHtml
        });
        
        responseData.communications.email = {
          sent: true,
          to: candidate.userId.email
        };
        
        console.log('✅ Selection email sent successfully');
      } catch (emailError) {
        console.error('❌ Selection email error:', emailError.message);
        responseData.communications.email = {
          sent: false,
          error: emailError.message
        };
      }
    }
    
    res.json({
      status: 'success',
      message: 'Candidate marked as selected successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error('Mark as selected error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error marking candidate as selected',
      error: error.message
    });
  }
};

// Reject Candidate
export const rejectCandidate = async (req, res) => {
  try {
    console.log('=== rejectCandidate called ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    
    const { candidateId } = req.params;
    const {
      jobId,
      reason = 'Not the right fit at this time',
      feedback = 'We encourage you to apply for future positions.',
      sendWhatsApp = true,
      sendEmail = true
    } = req.body;
    
    const hrUser = req.user;
    
    // Validate jobId
    if (!jobId || jobId.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Job ID is required'
      });
    }
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Update candidate
    candidate.status = 'rejected';
    candidate.rejectionDetails = {
      jobId: jobId,
      reason: reason,
      feedback: feedback,
      rejectedBy: hrUser._id,
      rejectedAt: new Date()
    };
    
    await candidate.save();
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'rejection',
      messageType: 'rejected',
      content: `Application rejected for ${job.title}: ${reason}`,
      status: 'sent',
      metadata: candidate.rejectionDetails
    });
    
    await communication.save();
    
    // Prepare response
    const responseData = {
      candidate: {
        name: candidate.userId.fullName,
        email: candidate.userId.email,
        phone: candidate.userId.mobile,
        status: candidate.status
      },
      job: {
        title: job.title,
        company: job.company.name
      },
      communications: {}
    };
    
    // Send WhatsApp
    if (sendWhatsApp && candidate.userId?.mobile) {
      const whatsappMessage = generateWhatsAppMessage('rejected', {
        candidateName: candidate.userId.fullName,
        jobTitle: job.title,
        companyName: hrUser.companyName || job.company.name,
        feedback: feedback
      });
      
      const phoneNumber = formatPhoneNumberForWhatsApp(candidate.userId.mobile);
      if (phoneNumber) {
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        responseData.communications.whatsapp = {
          url: whatsappUrl,
          messagePreview: whatsappMessage.substring(0, 100) + '...',
          sent: true
        };
      }
    }
    
    // Send Email
    if (sendEmail && candidate.userId?.email) {
      try {
        console.log('📧 Preparing rejection email for:', candidate.userId.email);
        
        const emailHtml = generateEmailHTML('rejected', {
          candidateName: candidate.userId.fullName,
          jobTitle: job.title,
          companyName: hrUser.companyName || job.company.name,
          feedback: feedback,
          detailsHtml: `<div class="details-card">
            <h3>Application Status Update:</h3>
            <p><strong>Position:</strong> ${job.title}</p>
            <p><strong>Status:</strong> Not Selected</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
          </div>`,
          nextSteps: 'We encourage you to apply for future opportunities.'
        });
        
        const emailText = `Dear ${candidate.userId.fullName},

Thank you for applying for the position of ${job.title} at ${hrUser.companyName || job.company.name}.

After careful consideration, we have decided to move forward with other candidates at this time.

${feedback ? `Feedback: ${feedback}` : ''}

We encourage you to apply for future opportunities that match your profile.

Best regards,
${hrUser.companyName || job.company.name} Hiring Team`;
        
        await sendEmailFunction({
          to: candidate.userId.email,
          subject: `Update on Your Application: ${job.title} - ${hrUser.companyName || job.company.name}`,
          text: emailText,
          html: emailHtml
        });
        
        responseData.communications.email = {
          sent: true,
          to: candidate.userId.email
        };
        
        console.log('✅ Rejection email sent successfully');
      } catch (emailError) {
        console.error('❌ Rejection email error:', emailError.message);
        responseData.communications.email = {
          sent: false,
          error: emailError.message
        };
      }
    }
    
    res.json({
      status: 'success',
      message: 'Candidate rejected successfully',
      data: responseData
    });
    
  } catch (error) {
    console.error('Reject candidate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error rejecting candidate',
      error: error.message
    });
  }
};

// Send WhatsApp Message (General)
export const sendWhatsAppMessage = async (req, res) => {
  try {
    console.log('=== sendWhatsAppMessage called ===');
    const { candidateId } = req.params;
    const { message, messageType = 'general', jobId } = req.body;
    const hrUser = req.user;
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job if provided
    let job = null;
    if (jobId) {
      job = await Job.findById(jobId);
    }
    
    // Generate WhatsApp message
    const whatsappMessage = generateWhatsAppMessage(messageType, {
      candidateName: candidate.userId.fullName,
      jobTitle: job?.title,
      companyName: hrUser.companyName || job?.company?.name || 'Our Company',
      message: message
    });
    
    // Format phone number
    const phoneNumber = formatPhoneNumberForWhatsApp(candidate.userId.mobile);
    if (!phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format'
      });
    }
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'whatsapp',
      messageType: messageType,
      content: message || whatsappMessage,
      status: 'pending',
      metadata: {
        phoneNumber: candidate.userId.mobile,
        formattedPhoneNumber: phoneNumber,
        whatsappUrl: whatsappUrl
      }
    });
    
    await communication.save();
    
    res.json({
      status: 'success',
      message: 'WhatsApp message prepared successfully',
      data: {
        whatsappUrl,
        communicationId: communication._id,
        candidate: {
          name: candidate.userId.fullName,
          phone: candidate.userId.mobile,
          formattedPhone: phoneNumber
        },
        messagePreview: whatsappMessage.substring(0, 100) + '...'
      }
    });
    
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error preparing WhatsApp message',
      error: error.message
    });
  }
};

// Send Email (General)
export const sendEmailToCandidate = async (req, res) => {
  try {
    console.log('=== sendEmailToCandidate called ===');
    const { candidateId } = req.params;
    const { subject, message, messageType = 'general', jobId } = req.body;
    const hrUser = req.user;
    
    // Get candidate
    const candidate = await Candidate.findById(candidateId)
      .populate('userId', 'fullName email mobile');
    
    if (!candidate || !candidate.userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Candidate not found'
      });
    }
    
    // Get job if provided
    let job = null;
    if (jobId) {
      job = await Job.findById(jobId);
    }
    
    // Generate email subject if not provided
    const emailSubject = subject || `Communication from ${hrUser.companyName || 'Recruitment Team'}`;
    
    // Generate email HTML
    const emailHtml = generateEmailHTML(messageType, {
      candidateName: candidate.userId.fullName,
      jobTitle: job?.title,
      companyName: hrUser.companyName || job?.company?.name || 'Our Company',
      detailsHtml: message ? `<div class="details-card"><p>${message}</p></div>` : ''
    });
    
    const emailText = message || `Dear ${candidate.userId.fullName},

This is a communication from the recruitment team.

Best regards,
${hrUser.companyName || 'Our Company'} Team`;
    
    // Send email
    try {
      console.log('📧 Preparing general email for:', candidate.userId.email);
      await sendEmailFunction({
        to: candidate.userId.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      console.log('✅ General email sent successfully');
    } catch (emailError) {
      console.error('❌ General email error:', emailError.message);
      throw emailError;
    }
    
    // Create communication record
    const communication = new Communication({
      candidateId: candidate._id,
      userId: candidate.userId._id,
      hrUserId: hrUser._id,
      jobId: jobId,
      type: 'email',
      messageType: messageType,
      content: message,
      subject: emailSubject,
      status: 'sent',
      metadata: {
        to: candidate.userId.email
      }
    });
    
    await communication.save();
    
    res.json({
      status: 'success',
      message: 'Email sent successfully',
      data: {
        communicationId: communication._id,
        candidate: {
          name: candidate.userId.fullName,
          email: candidate.userId.email
        }
      }
    });
    
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error sending email',
      error: error.message
    });
  }
};

// Get candidate communications
export const getCandidateCommunications = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { type, limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { candidateId };
    if (type) {
      query.type = type;
    }
    
    const communications = await Communication.find(query)
      .populate('hrUserId', 'fullName email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Communication.countDocuments(query);
    
    res.json({
      status: 'success',
      data: {
        communications,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching communications',
      error: error.message
    });
  }
};

// Add this test function to verify email works
export const testEmail = async (req, res) => {
  try {
    console.log('Testing email service...');
    const testEmail = 'test@example.com'; // Change to your email for testing
    
    await sendEmailFunction({
      to: testEmail,
      subject: 'Test Email from AI Hire Platform',
      text: 'This is a test email to verify the email service is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email service is working.</p>'
    });
    
    res.json({
      status: 'success',
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test email',
      error: error.message
    });
  }
};
