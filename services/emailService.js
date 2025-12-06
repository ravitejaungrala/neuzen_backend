import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ================== TRANSPORTER CONFIGURATION ==================

// Check if we're on Render.com
const IS_RENDER = process.env.RENDER || process.env.NODE_ENV === 'production';
console.log(`🌍 Environment: ${IS_RENDER ? 'Render.com/Production' : 'Local Development'}`);

// Create transporter with Render.com workarounds
const createTransporter = () => {
  try {
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    
    if (!emailUser || !emailPass) {
      console.log('📧 No SMTP credentials found. Using console logging only.');
      console.log('📧 Emails will be logged to console with OTP visible for testing.');
      return null;
    }

    console.log('📧 Configuring SMTP with credentials...');
    console.log(`📧 Using email: ${emailUser}`);
    
    // Configuration optimized for Render.com
    const smtpConfig = {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true' || false,
      requireTLS: true, // Force TLS for Render.com
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      connectionTimeout: 8000, // 8 second timeout for Render
      greetingTimeout: 8000,
      socketTimeout: 8000
    };

    console.log('📧 SMTP Configuration:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      timeout: '8 seconds'
    });

    const transporter = nodemailer.createTransport(smtpConfig);

    // Test connection in background
    transporter.verify((error, success) => {
      if (error) {
        console.log('⚠️  SMTP Connection Test Failed:', error.message);
        console.log('📧 Using console email logging mode.');
        console.log('📧 OTPs will be displayed in console for testing.');
      } else {
        console.log('✅ SMTP Connection Test Successful!');
        console.log('✅ Real emails will be sent via SMTP.');
      }
    });

    return transporter;
  } catch (error) {
    console.log('📧 Error creating transporter:', error.message);
    console.log('📧 Falling back to console email logging.');
    return null;
  }
};

const transporter = createTransporter();

// ================== MOCK EMAIL FUNCTION ==================

const sendMockEmail = async (mailOptions) => {
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '📧'.repeat(25));
  console.log('📧 EMAIL LOGGED (Development Mode)');
  console.log('📧'.repeat(25));
  console.log(`📧 TO: ${mailOptions.to}`);
  console.log(`📧 FROM: ${mailOptions.from}`);
  console.log(`📧 SUBJECT: ${mailOptions.subject}`);
  console.log(`📧 TIMESTAMP: ${timestamp}`);
  
  // Extract and display OTP if present
  if (mailOptions.html) {
    const otpMatch = mailOptions.html.match(/\d{6}/);
    if (otpMatch) {
      console.log(`🔐 OTP FOR LOGIN: ${otpMatch[0]}`);
      console.log(`📱 Use this code to login as ${mailOptions.to}`);
    }
  }
  
  if (mailOptions.text) {
    const otpMatch = mailOptions.text.match(/\d{6}/);
    if (otpMatch) {
      console.log(`🔐 OTP FOR LOGIN: ${otpMatch[0]}`);
      console.log(`📱 Use this code to login as ${mailOptions.to}`);
    }
  }
  
  console.log('📧'.repeat(25) + '\n');
  
  return {
    messageId: `mock-email-${Date.now()}`,
    response: 'Email logged to console (SMTP unavailable)',
    accepted: [mailOptions.to],
    envelope: {
      from: mailOptions.from,
      to: [mailOptions.to]
    }
  };
};

// ================== INTERNAL EMAIL SENDER ==================

