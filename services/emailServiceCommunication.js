// backend/services/emailServiceCommunication.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Email templates object
const templates = {
  interview_scheduled: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #FF6B35, #FFA500); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Interview Scheduled!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          <p>Congratulations! You have been shortlisted for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
          
          <div class="details">
            <h3>📅 Interview Details:</h3>
            <p><strong>Date:</strong> ${data.interviewDate}</p>
            <p><strong>Time:</strong> ${data.interviewTime}</p>
            <p><strong>Type:</strong> ${data.interviewType}</p>
            ${data.interviewType === 'offline' ? `<p><strong>Location:</strong> ${data.location}</p>` : `<p><strong>Platform:</strong> Virtual Meeting (Link will be shared separately)</p>`}
            <p><strong>Duration:</strong> ${data.duration} minutes</p>
            <p><strong>Interviewer:</strong> ${data.interviewer}</p>
            
            <h4>📋 Requirements:</h4>
            <p>${data.requirements}</p>
            
            <h4>📄 Documents to bring:</h4>
            <p>${data.documents}</p>
          </div>
          
          <p>${data.preparationTips}</p>
          
          <p>Best regards,<br>
          ${data.companyName} Hiring Team</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  offer_letter: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .offer-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #28a745; }
        .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Job Offer!</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          <p>Congratulations! We are pleased to offer you the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
          
          <div class="offer-details">
            <h3>💰 Offer Details:</h3>
            <p><strong>Salary:</strong> ${data.salary}</p>
            <p><strong>Joining Date:</strong> ${data.joiningDate}</p>
            <p><strong>Benefits:</strong> ${data.benefits}</p>
            <p><strong>Notice Period:</strong> ${data.noticePeriod}</p>
            ${data.offerLetterUrl ? `<p><strong>Offer Letter:</strong> <a href="${data.offerLetterUrl}">Download Offer Letter</a></p>` : ''}
          </div>
          
          <p>Please confirm your acceptance by <strong>${data.deadline}</strong>.</p>
          
          ${data.offerLetterUrl ? `
          <p style="text-align: center; margin: 30px 0;">
            <a href="${data.offerLetterUrl}" class="button">📄 View Offer Letter</a>
          </p>
          ` : ''}
          
          <p>We are excited to have you join our team!</p>
          
          <p>Best regards,<br>
          ${data.companyName} Hiring Team<br>
          Contact: ${data.hrContact}</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  task_assigned: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff, #6610f2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .task-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #007bff; }
        .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .urgent { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Task Assigned</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          <p>You have been assigned a task as part of the recruitment process for <strong>${data.jobTitle}</strong>.</p>
          
          <div class="task-details">
            <h3>📝 Task Details:</h3>
            <p><strong>Task Title:</strong> ${data.taskTitle}</p>
            <p><strong>Description:</strong> ${data.taskDescription}</p>
            <p><strong>Deadline:</strong> ${data.deadline}</p>
            <p><strong>Submission Type:</strong> ${data.submissionType}</p>
            
            <h4>📋 Requirements:</h4>
            <p>${data.requirements}</p>
            
            <h4>📄 Instructions:</h4>
            <p>${data.instructions}</p>
          </div>
          
          <p class="urgent">⚠️ Please complete and submit this task before the deadline.</p>
          
          <p>Best regards,<br>
          ${data.companyName} Recruitment Team</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  rejection: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6c757d, #495057); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feedback-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #6c757d; }
        .encouragement { color: #28a745; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Update on Your Application</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          <p>Thank you for taking the time to apply for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.</p>
          
          <div class="feedback-box">
            <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
            
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
            
            ${data.feedback ? `
            <h4>📝 Feedback:</h4>
            <p>${data.feedback}</p>
            ` : ''}
          </div>
          
          <p class="encouragement">💡 We encourage you to apply for future opportunities that match your skills and experience.</p>
          
          <p>We appreciate your interest in our company and wish you the best in your job search.</p>
          
          <p>Best regards,<br>
          ${data.companyName} Hiring Team</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  notification: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #17a2b8, #20c997); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Notification: ${data.type ? data.type.replace('_', ' ').toUpperCase() : 'Update'}</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          
          <div class="message-box">
            <p>${data.message || data.whatsappMessage || 'You have a new notification from the recruitment team.'}</p>
            
            ${data.jobTitle ? `<p><strong>Position:</strong> ${data.jobTitle}</p>` : ''}
            ${data.interviewDate ? `<p><strong>Interview Date:</strong> ${data.interviewDate}</p>` : ''}
            ${data.interviewTime ? `<p><strong>Interview Time:</strong> ${data.interviewTime}</p>` : ''}
          </div>
          
          <p>Best regards,<br>
          ${data.companyName} Recruitment Team<br>
          ${data.hrName ? `Contact: ${data.hrName}` : ''}</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  general: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6f42c1, #6610f2); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${data.subject || 'Communication'}</h1>
        </div>
        <div class="content">
          <p>Dear ${data.candidateName},</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${data.message || data.content || 'This is a communication from the recruitment team.'}
          </div>
          
          <p>Best regards,<br>
          ${data.companyName} Recruitment Team<br>
          ${data.hrName ? `Contact: ${data.hrName}` : ''}</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// Email transporter configuration
const createTransporter = () => {
  // Use environment variables for email configuration
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Main email sending function
export const sendEmail = async ({ to, subject, template = 'general', data = {}, attachments = [] }) => {
  try {
    // Create transporter
    const transporter = createTransporter();
    
    // Get template HTML
    const templateFunction = templates[template] || templates.general;
    const html = templateFunction(data);
    
    // Prepare email options
    const mailOptions = {
      from: `"${data.companyName || 'Recruitment Team'}" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: html,
    };
    
    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(attachment => {
        if (attachment.path) {
          // File path attachment
          return {
            filename: attachment.filename || path.basename(attachment.path),
            path: attachment.path
          };
        } else if (attachment.content) {
          // Buffer attachment
          return {
            filename: attachment.filename,
            content: attachment.content,
            encoding: attachment.encoding || 'base64'
          };
        }
        return attachment;
      });
    }
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email server connection successful');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};

// Send bulk emails
export const sendBulkEmails = async (recipients, subject, template, data) => {
  try {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await sendEmail({
          to: recipient.email,
          subject: subject.replace('{name}', recipient.name),
          template: template,
          data: { ...data, candidateName: recipient.name }
        });
        results.push({ recipient, success: true, result });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Bulk email sending error:', error);
    throw error;
  }
};

// Export templates as well if needed
export { templates };

export default {
  sendEmail,
  testEmailConnection,
  sendBulkEmails,
  templates
};