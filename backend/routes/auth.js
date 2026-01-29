const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Check if username matches admin username
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
    const token = jwt.sign(
      { 
        username: username,
        role: 'admin',
        loginTime: new Date().toISOString()
      },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionTimeout}m` }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: username,
        role: 'admin'
      },
      expiresIn: sessionTimeout * 60 // in seconds
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'An error occurred during login',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Logout endpoint (client-side token removal, but useful for logging)
router.post('/logout', authenticateToken, (req, res) => {
  console.log(`User ${req.user.username} logged out at ${new Date().toISOString()}`);
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
