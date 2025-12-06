import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ================== TRANSPORTER CONFIGURATION ==================
const IS_RENDER = process.env.RENDER || process.env.NODE_ENV === 'production';

const createTransporter = () => {
  try {
    const emailUser = process.env.SMTP_USER;
    const emailPass = process.env.SMTP_PASS;
    
    if (!emailUser || !emailPass) {
      console.log('📧 No Gmail credentials found. Using console mode.');
      return null;
    }

    console.log('📧 Configuring Gmail SMTP...');
    
    // Multiple Gmail configurations to try
    const gmailConfigs = [
      // Try Gmail with App Password (your current setup)
      {
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: { rejectUnauthorized: false }
      },
      // Alternative SMTP settings
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: { rejectUnauthorized: false }
      },
      // SSL alternative
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: { rejectUnauthorized: false }
      }
    ];

    let transporter = null;
    let lastError = null;

    // Create transporter without async verification
    for (const config of gmailConfigs) {
      try {
        console.log(`📧 Trying Gmail config: ${config.service || config.host}:${config.port}`);
        
        transporter = nodemailer.createTransport(config);
        
        // Test connection without blocking
        transporter.verify((error, success) => {
          if (error) {
            console.log(`❌ Gmail config ${config.service || config.host}:${config.port} failed: ${error.message}`);
            lastError = error;
          } else {
            console.log(`✅ Gmail connection successful with ${config.service || config.host}:${config.port}`);
          }
        });
        
        // Use first transporter that creates successfully
        if (transporter) {
          console.log(`✅ Using Gmail config: ${config.service || config.host}:${config.port}`);
          break;
        }
      } catch (error) {
        lastError = error;
        console.log(`❌ Failed to create transporter for ${config.service || config.host}:${config.port}`);
        continue;
      }
    }

    if (!transporter) {
      console.log('❌ All Gmail configurations failed. Using console mode.');
      console.log('💡 On Render.com free tier, SMTP is blocked.');
      console.log('📧 Emails will be logged to console for testing.');
      return null;
    }

    return transporter;
  } catch (error) {
    console.log('📧 Error creating Gmail transporter:', error.message);
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
  
  // Extract and display OTP
  if (mailOptions.html) {
    const otpMatch = mailOptions.html.match(/\d{6}/);
    if (otpMatch) {
      console.log(`🔐 OTP FOR LOGIN: ${otpMatch[0]}`);
      console.log(`📱 Use this code to login immediately`);
    }
  }
  
  console.log('📧'.repeat(25) + '\n');
  
  return {
    messageId: `mock-${Date.now()}`,
    response: 'Email logged to console'
  };
};

// ================== MAIN EMAIL SENDING ==================
const sendEmailInternal = async (mailOptions) => {
  // Try Gmail if available
  if (transporter) {
    try {
      console.log(`📧 Attempting to send via Gmail to ${mailOptions.to}...`);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Gmail email sent successfully!`);
      console.log(`✅ Message ID: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
        via: 'gmail',
        response: info.response
      };
    } catch (error) {
      console.log(`❌ Gmail failed: ${error.message}`);
      console.log(`📧 Falling back to console mode...`);
    }
  }
  
  // Fallback to mock
  console.log(`📧 Using console mode for ${mailOptions.to}`);
  const mockInfo = await sendMockEmail(mailOptions);
  return {
    success: true,
    messageId: mockInfo.messageId,
    via: 'console',
    simulated: true,
    response: mockInfo.response
  };
};

// ================== EMAIL TEMPLATES ==================
const templates = {
  otp: {
    subject: (data) => `Your Login OTP: ${data.otp}`,
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .otp-box { background: white; padding: 25px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px dashed #4f46e5; }
          .otp { font-size: 42px; font-weight: bold; color: #4f46e5; letter-spacing: 10px; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Hire Platform</h1>
          <h2>Login Verification Code</h2>
        </div>
        <div class="content">
          <p>Hello <strong>${data.name}</strong>,</p>
          <p>Use the following OTP to complete your login:</p>
          <div class="otp-box">
            <div class="otp">${data.otp}</div>
            <p style="margin-top: 15px; color: #6b7280;">Valid for 10 minutes</p>
          </div>
          <p><strong>Security Notice:</strong> Never share this OTP with anyone.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AI Hire Platform.</p>
        </div>
      </body>
      </html>
    `
  },
  
  welcome: {
    subject: 'Welcome to AI Hire Platform!',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
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
            <a href="${data.loginUrl || 'https://aihire.com/login'}" style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Complete Your Profile</a>
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

// ================== EXPORTED FUNCTIONS ==================
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@aihire.com',
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, '') // Plain text version
    };
    
    return await sendEmailInternal(mailOptions);
  } catch (error) {
    console.error('❌ Error in sendEmail:', error.message);
    return {
      success: false,
      error: error.message,
      via: 'error'
    };
  }
};

export const sendOTPEmail = async (to, name, otp) => {
  console.log(`\n🔐 OTP REQUEST`);
  console.log(`📧 To: ${to}`);
  console.log(`👤 User: ${name}`);
  console.log(`🔢 OTP Code: ${otp}`);
  
  const result = await sendEmail(
    to,
    `Your Login OTP: ${otp}`,
    templates.otp.html({ name, otp })
  );
  
  if (result.success) {
    console.log(`✅ OTP email processed successfully`);
    if (result.via === 'console') {
      console.log(`📱 USE THIS OTP TO LOGIN: ${otp}`);
    }
  } else {
    console.log(`❌ OTP email failed: ${result.error}`);
    // Still show OTP in console
    console.log(`📱 FALLBACK OTP: ${otp} (use this to login)`);
  }
  
  return result;
};

export const sendWelcomeEmail = async (to, name) => {
  console.log(`\n🎉 Sending welcome email to: ${to}`);
  
  const result = await sendEmail(
    to,
    'Welcome to AI Hire Platform!',
    templates.welcome.html({ name, loginUrl: 'https://aihire.com/login' })
  );
  
  if (result.success) {
    console.log(`✅ Welcome email processed`);
  } else {
    console.log(`⚠️ Welcome email may have failed`);
  }
  
  return result;
};

export const testEmailConnection = async () => {
  console.log('🔍 Testing email configuration...');
  
  if (!transporter) {
    console.log('❌ Gmail transporter not available');
    console.log('📧 Using console mode for emails');
    return false;
  }
  
  try {
    // Test with a simple email
    const testResult = await sendEmail(
      process.env.SMTP_USER,
      'Test Email from AI Hire',
      '<h1>Test Email</h1><p>This is a test email.</p>'
    );
    
    return testResult.success;
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    return false;
  }
};

// ================== COMPATIBILITY FUNCTIONS ==================
// For backward compatibility with auth controller
export const EmailTemplates = {
  OTP: (name, otp) => templates.otp.html({ name, otp }),
  WELCOME: (name) => templates.welcome.html({ name, loginUrl: 'https://aihire.com/login' })
};

// ================== DEFAULT EXPORT ==================
export default {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  testEmailConnection,
  EmailTemplates,
  transporter
};
