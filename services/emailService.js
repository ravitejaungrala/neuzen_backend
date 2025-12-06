import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object
const createTransporter = () => {
  try {
    // Check if we have SMTP configuration - using old env variable names as fallback
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      console.log('❌ Email credentials missing. Using console logging only.');
      return null;
    }

    console.log('📧 Configuring Email SMTP...');
    console.log('📧 Using email:', emailUser);
    
    // Create transporter with configuration - using old values as fallback
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 465,
      secure: process.env.EMAIL_SECURE === 'true' || true, // Use SSL
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection Error:', error);
      } else {
        console.log('✅ SMTP Server is ready to send emails');
      }
    });

    return transporter;
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

// Email templates from old service (keeping the exact same structure)
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
  },

  // OTP template added to main templates object
  otp: {
    subject: (data) => `Login OTP: ${data.otp} - AI Hire Platform`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Hire Platform</h1>
          <h2>Login Verification</h2>
        </div>
        <div class="content">
          <p>Hello <strong>${data.name}</strong>,</p>
          <p>Your OTP for login is:</p>
          <div class="otp">${data.otp}</div>
          <p>This OTP is valid for 10 minutes.</p>
          <p><strong>Security Tip:</strong> Never share this OTP with anyone.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }
};

// Updated sendEmail function that handles BOTH old and new signatures
export const sendEmail = async (...args) => {
  try {
    // Determine which signature is being used
    let options;
    
    if (args.length === 1 && typeof args[0] === 'object') {
      // Old signature: sendEmail({ to, template, data, attachments })
      options = args[0];
    } else if (args.length >= 2) {
      // New signature: sendEmail(to, subject, html, text)
      const [to, subject, html, text] = args;
      options = { 
        to, 
        subject, 
        html, 
        text,
        // Convert new signature to old format
        data: { html, subject }
      };
    } else {
      throw new Error('Invalid arguments passed to sendEmail');
    }
    
    const { to, subject, template, data, attachments, html: directHtml, text } = options;
    
    // Check if template exists
    let htmlContent;
    let emailSubject;
    
    if (template && templates[template]) {
      // Use template from old service
      const templateConfig = templates[template];
      htmlContent = templateConfig.html(data);
      emailSubject = typeof templateConfig.subject === 'function' 
        ? templateConfig.subject(data) 
        : templateConfig.subject;
    } else if (directHtml) {
      // Use direct HTML if provided (new signature)
      htmlContent = directHtml;
      emailSubject = subject || 'Notification from AI Hire Platform';
    } else {
      // For backward compatibility, try to auto-detect OTP
      if (data && data.otp && data.name) {
        console.log('⚠️  Using auto-generated OTP email');
        htmlContent = templates.otp.html(data);
        emailSubject = templates.otp.subject(data);
      } else if (data && data.html) {
        // If data contains html, use it
        htmlContent = data.html;
        emailSubject = data.subject || subject || 'Notification from AI Hire Platform';
      } else {
        throw new Error(`Template ${template} not found and no HTML provided`);
      }
    }
    
    if (!transporter) {
      console.log(`📧 [NO TRANSPORTER] Email would be sent to: ${to}`);
      console.log(`📧 Subject: ${emailSubject}`);
      console.log(`📧 Template: ${template || 'direct'}`);
      return { 
        success: false, 
        message: 'No email transporter configured',
        simulated: true 
      };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"AI Hire Platform" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject: emailSubject,
      html: htmlContent,
      attachments,
      text: text || htmlContent.replace(/<[^>]*>/g, '') // Convert HTML to text
    };
    
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${emailSubject}`);
    console.log(`📧 Template: ${template || 'direct'}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`✅ Message ID: ${info.messageId}`);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response,
      originalInfo: info // Keep original return for backward compatibility
    };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    // Enhanced error logging from new service
    if (error.code === 'EAUTH') {
      console.error('❌ Authentication failed. Check email/password.');
      console.error('❌ Make sure you\'re using an App Password, not your regular password.');
    } else if (error.code === 'ECONNECTION') {
      console.error('❌ Connection failed. Check network/firewall.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Connection timeout. Check SMTP settings.');
    }
    
    throw error; // Keep original error throwing for backward compatibility
  }
};

