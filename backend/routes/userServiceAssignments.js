const express = require('express');
const router = express.Router();

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin role required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// ============================================================================
// USER-SERVICE ASSIGNMENTS
// ============================================================================

// GET /api/user-service-assignments/user/:userId - Get all services assigned to a user
router.get('/user/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const [user] = await db.query(
      'SELECT id, username, first_name, last_name FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get all services assigned to this user
    const [services] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        usa.created_at as assigned_at,
        u.username as assigned_by_username,
        (SELECT COUNT(*) FROM service_metric_assignments sma 
         WHERE sma.service_id = s.id AND sma.is_active = TRUE) as metric_count
      FROM user_service_assignments usa
      INNER JOIN services s ON usa.service_id = s.id
      INNER JOIN users u ON usa.created_by = u.id
      WHERE usa.user_id = ? AND s.is_active = TRUE
      ORDER BY s.name
    `, [userId]);

    res.json({
      success: true,
      user: user[0],
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('Error fetching user services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user services',
      message: error.message
    });
  }
});

// GET /api/user-service-assignments/service/:serviceId - Get all users assigned to a service
router.get('/service/:serviceId', requireAdmin, async (req, res) => {
  try {
    const { serviceId } = req.params;

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [serviceId]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Get all users assigned to this service
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        usa.created_at as assigned_at,
        creator.username as assigned_by_username
      FROM user_service_assignments usa
      INNER JOIN users u ON usa.user_id = u.id
      INNER JOIN users creator ON usa.created_by = creator.id
      WHERE usa.service_id = ?
      ORDER BY u.username
    `, [serviceId]);

    res.json({
      success: true,
      service: service[0],
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching service users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service users',
      message: error.message
    });
  }
});

// POST /api/user-service-assignments - Assign service to user
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { userId, serviceId } = req.body;

    // Validation
    if (!userId || !serviceId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Service ID are required'
      });
    }

    // Check if user exists
    const [user] = await db.query(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [serviceId]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Check if assignment already exists
    const [existing] = await db.query(
      'SELECT id FROM user_service_assignments WHERE user_id = ? AND service_id = ?',
      [userId, serviceId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Service is already assigned to this user'
      });
    }

    // Create assignment
    await db.query(
      'INSERT INTO user_service_assignments (user_id, service_id, created_by) VALUES (?, ?, ?)',
      [userId, serviceId, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: `Service "${service[0].name}" assigned to user "${user[0].username}" successfully`
    });
  } catch (error) {
    console.error('Error assigning service to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign service to user',
      message: error.message
    });
  }
});

// POST /api/user-service-assignments/bulk - Assign multiple services to a user
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { userId, serviceIds } = req.body;

    // Validation
    if (!userId || !serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User ID and array of Service IDs are required'
      });
    }

    // Check if user exists
    const [user] = await db.query(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const results = {
      assigned: [],
      skipped: [],
      errors: []
    };

    // Process each service
    for (const serviceId of serviceIds) {
      try {
        // Check if service exists
        const [service] = await db.query(
          'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
          [serviceId]
        );

        if (service.length === 0) {
          results.errors.push({ serviceId, error: 'Service not found' });
          continue;
        }

        // Check if assignment already exists
        const [existing] = await db.query(
          'SELECT id FROM user_service_assignments WHERE user_id = ? AND service_id = ?',
          [userId, serviceId]
        );

        if (existing.length > 0) {
          results.skipped.push({ serviceId, serviceName: service[0].name, reason: 'Already assigned' });
          continue;
        }

        // Create assignment
        await db.query(
          'INSERT INTO user_service_assignments (user_id, service_id, created_by) VALUES (?, ?, ?)',
          [userId, serviceId, req.user.id]
        );

        results.assigned.push({ serviceId, serviceName: service[0].name });
      } catch (error) {
        results.errors.push({ serviceId, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk assignment completed for user "${user[0].username}"`,
      results
    });
  } catch (error) {
    console.error('Error bulk assigning services to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign services to user',
      message: error.message
    });
  }
});

// DELETE /api/user-service-assignments - Remove service from user
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const { userId, serviceId } = req.body;

    // Validation
    if (!userId || !serviceId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Service ID are required'
      });
    }

    // Check if assignment exists
    const [assignment] = await db.query(`
      SELECT 
        usa.id,
        u.username,
        s.name as service_name
      FROM user_service_assignments usa
      INNER JOIN users u ON usa.user_id = u.id
      INNER JOIN services s ON usa.service_id = s.id
      WHERE usa.user_id = ? AND usa.service_id = ?
    `, [userId, serviceId]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service assignment not found'
      });
    }

    // Delete assignment
    await db.query(
      'DELETE FROM user_service_assignments WHERE user_id = ? AND service_id = ?',
      [userId, serviceId]
    );

    res.json({
      success: true,
      message: `Service "${assignment[0].service_name}" removed from user "${assignment[0].username}" successfully`
    });
  } catch (error) {
    console.error('Error removing service from user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove service from user',
      message: error.message
    });
  }
});

module.exports = router;
