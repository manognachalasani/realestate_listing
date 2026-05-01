const nodemailer = require('nodemailer');

// Create transporter once and reuse
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  
  // Verify required environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing. Check EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Add connection pool settings for better performance
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });
  
  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email transporter verification failed:', error);
    } else {
      console.log('✅ Email server is ready to send messages');
    }
  });
  
  return transporter;
};

const FROM = `"EstateHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

// ── Helper: Safe email sending with retry logic ───────────────────────────────
const sendEmailSafely = async (mailOptions, maxRetries = 3) => {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('Cannot send email - no transporter available');
    return { success: false, error: 'Email service not configured' };
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Email attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All email retry attempts failed');
        // Store failed email for later retry (implement queue system)
        return { success: false, error: error.message };
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
};

// ── Base email template ────────────────────────────────────────────────────────
const wrapInTemplate = (content, title = '') => {
  const year = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'EstateHub'}</title>
    </head>
    <body style="font-family: Georgia, serif; background: #f9f6f0; margin:0; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding:32px; text-align:center;">
          <h1 style="color:#d4af37; margin:0; font-size:28px; letter-spacing:2px;">ESTATE<span style="color:#fff">HUB</span></h1>
          ${title ? `<p style="color:#a0a0b0; margin:8px 0 0; font-size:14px;">${title}</p>` : ''}
        </div>
        <div style="padding:32px;">
          ${content}
        </div>
        <div style="background:#1a1a2e; padding:16px; text-align:center;">
          <p style="color:#666; margin:0; font-size:12px;">© ${year} EstateHub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// ── Send enquiry notification to agent ────────────────────────────────────────
const sendEnquiryNotification = async (enquiry, property) => {
  try {
    if (!enquiry?.agent?.email) {
      console.warn('Cannot send enquiry notification - agent email missing');
      return { success: false, error: 'Agent email not available' };
    }
    
    const viewingInfo = enquiry.preferredViewingDate
      ? `<p style="margin:0 0 4px;"><strong>Preferred Viewing:</strong> ${new Date(enquiry.preferredViewingDate).toDateString()} at ${enquiry.preferredViewingTime || 'flexible time'}</p>`
      : '';

    const content = `
      <h2 style="color:#1a1a2e; margin:0 0 8px;">🔔 New Lead Alert!</h2>
      <p style="color:#666; margin:0 0 24px;">A potential buyer is interested in your listing. Respond quickly to increase your chances!</p>
      
      <div style="background:#f9f6f0; border-left:4px solid #d4af37; padding:20px; border-radius:0 8px 8px 0; margin-bottom:24px;">
        <h3 style="margin:0 0 12px; color:#1a1a2e;">🏠 Property Details</h3>
        <p style="margin:0 0 4px; font-size:18px; font-weight:bold; color:#333;">${property?.title || 'N/A'}</p>
        <p style="margin:0; color:#666; font-size:14px;">${property?.address?.street || ''}, ${property?.address?.city || ''}</p>
        ${property?.price ? `<p style="margin:8px 0 0; color:#d4af37; font-size:20px; font-weight:bold;">$${property.price.toLocaleString()}</p>` : ''}
      </div>
      
      <div style="background:#f0f4ff; padding:20px; border-radius:8px; margin-bottom:24px;">
        <h3 style="margin:0 0 12px; color:#1a1a2e;">👤 Contact Information</h3>
        <p style="margin:0 0 4px;"><strong>${enquiry.senderName || 'Potential Buyer'}</strong></p>
        ${enquiry.senderEmail ? `<p style="margin:0 0 4px; color:#666;">📧 ${enquiry.senderEmail}</p>` : ''}
        ${enquiry.senderPhone ? `<p style="margin:0; color:#666;">📱 ${enquiry.senderPhone}</p>` : ''}
      </div>
      
      <div style="background:#fff8e8; border:1px solid #f0d078; padding:20px; border-radius:8px; margin-bottom:24px;">
        <h3 style="margin:0 0 12px; color:#1a1a2e;">💬 Message</h3>
        <p style="margin:0; color:#444; line-height:1.7; font-style:italic;">"${enquiry.message || 'No message provided'}"</p>
      </div>
      
      ${viewingInfo}
      
      <div style="text-align:center; margin-top:32px;">
        <a href="${process.env.CLIENT_URL || '#'}/agent/enquiries" style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px; display:inline-block;">View in Dashboard →</a>
      </div>
      
      <p style="color:#888; font-size:14px; margin-top:24px;">
        Tip: Respond within 24 hours to increase your chances of conversion by 50%.
      </p>
    `;

    const mailOptions = {
      from: FROM,
      to: enquiry.agent.email,
      subject: `🏠 New Lead: Enquiry for "${property?.title || 'your listing'}"`,
      html: wrapInTemplate(content, 'New Lead Notification'),
      // Add tracking pixel for email open tracking (optional)
      // headers: {
      //   'X-Entity-Ref-ID': enquiry._id.toString()
      // }
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendEnquiryNotification:', error);
    return { success: false, error: error.message };
  }
};

// ── Send confirmation to buyer/guest ──────────────────────────────────────────
const sendEnquiryConfirmation = async (toEmail, toName, property) => {
  try {
    if (!toEmail) {
      console.warn('Cannot send enquiry confirmation - recipient email missing');
      return { success: false, error: 'Recipient email not provided' };
    }

    const content = `
      <h2 style="color:#1a1a2e;">Thank you, ${toName || 'there'}! 🎉</h2>
      <p style="color:#666; line-height:1.7;">Your enquiry for <strong>${property?.title || 'the property'}</strong> has been successfully sent to the listing agent. They'll be in touch with you shortly.</p>
      
      <div style="background:#f9f6f0; border-left:4px solid #d4af37; padding:20px; border-radius:0 8px 8px 0; margin:24px 0;">
        <p style="margin:0 0 4px; font-size:16px; font-weight:bold; color:#333;">${property?.title || 'Property'}</p>
        <p style="margin:0; color:#666;">${property?.address?.street || ''}, ${property?.address?.city || ''}</p>
        ${property?.price ? `<p style="margin:8px 0 0; color:#d4af37; font-weight:bold;">$${property.price.toLocaleString()}</p>` : ''}
      </div>
      
      <p style="color:#888; font-size:14px; line-height:1.7;">While you wait, feel free to explore more listings on EstateHub and save the ones you love.</p>
      
      <div style="text-align:center; margin-top:32px;">
        <a href="${process.env.CLIENT_URL || '#'}" style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">Browse More Properties →</a>
      </div>
    `;

    const mailOptions = {
      from: FROM,
      to: toEmail,
      subject: `✅ Your enquiry for "${property?.title || 'the property'}" has been sent`,
      html: wrapInTemplate(content, 'Enquiry Confirmation'),
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendEnquiryConfirmation:', error);
    return { success: false, error: error.message };
  }
};

// ── Welcome email for new users ───────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  try {
    if (!user?.email) {
      console.warn('Cannot send welcome email - user email missing');
      return { success: false, error: 'User email not provided' };
    }

    const isAgent = user.role === 'agent';
    const content = `
      <h2 style="color:#1a1a2e;">Welcome aboard, ${user.firstName || 'there'}! 🎊</h2>
      
      <p style="color:#666; line-height:1.7;">
        ${isAgent
          ? 'Your agent account is ready! Start listing properties, connecting with buyers, and growing your real estate business today.'
          : 'Your account is all set up! Start searching for your dream property and connect with top agents in your area.'}
      </p>
      
      ${isAgent ? `
        <div style="background:#f0f4ff; padding:20px; border-radius:8px; margin:24px 0;">
          <h3 style="margin:0 0 12px; color:#1a1a2e;">🚀 Quick Start Guide:</h3>
          <ol style="margin:0; padding-left:20px; color:#444; line-height:1.8;">
            <li>Complete your agent profile</li>
            <li>Add your first property listing</li>
            <li>Set up notification preferences</li>
            <li>Start receiving leads!</li>
          </ol>
        </div>
      ` : ''}
      
      <div style="text-align:center; margin-top:32px;">
        <a href="${process.env.CLIENT_URL || '#'}${isAgent ? '/agent/dashboard' : '/properties'}" 
           style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
          ${isAgent ? 'Go to Dashboard →' : 'Start Exploring →'}
        </a>
      </div>
    `;

    const mailOptions = {
      from: FROM,
      to: user.email,
      subject: `Welcome to EstateHub, ${user.firstName || 'there'}! 🏠`,
      html: wrapInTemplate(content, 'Welcome'),
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    return { success: false, error: error.message };
  }
};

// ── Send password reset email ─────────────────────────────────────────────────
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    if (!user?.email) {
      console.warn('Cannot send password reset - user email missing');
      return { success: false, error: 'User email not provided' };
    }

    const resetUrl = `${process.env.CLIENT_URL || '#'}/reset-password/${resetToken}`;
    
    const content = `
      <h2 style="color:#1a1a2e;">Password Reset Request 🔐</h2>
      <p style="color:#666; line-height:1.7;">You requested a password reset for your EstateHub account. Click the button below to reset your password:</p>
      
      <div style="text-align:center; margin:32px 0;">
        <a href="${resetUrl}" 
           style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
          Reset Password
        </a>
      </div>
      
      <p style="color:#888; font-size:14px; line-height:1.7;">If you didn't request this password reset, please ignore this email. This link will expire in 10 minutes.</p>
      
      <div style="background:#fff3cd; border:1px solid #f0d078; padding:16px; border-radius:8px; margin-top:24px;">
        <p style="color:#856404; margin:0; font-size:14px;">
          <strong>⚠️ Security Notice:</strong> Never share this link with anyone. EstateHub will never ask for your password via email.
        </p>
      </div>
    `;

    const mailOptions = {
      from: FROM,
      to: user.email,
      subject: 'Password Reset Request - EstateHub',
      html: wrapInTemplate(content, 'Password Reset'),
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error);
    return { success: false, error: error.message };
  }
};

// ── Send email verification ───────────────────────────────────────────────────
const sendEmailVerification = async (user, verificationToken) => {
  try {
    if (!user?.email) {
      console.warn('Cannot send verification - user email missing');
      return { success: false, error: 'User email not provided' };
    }

    const verifyUrl = `${process.env.CLIENT_URL || '#'}/verify-email/${verificationToken}`;
    
    const content = `
      <h2 style="color:#1a1a2e;">Verify Your Email ✉️</h2>
      <p style="color:#666; line-height:1.7;">Thanks for signing up! Please verify your email address to get started:</p>
      
      <div style="text-align:center; margin:32px 0;">
        <a href="${verifyUrl}" 
           style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color:#888; font-size:14px; line-height:1.7;">This link will expire in 24 hours. If you didn't create an account with EstateHub, please ignore this email.</p>
    `;

    const mailOptions = {
      from: FROM,
      to: user.email,
      subject: 'Verify Your Email - EstateHub',
      html: wrapInTemplate(content, 'Email Verification'),
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendEmailVerification:', error);
    return { success: false, error: error.message };
  }
};

// ── Send password changed confirmation ────────────────────────────────────────
const sendPasswordChangedConfirmation = async (user) => {
  try {
    if (!user?.email) {
      return { success: false, error: 'User email not provided' };
    }

    const content = `
      <h2 style="color:#1a1a2e;">Password Changed Successfully 🔒</h2>
      <p style="color:#666; line-height:1.7;">Your EstateHub account password was recently changed. If you made this change, no further action is needed.</p>
      
      <div style="background:#fff3cd; border:1px solid #f0d078; padding:16px; border-radius:8px; margin-top:24px;">
        <p style="color:#856404; margin:0; font-size:14px;">
          <strong>⚠️ Didn't make this change?</strong> Contact our support team immediately or reset your password.
        </p>
      </div>
      
      <div style="text-align:center; margin-top:32px;">
        <a href="${process.env.CLIENT_URL || '#'}/contact" 
           style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
          Contact Support
        </a>
      </div>
    `;

    const mailOptions = {
      from: FROM,
      to: user.email,
      subject: 'Password Changed - EstateHub',
      html: wrapInTemplate(content, 'Security Alert'),
    };

    return await sendEmailSafely(mailOptions);
  } catch (error) {
    console.error('Error in sendPasswordChangedConfirmation:', error);
    return { success: false, error: error.message };
  }
};

// ── Test email configuration ──────────────────────────────────────────────────
const testEmailConfig = async () => {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'No transporter available' };
    }
    
    const result = await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration failed:', error);
    return { success: false, error: error.message };
  }
};

// ── Export all email functions ─────────────────────────────────────────────────
module.exports = { 
  sendEnquiryNotification, 
  sendEnquiryConfirmation, 
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendPasswordChangedConfirmation,
  testEmailConfig,
  getTransporter
};