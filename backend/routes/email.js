const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'));
    }
  },
});

// Rate limiting for email sending
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many email requests from this IP, please try again after 15 minutes',
});

// Create a Nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email with attachment
router.post('/send-report', emailLimiter, upload.single('file'), async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;
    const file = req.file;

    // Validate inputs
    if (!recipients) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Split and validate email addresses
    const recipientEmails = recipients.split(',').map(email => email.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientEmails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: `Invalid email address${invalidEmails.length > 1 ? 'es' : ''}: ${invalidEmails.join(', ')}` 
      });
    }

    // Create email options
    const mailOptions = {
      from: `"Telemetry Reporting" <${process.env.DEFAULT_FROM_EMAIL}>`,
      to: recipientEmails.join(','),
      subject: subject || 'Telemetry Report',
      text: message || 'Please find the attached telemetry report.',
      attachments: [
        {
          filename: file.originalname || 'report.pdf',
          content: file.buffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Send email
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', info.messageId);
    res.json({ success: true, message: 'Email sent successfully', messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
