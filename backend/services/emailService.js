/**
 * Email Service
 * Handles all email sending using SMTP configuration
 */
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'mail.bsint.net';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'telemetryalerts@bsint.net';
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
const SMTP_FROM = process.env.SMTP_FROM || 'telemetryalerts@bsint.net';
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'BSI Telemetry';
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // Default true for port 465

// BSI Brand Colors
const BSI_COLORS = {
  primary: '#0099ff',
  light: '#ccebff',
  dark: '#004d80',
  white: '#ffffff',
  gray: '#f5f5f5',
  text: '#333333'
};

// Create transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    });

    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        logger.error('SMTP connection failed:', error.message || error);
      } else {
        logger.info('SMTP server ready to send emails');
      }
    });
  }
  return transporter;
}

/**
 * Read and encode logo for inline attachment
 */
function getLogoAttachment() {
  try {
    const logoPath = path.join(__dirname, '../../frontend/public/bsi logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      return {
        filename: 'bsi-logo.png',
        content: logoData,
        cid: 'bsi-logo@telemetry.bsi',
        contentType: 'image/png'
      };
    }
  } catch (error) {
    logger.error('Error reading logo:', error);
  }
  return null;
}

/**
 * Generate professional email HTML template
 */
function generateEmailTemplate({ subject, greeting, message, footer, reportName, scheduleName }) {
  const logoAttachment = getLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${logoAttachment.cid}` : '';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${BSI_COLORS.gray};
      color: ${BSI_COLORS.text};
      line-height: 1.6;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${BSI_COLORS.white};
    }
    
    .header {
      padding: 30px 40px;
      text-align: center;
      background-color: #f8f9fa;
    }

    .header img {
      max-width: 240px;
      height: auto;
      display: block;
      margin: 0 auto 15px;
    }
    
    .header-title {
      color: ${BSI_COLORS.dark};
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.5px;
    }
    
    .header-subtitle {
      color: ${BSI_COLORS.gray};
      font-size: 14px;
      margin-top: 8px;
      font-weight: 400;
    }
    
    .content {
      padding: 40px;
    }
    
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: ${BSI_COLORS.dark};
      margin-bottom: 20px;
    }
    
    .message-box {
      background-color: ${BSI_COLORS.light};
      border-left: 4px solid ${BSI_COLORS.primary};
      padding: 20px;
      margin: 25px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .message-box p {
      margin: 0;
      color: ${BSI_COLORS.dark};
      font-size: 15px;
    }
    
    .report-info {
      background-color: ${BSI_COLORS.gray};
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    
    .report-info h3 {
      margin: 0 0 15px 0;
      color: ${BSI_COLORS.dark};
      font-size: 16px;
      font-weight: 600;
    }
    
    .report-info-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .report-info-item:last-child {
      border-bottom: none;
    }
    
    .report-info-label {
      color: #666;
      font-size: 14px;
    }
    
    .report-info-value {
      color: ${BSI_COLORS.dark};
      font-weight: 500;
      font-size: 14px;
    }
    
    .attachment-note {
      background-color: ${BSI_COLORS.primary};
      color: ${BSI_COLORS.white};
      padding: 15px 20px;
      border-radius: 8px;
      margin: 25px 0;
      text-align: center;
    }
    
    .attachment-note p {
      margin: 0;
      font-weight: 500;
    }
    
    .footer {
      background-color: ${BSI_COLORS.dark};
      color: ${BSI_COLORS.white};
      padding: 30px 40px;
      text-align: center;
    }
    
    .footer p {
      margin: 0;
      font-size: 13px;
      color: ${BSI_COLORS.light};
    }
    
    .footer-company {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      color: ${BSI_COLORS.white};
    }
    
    @media (max-width: 600px) {
      .content, .header, .footer {
        padding: 20px;
      }
      
      .header-title {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      ${logoSrc ? `<img src="${logoSrc}" alt="BSI Logo">` : ''}
      <h1 class="header-title">BSI Telemetry</h1>
      <p class="header-subtitle">Equipment Monitoring & Reporting System</p>
    </div>
    
    <div class="content">
      <div class="greeting">${greeting}</div>
      
      <div class="message-box">
        <p>${message}</p>
      </div>
      
      <div class="report-info">
        <h3>Report Details</h3>
        <div class="report-info-item">
          <span class="report-info-label">Report Name</span>
          <span class="report-info-value">${reportName || 'N/A'}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Schedule</span>
          <span class="report-info-value">${scheduleName || 'N/A'}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Generated On</span>
          <span class="report-info-value">${new Date().toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
      </div>
      
      <div class="attachment-note">
        <p>📎 Please find the detailed PDF report attached to this email.</p>
      </div>
    </div>
    
    <div class="footer">
      <p class="footer-company">Broadcasting Services International (BSI)</p>
      <p>${footer}</p>
      <p style="margin-top: 15px; font-size: 12px;">This is an automated message from BSI Telemetry System.<br>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a scheduled report email with PDF attachment
 */
async function sendScheduledReport({
  to,
  subject,
  reportName,
  scheduleName,
  pdfBuffer,
  pdfFilename,
  greeting,
  message,
  footer
}) {
  try {
    const transporter = getTransporter();
    const htmlContent = generateEmailTemplate({
      subject,
      greeting: greeting || 'Hello,',
      message: message || `Your scheduled report "${reportName}" is now available. This report contains the latest telemetry data and analysis for your equipment monitoring.`,
      footer: footer || 'Thank you for using BSI Telemetry services.',
      reportName,
      scheduleName
    });

    const logoAttachment = getLogoAttachment();
    const attachments = [];
    
    if (logoAttachment) {
      attachments.push(logoAttachment);
    }
    
    if (pdfBuffer && pdfFilename) {
      attachments.push({
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const mailOptions = {
      from: {
        name: SMTP_FROM_NAME,
        address: SMTP_FROM
      },
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: htmlContent,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully:', {
      messageId: result.messageId,
      to: to,
      subject: subject,
      attachments: attachments.length
    });

    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    logger.error('Failed to send email:', error.message || error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send test email to verify SMTP configuration
 */
async function sendTestEmail(to) {
  return sendScheduledReport({
    to,
    subject: 'BSI Telemetry - SMTP Test',
    reportName: 'Test Report',
    scheduleName: 'SMTP Configuration Test',
    greeting: 'Hello,',
    message: 'This is a test email to verify that the BSI Telemetry email service is configured correctly. If you received this email, the SMTP settings are working!',
    footer: 'BSI Telemetry System Test'
  });
}

module.exports = {
  sendScheduledReport,
  sendTestEmail,
  getTransporter,
  BSI_COLORS
};