const sendEmailInternal = async (mailOptions) => {
  // Try real SMTP first if transporter exists
  if (transporter) {
    try {
      console.log(`📧 Attempting to send real email to ${mailOptions.to}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Real email sent successfully to ${mailOptions.to}`);
      console.log(`✅ Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope,
        originalInfo: info
      };
    } catch (error) {
      console.log(`⚠️  SMTP failed for ${mailOptions.to}: ${error.message}`);
      console.log('📧 Falling back to console logging...');
    }
  }
  
  // Fallback to mock email
  console.log(`📧 Using console mode for ${mailOptions.to}`);
  const mockInfo = await sendMockEmail(mailOptions);
  
  return {
    success: true, // Considered successful in development mode
    messageId: mockInfo.messageId,
    response: mockInfo.response,
    envelope: mockInfo.envelope,
    simulated: true,
    originalInfo: mockInfo
  };
};

// ================== EMAIL TEMPLATES ==================

const templates = {
  // OTP Template
  otp: {
    subject: (data) => `Your Login OTP: ${data.otp} - AI Hire Platform`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP - AI Hire Platform</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .email-container {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header h2 {
            margin: 10px 0 0;
            font-size: 18px;
            font-weight: normal;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 25px;
            color: #444;
          }
          .otp-container {
            background: linear-gradient(135deg, #f6f8ff 0%, #f0f2ff 100%);
            border: 2px dashed #667eea;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 8px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
          }
          .otp-note {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
          }
          .security-note {
            background: #fff9e6;
            border-left: 4px solid #ffcc00;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .security-note h3 {
            color: #d4a017;
            margin-top: 0;
          }
          .security-note ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .security-note li {
            margin-bottom: 8px;
          }
          .footer {
            text-align: center;
            padding: 25px;
            color: #777;
            font-size: 13px;
            border-top: 1px solid #eee;
            background: #fafafa;
          }
          .footer a {
            color: #667eea;
            text-decoration: none;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.2);
          }
          @media (max-width: 600px) {
            .content {
              padding: 25px 20px;
            }
            .otp-code {
              font-size: 36px;
              letter-spacing: 6px;
            }
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>AI Hire Platform</h1>
            <h2>One-Time Password Verification</h2>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello <strong>${data.name}</strong>,
            </div>
            
            <p>You requested to login to your AI Hire Platform account. Use the following One-Time Password (OTP) to complete your authentication:</p>
            
            <div class="otp-container">
              <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Your verification code:</div>
              <div class="otp-code">${data.otp}</div>
              <div class="otp-note">⏰ Valid for 10 minutes</div>
            </div>
            
            <div style="text-align: center;">
              <a href="https://aihire.com/login" class="button">Login to AI Hire Platform</a>
            </div>
            
            <div class="security-note">
              <h3>🔒 Security Notice</h3>
              <ul>
                <li>Never share this OTP with anyone, including AI Hire support</li>
                <li>This code will expire in 10 minutes for security reasons</li>
                <li>If you didn't request this OTP, please ignore this email</li>
                <li>Your account security is important to us</li>
              </ul>
            </div>
            
            <p>Having trouble with the OTP? You can request a new one from the login page.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>Need help? <a href="https://aihire.com/support">Contact Support</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  // Welcome Template
  welcome: {
    subject: 'Welcome to AI Hire Platform! 🎉',
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
            <a href="${data.loginUrl || 'https://aihire.com/login'}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Complete Your Profile</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AI Hire Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  },
  
  // Shortlisted Template
  shortlisted: {
    subject: 'Congratulations! You have been shortlisted 🎉',
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
  
  // Interview Scheduled Template
  interview_scheduled: {
    subject: 'Interview Scheduled - ${data.jobTitle} 📅',
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
  
  // Offer Letter Template
  offer_letter: {
    subject: 'Job Offer Letter - ${data.position} 🎉',
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
  
  // Rejection Template
  rejection: {
    subject: 'Update on Your Application - ${data.position}',
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
              <p>${data.feedback || 'We were impressed with many aspects of your application and encourage you to apply for future opportunities.'}</p>
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
  
  // Application Submitted Template
  application_submitted: {
    subject: 'Application Submitted Successfully - ${data.jobTitle} ✅',
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
              ${data.matchScore || '85'}% Match
            </div>
            
            <p>Our AI has analyzed your profile and determined a <strong>${data.matchScore || '85'}% match</strong> with this position.</p>
            
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

// ================== MAIN SEND EMAIL FUNCTION ==================

export const sendEmail = async (...args) => {
  try {
    let mailOptions = {};
    
    // Determine which function signature is being used
    if (args.length === 1 && typeof args[0] === 'object') {
      // Old signature: sendEmail({ to, template, data, attachments, subject, html })
      const options = args[0];
      const { to, template, data, attachments, subject, html, text } = options;
      
      if (!to) {
        throw new Error('Recipient email (to) is required');
      }
      
      if (template && templates[template]) {
        // Use predefined template
        const templateConfig = templates[template];
        const templateData = data || {};
        
        // Generate subject (handle both string and function)
        let emailSubject;
        if (typeof templateConfig.subject === 'function') {
          emailSubject = templateConfig.subject(templateData);
        } else {
          emailSubject = templateConfig.subject;
        }
        
        // Replace template variables in subject
        Object.keys(templateData).forEach(key => {
          emailSubject = emailSubject.replace(`\${${key}}`, templateData[key]);
        });
        
        mailOptions = {
          from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `"AI Hire Platform" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
          to,
          subject: emailSubject,
          html: templateConfig.html(templateData),
          attachments,
          text: text || undefined
        };
      } else if (html) {
        // Direct HTML provided
        mailOptions = {
          from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `"AI Hire Platform" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
          to,
          subject: subject || 'Notification from AI Hire Platform',
          html,
          attachments,
          text: text || undefined
        };
      } else {
        throw new Error('Either template or html must be provided');
      }
    } else if (args.length >= 2) {
      // New signature: sendEmail(to, subject, html, text)
      const [to, subject, html, text] = args;
      
      if (!to || !subject || !html) {
        throw new Error('to, subject, and html are required');
      }
      
      mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `"AI Hire Platform" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || undefined
      };
    } else {
      throw new Error('Invalid arguments. Use sendEmail({options}) or sendEmail(to, subject, html, text)');
    }
    
    // Ensure text version for email clients
    if (!mailOptions.text && mailOptions.html) {
      mailOptions.text = mailOptions.html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
    }
    
    console.log(`\n📧 Processing email to: ${mailOptions.to}`);
    console.log(`📧 Subject: ${mailOptions.subject.substring(0, 50)}${mailOptions.subject.length > 50 ? '...' : ''}`);
    
    return await sendEmailInternal(mailOptions);
  } catch (error) {
    console.error('❌ Error in sendEmail function:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      code: 'SEND_EMAIL_ERROR'
    };
  }
};

