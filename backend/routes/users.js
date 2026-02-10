const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Rate limiter for user creation
const createUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many user creation attempts, please try again later' }
});

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// Middleware to check if user is admin or manager
const requireAdminOrManager = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Manager privileges required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// @route   POST /api/users/signup
// @desc    Create a new user (Admin only)
// @access  Private (Admin)
router.post('/signup', requireAdmin, createUserLimiter, async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'viewer'];
    const userRole = role || 'viewer';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, manager, or viewer'
      });
    }

    // Check if username already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (username, email, password_hash, role, first_name, last_name, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, userRole, firstName || null, lastName || null, req.user.id]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE_USER',
        'users',
        JSON.stringify({ newUserId: result.insertId, username, role: userRole }),
        req.ip
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: result.insertId,
        username,
        email,
        role: userRole,
        firstName: firstName || null,
        lastName: lastName || null
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin and Manager)
// @access  Private (Admin/Manager)
router.get('/', requireAdminOrManager, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, username, email, role, first_name, last_name, is_active, 
              created_at, updated_at, last_login
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin/Manager or own profile)
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check permissions: admin/manager can view any user, others can only view themselves
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [users] = await db.query(
      `SELECT id, username, email, role, first_name, last_name, is_active, 
              created_at, updated_at, last_login
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile)
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, firstName, lastName, role, isActive, password } = req.body;

    // Check permissions
    const isOwnProfile = req.user.id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only admins can change roles and active status
    if ((role || isActive !== undefined) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change user roles or active status'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (email) {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }

    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }

    if (role && isAdmin) {
      const validRoles = ['admin', 'manager', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (isActive !== undefined && isAdmin) {
      updates.push('is_active = ?');
      values.push(isActive);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'UPDATE_USER',
        'users',
        JSON.stringify({ targetUserId: userId, updates: Object.keys(req.body) }),
        req.ip
      ]
    );

    // Fetch updated user
    const [users] = await db.query(
      `SELECT id, username, email, role, first_name, last_name, is_active, 
              created_at, updated_at, last_login
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: users[0].id,
        username: users[0].username,
        email: users[0].email,
        role: users[0].role,
        firstName: users[0].first_name,
        lastName: users[0].last_name,
        isActive: users[0].is_active,
        createdAt: users[0].created_at,
        updatedAt: users[0].updated_at,
        lastLogin: users[0].last_login
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private (Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting own account
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const [users] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user (cascade will handle sessions and logs)
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE_USER',
        'users',
        JSON.stringify({ deletedUserId: userId, username: users[0].username }),
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// @route   GET /api/users/activity/logs
// @desc    Get user activity logs (Admin only)
// @access  Private (Admin)
router.get('/activity/logs', requireAdmin, async (req, res) => {
  try {
    const { limit = 100, userId, action } = req.query;

    let query = `
      SELECT ual.*, u.username
      FROM user_activity_log ual
      LEFT JOIN users u ON ual.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND ual.user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND ual.action = ?';
      params.push(action);
    }

    query += ' ORDER BY ual.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [logs] = await db.query(query, params);

    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        userId: log.user_id,
        username: log.username,
        action: log.action,
        resource: log.resource,
        details: log.details ? JSON.parse(log.details) : null,
        ipAddress: log.ip_address,
        createdAt: log.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
});

module.exports = router;
