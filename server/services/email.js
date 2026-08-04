import nodemailer from 'nodemailer';
import 'dotenv/config';

let cachedTransporter = null;
let etherealAccount = null;

/**
 * Gets or initializes the Nodemailer transport.
 * Uses SMTP settings from process.env if available, or falls back to Ethereal test account.
 */
async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    console.log(`📧 Mail transporter initialized with SMTP (${host}:${port})`);
  } else {
    // Development mode fallback: Create a fake Ethereal test account
    try {
      if (!etherealAccount) {
        etherealAccount = await nodemailer.createTestAccount();
      }
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
      console.log('📧 Mail transporter running in DEV mode using Ethereal Test Account');
      console.log(`   Ethereal Account: ${etherealAccount.user}`);
    } catch (err) {
      console.warn('⚠️ Could not initialize Ethereal test account, fallback to JSON log transporter:', err.message);
      cachedTransporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  return cachedTransporter;
}

/**
 * Sends an authentic HTML project invitation email.
 */
export async function sendProjectInvitationEmail({
  toEmail,
  inviterName,
  inviterEmail,
  projectName,
  projectDescription,
  projectRole = 'member',
  joinUrl,
  isExistingUser = false
}) {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"Project Hub" <noreply@projecthub.com>`;
    const appUrl = joinUrl || process.env.APP_URL || 'http://localhost:5001';

    const roleFormatted = projectRole.charAt(0).toUpperCase() + projectRole.slice(1);
    const subject = `🚀 Project Invitation: Join "${projectName}" on Project Hub`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #1e293b;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          border: 1px solid #334155;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 36px 32px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 8px 0 0 0;
          font-size: 14px;
          color: #e0e7ff;
        }
        .content {
          padding: 32px;
        }
        .greeting {
          font-size: 16px;
          line-height: 1.6;
          color: #cbd5e1;
          margin-bottom: 24px;
        }
        .inviter-card {
          display: flex;
          align-items: center;
          background: #0f172a;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid #334155;
          margin-bottom: 24px;
        }
        .inviter-info {
          font-size: 14px;
          color: #94a3b8;
        }
        .inviter-name {
          font-weight: 700;
          color: #f8fafc;
        }
        .project-card {
          background: rgba(99, 102, 241, 0.1);
          border-left: 4px solid #6366f1;
          border-top: 1px solid #334155;
          border-right: 1px solid #334155;
          border-bottom: 1px solid #334155;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 28px;
        }
        .project-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }
        .project-desc {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
          margin: 0 0 14px 0;
        }
        .badge {
          display: inline-block;
          background: #4f46e5;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .cta-container {
          text-align: center;
          margin: 32px 0 24px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff !important;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
          transition: all 0.2s ease;
        }
        .note {
          font-size: 13px;
          color: #64748b;
          text-align: center;
          line-height: 1.5;
          margin-top: 20px;
        }
        .footer {
          background: #0f172a;
          padding: 20px 32px;
          text-align: center;
          border-top: 1px solid #1e293b;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Project Hub</h1>
          <p>Collaborative Workspace Invitation</p>
        </div>
        <div class="content">
          <div class="greeting">
            Hello,
            <br><br>
            <strong>${inviterName}</strong> (${inviterEmail}) has invited you to collaborate as a <strong>${roleFormatted}</strong> on a project in <strong>Project Hub</strong>.
          </div>

          <div class="project-card">
            <div class="project-title">📁 ${projectName}</div>
            ${projectDescription ? `<div class="project-desc">${projectDescription}</div>` : ''}
            <div>
              <span class="badge">Role: ${roleFormatted}</span>
            </div>
          </div>

          <p class="greeting">
            ${isExistingUser
              ? 'Log in to your Project Hub workspace to start collaborating right away.'
              : 'Create your account using this email address to instantly access the project and start managing tasks.'}
          </p>

          <div class="cta-container">
            <a href="${appUrl}" class="cta-button">
              ${isExistingUser ? 'Open Project Workspace' : 'Accept Invitation & Sign Up'}
            </a>
          </div>

          <div class="note">
            If you did not expect this invitation, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Project Hub. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
    Project Invitation - Project Hub

    Hello,

    ${inviterName} (${inviterEmail}) has invited you to join the project "${projectName}" as a ${roleFormatted}.

    Project Description: ${projectDescription || 'No description provided.'}

    ${isExistingUser
      ? `Open your workspace: ${appUrl}`
      : `Accept your invitation & sign up: ${appUrl}`}

    Best regards,
    The Project Hub Team
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📬 Invitation email sent to ${toEmail}`);
        console.log(`🔗 Preview URL (Ethereal): ${previewUrl}`);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (err) {
    console.error('❌ Failed to send invitation email:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
