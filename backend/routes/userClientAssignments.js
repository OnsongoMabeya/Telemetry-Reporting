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
// USER-CLIENT ASSIGNMENTS
// ============================================================================

// GET /api/user-client-assignments - Get all user-client assignments
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [assignments] = await db.query(`
      SELECT 
        uca.id,
        uca.user_id,
        uca.client_id,
        uca.assigned_at,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        c.name as client_name,
        c.description as client_description,
        creator.username as assigned_by_username
      FROM user_client_assignments uca
      INNER JOIN users u ON uca.user_id = u.id
      INNER JOIN clients c ON uca.client_id = c.id
      INNER JOIN users creator ON uca.assigned_by = creator.id
      WHERE uca.is_active = TRUE AND c.is_active = TRUE
      ORDER BY u.username, c.name
    `);

    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error fetching user-client assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user-client assignments',
      message: error.message
    });
  }
});

// GET /api/user-client-assignments/user/:userId - Get all clients assigned to a user
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

    // Get all clients assigned to this user
    const [clients] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        uca.assigned_at,
        u.username as assigned_by_username,
        (SELECT COUNT(*) FROM client_services cs 
         WHERE cs.client_id = c.id) as service_count
      FROM user_client_assignments uca
      INNER JOIN clients c ON uca.client_id = c.id
      INNER JOIN users u ON uca.assigned_by = u.id
      WHERE uca.user_id = ? AND uca.is_active = TRUE AND c.is_active = TRUE
      ORDER BY c.name
    `, [userId]);

    res.json({
      success: true,
      user: user[0],
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Error fetching user clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user clients',
      message: error.message
    });
  }
});

// GET /api/user-client-assignments/client/:clientId - Get all users assigned to a client
router.get('/client/:clientId', requireAdmin, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if client exists
    const [client] = await db.query(
      'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
      [clientId]
    );

    if (client.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Get all users assigned to this client
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        uca.assigned_at,
        creator.username as assigned_by_username
      FROM user_client_assignments uca
      INNER JOIN users u ON uca.user_id = u.id
      INNER JOIN users creator ON uca.assigned_by = creator.id
      WHERE uca.client_id = ? AND uca.is_active = TRUE
      ORDER BY u.username
    `, [clientId]);

    res.json({
      success: true,
      client: client[0],
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching client users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client users',
      message: error.message
    });
  }
});

// POST /api/user-client-assignments - Assign client to user
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { userId, clientId } = req.body;

    // Validation
    if (!userId || !clientId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Client ID are required'
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

    // Check if client exists
    const [client] = await db.query(
      'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
      [clientId]
    );

    if (client.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Check if assignment already exists
    const [existing] = await db.query(
      'SELECT id FROM user_client_assignments WHERE user_id = ? AND client_id = ? AND is_active = TRUE',
      [userId, clientId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Client is already assigned to this user'
      });
    }

    // Create assignment
    await db.query(
      'INSERT INTO user_client_assignments (user_id, client_id, assigned_by) VALUES (?, ?, ?)',
      [userId, clientId, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: `Client "${client[0].name}" assigned to user "${user[0].username}" successfully`
    });
  } catch (error) {
    console.error('Error assigning client to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign client to user',
      message: error.message
    });
  }
});

// POST /api/user-client-assignments/bulk - Assign multiple clients to a user
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { userId, clientIds } = req.body;

    // Validation
    if (!userId || !clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User ID and array of Client IDs are required'
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

    // Process each client
    for (const clientId of clientIds) {
      try {
        // Check if client exists
        const [client] = await db.query(
          'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
          [clientId]
        );

        if (client.length === 0) {
          results.errors.push({ clientId, error: 'Client not found' });
          continue;
        }

        // Check if assignment already exists
        const [existing] = await db.query(
          'SELECT id FROM user_client_assignments WHERE user_id = ? AND client_id = ? AND is_active = TRUE',
          [userId, clientId]
        );

        if (existing.length > 0) {
          results.skipped.push({ clientId, clientName: client[0].name, reason: 'Already assigned' });
          continue;
        }

        // Create assignment
        await db.query(
          'INSERT INTO user_client_assignments (user_id, client_id, assigned_by) VALUES (?, ?, ?)',
          [userId, clientId, req.user.id]
        );

        results.assigned.push({ clientId, clientName: client[0].name });
      } catch (error) {
        results.errors.push({ clientId, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk assignment completed for user "${user[0].username}"`,
      results
    });
  } catch (error) {
    console.error('Error bulk assigning clients to user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk assign clients to user',
      message: error.message
    });
  }
});

// DELETE /api/user-client-assignments/:userId/:clientId - Remove client from user
router.delete('/:userId/:clientId', requireAdmin, async (req, res) => {
  try {
    const { userId, clientId } = req.params;

    // Check if assignment exists
    const [assignment] = await db.query(`
      SELECT 
        uca.id,
        u.username,
        c.name as client_name
      FROM user_client_assignments uca
      INNER JOIN users u ON uca.user_id = u.id
      INNER JOIN clients c ON uca.client_id = c.id
      WHERE uca.user_id = ? AND uca.client_id = ? AND uca.is_active = TRUE
    `, [userId, clientId]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client assignment not found'
      });
    }

    // Soft delete assignment
    await db.query(
      'UPDATE user_client_assignments SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND client_id = ?',
      [userId, clientId]
    );

    res.json({
      success: true,
      message: `Client "${assignment[0].client_name}" removed from user "${assignment[0].username}" successfully`
    });
  } catch (error) {
    console.error('Error removing client from user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove client from user',
      message: error.message
    });
  }
});

module.exports = router;
