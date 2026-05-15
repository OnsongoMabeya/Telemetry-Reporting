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
 * Uses table-based layout for Outlook compatibility
 */
function generateEmailTemplate({ subject, greeting, message, footer, reportName, scheduleName }) {
  const logoAttachment = getLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${logoAttachment.cid}` : '';
  const generatedOn = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #e8edf2 !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .content-pad { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#e8edf2;">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8edf2;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Email card -->
      <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" border="0"
             style="width:600px;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">

        <!-- ===== HEADER ===== -->
        <tr>
          <td align="center" style="background-color:#ddeeff;padding:32px 40px;">
            ${logoSrc ? `<img src="${logoSrc}" alt="BSI" width="200" style="display:block;margin:0 auto 16px;max-width:200px;height:auto;">` : ''}
            <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#003d7a;letter-spacing:0.5px;">BSI Telemetry</h1>
            <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#336699;letter-spacing:0.5px;text-transform:uppercase;">Equipment Monitoring &amp; Reporting System</p>
          </td>
        </tr>

        <!-- ===== BLUE ACCENT BAR ===== -->
        <tr>
          <td height="4" style="background-color:#0099ff;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ===== CONTENT ===== -->
        <tr>
          <td class="content-pad" style="padding:36px 40px;background-color:#ffffff;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#003d7a;">${greeting}</p>

            <!-- Message box -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td width="4" style="background-color:#0099ff;border-radius:4px 0 0 4px;">&nbsp;</td>
                <td style="background-color:#e8f4ff;padding:18px 20px;border-radius:0 4px 4px 0;border:1px solid #c0dff5;border-left:none;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#003d7a;line-height:1.6;">${message}</p>
                </td>
              </tr>
            </table>

            <!-- Report Details card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="margin-bottom:28px;border:1px solid #dde3ea;border-radius:6px;overflow:hidden;">
              <!-- Card header -->
              <tr>
                <td style="background-color:#003d7a;padding:12px 20px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px;">Report Details</p>
                </td>
              </tr>
              <!-- Row: Report Name -->
              <tr>
                <td style="padding:0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="40%" style="padding:12px 20px;background-color:#f5f8fb;border-bottom:1px solid #e4e9ef;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7a8d;font-weight:600;">Report Name</p>
                      </td>
                      <td width="60%" style="padding:12px 20px;background-color:#ffffff;border-bottom:1px solid #e4e9ef;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a2b3c;font-weight:500;">${reportName || 'N/A'}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:12px 20px;background-color:#f5f8fb;border-bottom:1px solid #e4e9ef;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7a8d;font-weight:600;">Schedule</p>
                      </td>
                      <td width="60%" style="padding:12px 20px;background-color:#ffffff;border-bottom:1px solid #e4e9ef;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a2b3c;font-weight:500;">${scheduleName || 'N/A'}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:12px 20px;background-color:#f5f8fb;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7a8d;font-weight:600;">Generated On</p>
                      </td>
                      <td width="60%" style="padding:12px 20px;background-color:#ffffff;">
                        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a2b3c;font-weight:500;">${generatedOn}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Attachment note -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:#0099ff;border-radius:6px;">
              <tr>
                <td style="padding:14px 20px;text-align:center;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;">&#128206; Please find the detailed PDF report attached to this email.</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ===== FOOTER ===== -->
        <tr>
          <td style="background-color:#001f42;padding:28px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;">Broadcasting Services International (BSI)</p>
            <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7aa3c8;">${footer}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-top:1px solid #0d3560;padding-top:14px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#4d7aa0;line-height:1.6;">This is an automated message from BSI Telemetry System. Please do not reply to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
      <!-- /Email card -->

    </td>
  </tr>
</table>

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