// Special function for sending OTP emails (used by authController)
export const sendOTPEmail = async (to, name, otp) => {
  try {
    const result = await sendEmail({
      to,
      template: 'otp',
      data: { name, otp }
    });
    return result;
  } catch (error) {
    console.error('❌ OTP email sending failed:', error);
    throw error;
  }
};

// New sendEmail function from new service (as a helper function)
export const sendDirectEmail = async (to, subject, html, text = '') => {
  try {
    if (!transporter) {
      console.log(`📧 [NO TRANSPORTER] Email would be sent to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 OTP in HTML: ${html.match(/\d{6}/)?.[0] || 'Not found'}`);
      return { success: false, message: 'No email transporter configured' };
    }

    const mailOptions = {
      from: `"AI Hire Platform" <${process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    console.log(`📧 Attempting to send direct email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Direct email sent successfully to ${to}`);
    console.log(`✅ Message ID: ${info.messageId}`);
    
    return { 
      success: true, 
      messageId: info.messageId,
      response: info.response 
    };
  } catch (error) {
    console.error('❌ Direct email sending failed:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

// Send multiple emails function from old service (unchanged)
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

// New test email function
export const testEmailConnection = async () => {
  console.log('🔍 Testing email configuration...');
  console.log(`🔍 SMTP Host: ${process.env.SMTP_HOST || process.env.EMAIL_HOST}`);
  console.log(`🔍 SMTP Port: ${process.env.SMTP_PORT || process.env.EMAIL_PORT}`);
  console.log(`🔍 SMTP User: ${process.env.SMTP_USER || process.env.EMAIL_USER}`);
  console.log(`🔍 SMTP From: ${process.env.SMTP_FROM || process.env.EMAIL_FROM}`);
  
  if (!transporter) {
    console.log('❌ No email transporter available');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send a test email using the old sendEmail function
    const testResult = await sendEmail({
      to: process.env.SMTP_USER || process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email from AI Hire Platform',
      template: 'welcome',
      data: {
        name: 'Test User',
        loginUrl: 'https://aihire.com/dashboard'
      }
    });
    
    if (testResult.success || testResult.originalInfo) {
      console.log('✅ Test email sent successfully');
    } else {
      console.log('❌ Test email failed:', testResult.error || testResult.message);
    }
    
    return testResult.success || !!testResult.originalInfo;
  } catch (error) {
    console.error('❌ Email test failed:', error);
    return false;
  }
};

// Export EmailTemplates for external use (this is what your authController is using)
export const EmailTemplates = {
  OTP: (name, otp) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .otp { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; letter-spacing: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AI Hire Platform</h1>
        <h2>Login Verification</h2>
      </div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your OTP for login is:</p>
        <div class="otp">${otp}</div>
        <p>This OTP is valid for 10 minutes.</p>
        <p><strong>Security Tip:</strong> Never share this OTP with anyone.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `,
  
  WELCOME: (name) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Welcome to AI Hire Platform!</h1>
      </div>
      <div class="content">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Welcome to AI Hire Platform - your AI-powered hiring platform!</p>
        <p>We're excited to have you on board. Start exploring:</p>
        <ul>
          <li>AI-powered candidate matching</li>
          <li>Automated resume screening</li>
          <li>Smart analytics and insights</li>
        </ul>
        <p>If you need help getting started, check out our documentation or contact support.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
};

// Default export for backward compatibility
export default {
  sendEmail,          // Original function signature
  sendDirectEmail,    // New function signature
  sendBulkEmail,      // Bulk email function
  testEmailConnection, // Test function
  EmailTemplates,     // All templates
  transporter,        // Transporter instance
  sendOTPEmail        // Special OTP email function
};