// ================== SPECIALIZED EMAIL FUNCTIONS ==================

export const sendOTPEmail = async (to, name, otp) => {
  console.log(`\n🔐 OTP REQUEST FOR: ${to}`);
  console.log(`👤 User: ${name}`);
  console.log(`🔢 OTP Code: ${otp}`);
  console.log('📱 This code can be used for login');
  
  const result = await sendEmail({
    to,
    template: 'otp',
    data: { name, otp }
  });
  
  // Always display OTP in console for development/testing
  if (result.success) {
    console.log(`✅ OTP email processed for ${to}`);
    if (result.simulated) {
      console.log(`📱 DEVELOPMENT MODE - Use OTP: ${otp} to login`);
    }
  } else {
    console.log(`❌ OTP email failed for ${to}`);
    // Still show OTP in console even if email fails
    console.log(`📱 FALLBACK OTP: ${otp} (use this to login)`);
  }
  
  return result;
};

export const sendWelcomeEmail = async (to, name) => {
  console.log(`\n🎉 Sending welcome email to: ${to}`);
  console.log(`👤 New user: ${name}`);
  
  const result = await sendEmail({
    to,
    template: 'welcome',
    data: { name, loginUrl: 'https://aihire.com/login' }
  });
  
  if (result.success) {
    console.log(`✅ Welcome email processed for ${to}`);
  } else {
    console.log(`⚠️  Welcome email may have failed for ${to}`);
  }
  
  return result;
};

export const sendApplicationSubmittedEmail = async (to, name, jobTitle, matchScore = 85) => {
  return await sendEmail({
    to,
    template: 'application_submitted',
    data: { name, jobTitle, matchScore }
  });
};

export const sendShortlistedEmail = async (to, name, jobTitle, companyName) => {
  return await sendEmail({
    to,
    template: 'shortlisted',
    data: { name, jobTitle, companyName }
  });
};

export const sendInterviewScheduledEmail = async (to, name, jobTitle, companyName, interviewDate, interviewTime, interviewLink, interviewer) => {
  return await sendEmail({
    to,
    template: 'interview_scheduled',
    data: { name, jobTitle, companyName, interviewDate, interviewTime, interviewLink, interviewer }
  });
};

// ================== BULK EMAIL FUNCTION ==================

export const sendBulkEmail = async (recipients, options) => {
  const results = [];
  console.log(`📧 Starting bulk email to ${recipients.length} recipients`);
  
  for (const recipient of recipients) {
    try {
      const recipientOptions = {
        ...options,
        to: recipient.email,
        data: { 
          ...options.data, 
          name: recipient.name || recipient.email.split('@')[0]
        }
      };
      
      const result = await sendEmail(recipientOptions);
      results.push({
        recipient: recipient.email,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        recipient: recipient.email,
        success: false,
        error: error.message
      });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`📧 Bulk email completed: ${successful} successful, ${failed} failed`);
  
  return {
    total: recipients.length,
    successful,
    failed,
    results
  };
};

// ================== TEST FUNCTION ==================

export const testEmailConnection = async () => {
  console.log('\n🔍 Testing email service configuration...');
  console.log(`🔍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔍 SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
  console.log(`🔍 SMTP Port: ${process.env.SMTP_PORT || 'Not set'}`);
  console.log(`🔍 SMTP User: ${process.env.SMTP_USER ? 'Set (hidden)' : 'Not set'}`);
  console.log(`🔍 SMTP From: ${process.env.SMTP_FROM || 'Not set'}`);
  
  const testEmail = process.env.SMTP_USER || 'test@example.com';
  const testOTP = '123456';
  
  console.log(`\n🧪 Testing with email: ${testEmail}`);
  console.log(`🧪 Test OTP: ${testOTP}`);
  
  try {
    const testResult = await sendOTPEmail(testEmail, 'Test User', testOTP);
    
    if (testResult.success) {
      if (testResult.simulated) {
        console.log('✅ Email service is working in DEVELOPMENT/CONSOLE mode');
        console.log('📧 Emails are logged to console with OTP visible');
      } else {
        console.log('✅ Email service is working in PRODUCTION/SMTP mode');
        console.log('📧 Real emails are being sent via SMTP');
      }
      return true;
    } else {
      console.log('⚠️  Email service test completed with warnings');
      console.log(`⚠️  Error: ${testResult.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    return false;
  }
};

// ================== EMAIL TEMPLATES FOR AUTH CONTROLLER ==================

export const EmailTemplates = {
  OTP: (name, otp) => templates.otp.html({ name, otp }),
  WELCOME: (name) => templates.welcome.html({ name, loginUrl: 'https://aihire.com/login' })
};

// ================== DEFAULT EXPORT ==================

export default {
  // Core functions
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendBulkEmail,
  
  // Specialized functions
  sendApplicationSubmittedEmail,
  sendShortlistedEmail,
  sendInterviewScheduledEmail,
  
  // Utility functions
  testEmailConnection,
  
  // Templates
  EmailTemplates,
  
  // Transporter (for advanced use)
  transporter,
  
  // Template access
  templates
};
