const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const FROM = `"EstateHub" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

// ── Send enquiry notification to agent ────────────────────────────────────────
const sendEnquiryNotification = async (enquiry, property) => {
  const transporter = createTransporter();
  const viewingInfo = enquiry.preferredViewingDate
    ? `<p><strong>Preferred Viewing:</strong> ${new Date(enquiry.preferredViewingDate).toDateString()} ${enquiry.preferredViewingTime || ''}</p>`
    : '';

  await transporter.sendMail({
    from: FROM,
    to: enquiry.agent.email,
    subject: `🏠 New Lead: Enquiry for "${property.title}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Georgia, serif; background: #f9f6f0; margin:0; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding:32px; text-align:center;">
            <h1 style="color:#d4af37; margin:0; font-size:28px; letter-spacing:2px;">ESTATE<span style="color:#fff">HUB</span></h1>
            <p style="color:#a0a0b0; margin:8px 0 0; font-size:14px;">New Lead Notification</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1a1a2e; margin:0 0 8px;">You have a new enquiry!</h2>
            <p style="color:#666; margin:0 0 24px;">A potential buyer is interested in your listing.</p>
            <div style="background:#f9f6f0; border-left:4px solid #d4af37; padding:20px; border-radius:0 8px 8px 0; margin-bottom:24px;">
              <h3 style="margin:0 0 12px; color:#1a1a2e;">Property</h3>
              <p style="margin:0 0 4px; font-size:18px; font-weight:bold; color:#333;">${property.title}</p>
              <p style="margin:0; color:#666; font-size:14px;">${property.address?.street}, ${property.address?.city}</p>
              <p style="margin:8px 0 0; color:#d4af37; font-size:20px; font-weight:bold;">$${property.price?.toLocaleString()}</p>
            </div>
            <div style="background:#f0f4ff; padding:20px; border-radius:8px; margin-bottom:24px;">
              <h3 style="margin:0 0 12px; color:#1a1a2e;">From</h3>
              <p style="margin:0 0 4px;"><strong>${enquiry.senderName}</strong></p>
              <p style="margin:0 0 4px; color:#666;">📧 ${enquiry.senderEmail}</p>
              ${enquiry.senderPhone ? `<p style="margin:0; color:#666;">📱 ${enquiry.senderPhone}</p>` : ''}
            </div>
            <div style="background:#fff8e8; border:1px solid #f0d078; padding:20px; border-radius:8px; margin-bottom:24px;">
              <h3 style="margin:0 0 12px; color:#1a1a2e;">Message</h3>
              <p style="margin:0; color:#444; line-height:1.7; font-style:italic;">"${enquiry.message}"</p>
            </div>
            ${viewingInfo}
            <div style="text-align:center; margin-top:32px;">
              <a href="${process.env.CLIENT_URL}/agent/enquiries" style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">View in Dashboard →</a>
            </div>
          </div>
          <div style="background:#1a1a2e; padding:16px; text-align:center;">
            <p style="color:#666; margin:0; font-size:12px;">© ${new Date().getFullYear()} EstateHub. You're receiving this because you're a registered agent.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

// ── Send confirmation to buyer/guest ──────────────────────────────────────────
const sendEnquiryConfirmation = async (toEmail, toName, property) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: FROM,
    to: toEmail,
    subject: `✅ Your enquiry for "${property.title}" has been sent`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Georgia, serif; background: #f9f6f0; margin:0; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding:32px; text-align:center;">
            <h1 style="color:#d4af37; margin:0; font-size:28px; letter-spacing:2px;">ESTATE<span style="color:#fff">HUB</span></h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1a1a2e;">Thank you, ${toName}!</h2>
            <p style="color:#666; line-height:1.7;">Your enquiry for <strong>${property.title}</strong> has been successfully sent to the listing agent. They'll be in touch with you shortly.</p>
            <div style="background:#f9f6f0; border-left:4px solid #d4af37; padding:20px; border-radius:0 8px 8px 0; margin:24px 0;">
              <p style="margin:0 0 4px; font-size:16px; font-weight:bold; color:#333;">${property.title}</p>
              <p style="margin:0; color:#666;">${property.address?.street}, ${property.address?.city}</p>
            </div>
            <p style="color:#888; font-size:14px; line-height:1.7;">While you wait, feel free to explore more listings on EstateHub and save the ones you love.</p>
            <div style="text-align:center; margin-top:32px;">
              <a href="${process.env.CLIENT_URL}" style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">Browse More Properties →</a>
            </div>
          </div>
          <div style="background:#1a1a2e; padding:16px; text-align:center;">
            <p style="color:#666; margin:0; font-size:12px;">© ${new Date().getFullYear()} EstateHub</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

// ── Welcome email for new agents ──────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: `Welcome to EstateHub, ${user.firstName}! 🏠`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Georgia, serif; background: #f9f6f0; margin:0; padding:20px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding:32px; text-align:center;">
            <h1 style="color:#d4af37; margin:0; font-size:28px; letter-spacing:2px;">ESTATE<span style="color:#fff">HUB</span></h1>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1a1a2e;">Welcome aboard, ${user.firstName}!</h2>
            <p style="color:#666; line-height:1.7;">
              ${user.role === 'agent'
                ? 'Your agent account is ready. Start listing properties and connecting with buyers today.'
                : 'Your account is set up. Start searching for your dream home!'}
            </p>
            <div style="text-align:center; margin-top:32px;">
              <a href="${process.env.CLIENT_URL}" style="background:#d4af37; color:#1a1a2e; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold;">Get Started →</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  });
};

module.exports = { sendEnquiryNotification, sendEnquiryConfirmation, sendWelcomeEmail };
