const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

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

    // Find user in database
    const [users] = await db.query(
      'SELECT id, username, email, password_hash, role, first_name, last_name, is_active FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account is disabled',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login timestamp
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, ip_address)
       VALUES (?, ?, ?, ?)`,
      [user.id, 'LOGIN', 'auth', req.ip]
    );

    // Generate JWT token
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
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
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    console.log(`User ${req.user.username} logged out at ${new Date().toISOString()}`);
    
    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, ip_address)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, 'LOGOUT', 'auth', req.ip]
    );
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success even if logging fails
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
});

module.exports = router;
