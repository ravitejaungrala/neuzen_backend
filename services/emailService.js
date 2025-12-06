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
      // Try Gmail with OAuth2 first (most reliable if you set it up)
      {
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailUser,
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN
        },
        tls: { rejectUnauthorized: false }
      },
      // Try with App Password (your current setup)
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

    // Try each configuration
    for (const config of gmailConfigs) {
      try {
        // Skip OAuth2 if credentials not set
        if (config.auth.type === 'OAuth2' && 
            (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN)) {
          continue;
        }

        console.log(`📧 Trying Gmail config: ${config.service || config.host}:${config.port}`);
        
        transporter = nodemailer.createTransport(config);
        
        // Quick connection test
        await new Promise((resolve, reject) => {
          transporter.verify((error, success) => {
            if (error) {
              lastError = error;
              reject(error);
            } else {
              console.log(`✅ Gmail connection successful with ${config.service || config.host}:${config.port}`);
              resolve(success);
            }
          });
        });
        
        break; // Stop if successful
      } catch (error) {
        lastError = error;
        console.log(`❌ Gmail config failed: ${config.service || config.host}:${config.port} - ${error.message}`);
        continue;
      }
    }

    if (!transporter) {
      console.log('❌ All Gmail configurations failed. Using console mode.');
      console.log('💡 Last error:', lastError?.message);
      console.log('🔧 On Render.com free tier, SMTP is blocked. Consider:');
      console.log('   1. Using SendGrid/Mailgun (free tiers allow SMTP)');
      console.log('   2. Upgrading Render plan');
      console.log('   3. Using console mode for development');
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
  console.log('📧 EMAIL LOGGED (Gmail SMTP Blocked on Render)');
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
    response: 'Email logged to console (Gmail SMTP blocked on Render free tier)'
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
        via: 'gmail'
      };
    } catch (error) {
      console.log(`❌ Gmail failed: ${error.message}`);
    }
  }
  
  // Fallback to mock
  console.log(`📧 Using console mode (Gmail blocked)`);
  const mockInfo = await sendMockEmail(mailOptions);
  return {
    success: true,
    messageId: mockInfo.messageId,
    via: 'console',
    simulated: true
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
  }
};

// ================== EXPORTED FUNCTIONS ==================
export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html
  };
  
  return await sendEmailInternal(mailOptions);
};

export const sendOTPEmail = async (to, name, otp) => {
  console.log(`\n🔐 OTP FOR: ${to}`);
  console.log(`👤 User: ${name}`);
  console.log(`🔢 OTP: ${otp}`);
  
  const result = await sendEmail(
    to,
    `Your Login OTP: ${otp}`,
    templates.otp.html({ name, otp })
  );
  
  if (result.via === 'console') {
    console.log(`📱 USE THIS OTP TO LOGIN: ${otp}`);
  }
  
  return result;
};

export const testEmailConnection = async () => {
  console.log('🔍 Testing Gmail connection...');
  
  if (!transporter) {
    console.log('❌ Gmail not configured or blocked by Render');
    console.log('📧 Using console mode for emails');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    return true;
  } catch (error) {
    console.log('❌ Gmail connection failed:', error.message);
    console.log('📧 Emails will be logged to console');
    return false;
  }
};

export const EmailTemplates = {
  OTP: (name, otp) => templates.otp.html({ name, otp }),
  WELCOME: (name) => `Welcome ${name}!`
};

export default {
  sendEmail,
  sendOTPEmail,
  testEmailConnection,
  EmailTemplates
};
