import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  welcome: {
    subject: 'Welcome to AI Hire Platform',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI Hire!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Welcome to AI Hire Platform! Your account has been successfully created.</p>
            <p>We're excited to help you find the perfect job or candidate using our AI-powered matching system.</p>
            <p>Get started by completing your profile to improve your match scores.</p>
            <a href="${data.loginUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Complete Your Profile</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  shortlisted: {
    subject: 'Congratulations! You have been shortlisted',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congratulations! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We're pleased to inform you that you have been shortlisted for the position of <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong>.</p>
            <p>Your application stood out among many others, and we would like to learn more about your qualifications.</p>
            <h3>Next Steps:</h3>
            <ul>
              <li>Our team will contact you shortly to schedule an interview</li>
              <li>Please ensure your contact information is up to date</li>
              <li>Prepare to discuss your experience and skills in detail</li>
            </ul>
            <p>Best regards,<br>${data.companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  interview_scheduled: {
    subject: 'Interview Scheduled',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Interview Scheduled 📅</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Your interview has been scheduled for the <strong>${data.jobTitle}</strong> position.</p>
            
            <div class="details">
              <h3>Interview Details:</h3>
              <p><strong>Date:</strong> ${data.interviewDate}</p>
              <p><strong>Time:</strong> ${data.interviewTime}</p>
              <p><strong>Location/Link:</strong> ${data.interviewLink}</p>
              <p><strong>Interviewer:</strong> ${data.interviewer}</p>
            </div>
            
            <h3>Preparation Tips:</h3>
            <ul>
              <li>Review the job description and requirements</li>
              <li>Prepare examples of your relevant experience</li>
              <li>Research ${data.companyName}</li>
              <li>Prepare questions for the interviewer</li>
              <li>Test your equipment if it's a virtual interview</li>
            </ul>
            
            <p>We look forward to speaking with you!</p>
            <p>Best regards,<br>${data.companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  offer_letter: {
    subject: 'Job Offer Letter',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .offer-details { background: white; padding: 25px; border: 2px solid #4CAF50; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Job Offer Letter 🎉</h1>
          </div>
          <div class="content">
            <h2>Dear ${data.name},</h2>
            <p>On behalf of <strong>${data.companyName}</strong>, we are delighted to offer you the position of <strong>${data.position}</strong>.</p>
            
            <div class="offer-details">
              <h3>Offer Details:</h3>
              <p><strong>Position:</strong> ${data.position}</p>
              <p><strong>Start Date:</strong> ${data.startDate}</p>
              <p><strong>Annual Salary:</strong> ${data.salary}</p>
              <p><strong>Benefits:</strong> ${data.benefits}</p>
            </div>
            
            <p>This offer is contingent upon satisfactory completion of background checks and reference verification.</p>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Review the attached offer letter</li>
              <li>Sign and return the offer letter by ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
              <li>Complete onboarding paperwork</li>
              <li>Prepare for your first day</li>
            </ol>
            
            <p>We believe your skills and experience will be a valuable addition to our team, and we look forward to welcoming you aboard!</p>
            
            <p>Sincerely,<br>${data.companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  rejection: {
    subject: 'Update on Your Application',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .feedback { background: white; padding: 20px; border-left: 4px solid #f44336; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Thank you for your interest in the <strong>${data.position}</strong> position at <strong>${data.companyName}</strong>.</p>
            <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
            
            <div class="feedback">
              <h3>Feedback:</h3>
              <p>${data.feedback}</p>
            </div>
            
            <p>We were impressed with your background and encourage you to apply for future positions that match your skills and experience.</p>
            
            <p>Thank you again for your time and interest in ${data.companyName}.</p>
            
            <p>Best regards,<br>${data.companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  application_submitted: {
    subject: 'Application Submitted Successfully',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .match-score { text-align: center; font-size: 48px; color: #4CAF50; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Submitted! ✅</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Your application for the <strong>${data.jobTitle}</strong> position has been successfully submitted.</p>
            
            <div class="match-score">
              ${data.matchScore}% Match
            </div>
            
            <p>Our AI has analyzed your profile and determined a <strong>${data.matchScore}% match</strong> with this position.</p>
            
            <h3>Next Steps:</h3>
            <ul>
              <li>Our team will review your application</li>
              <li>You will be notified of any updates via email</li>
              <li>Check your application status in your dashboard</li>
            </ul>
            
            <p>Best of luck with your application!</p>
            <p>Sincerely,<br>AI Hire Platform</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Send email function
export const sendEmail = async (options) => {
  try {
    const { to, subject, template, data, attachments } = options;
    
    if (!templates[template]) {
      throw new Error(`Template ${template} not found`);
    }
    
    const templateConfig = templates[template];
    const html = templateConfig.html(data);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@aihire.com',
      to,
      subject: templateConfig.subject,
      html,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send multiple emails
export const sendBulkEmail = async (recipients, options) => {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        ...options,
        to: recipient.email,
        data: { ...options.data, name: recipient.name }
      });
      results.push({ recipient, success: true, result });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }
  
  return results;
};