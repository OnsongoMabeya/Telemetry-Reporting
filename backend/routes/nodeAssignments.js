const express = require('express');
const router = express.Router();

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

// @route   GET /api/node-assignments/user/:userId
// @desc    Get all node assignments for a specific user
// @access  Private (Admin or own assignments)
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Check permissions: admin can view any, users can view their own
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const [assignments] = await db.query(
      `SELECT una.*, u.username as assigned_by_username
       FROM user_node_assignments una
       LEFT JOIN users u ON una.assigned_by = u.id
       WHERE una.user_id = ?
       ORDER BY una.assigned_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      assignments: assignments.map(a => ({
        id: a.id,
        userId: a.user_id,
        nodeName: a.node_name,
        assignedBy: a.assigned_by,
        assignedByUsername: a.assigned_by_username,
        assignedAt: a.assigned_at,
        notes: a.notes
      }))
    });
  } catch (error) {
    console.error('Error fetching node assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch node assignments',
      error: error.message
    });
  }
});

// @route   GET /api/node-assignments/available-nodes
// @desc    Get all available nodes from the database
// @access  Private (Admin)
router.get('/available-nodes', requireAdmin, async (req, res) => {
  try {
    const [nodes] = await db.query(
      'SELECT DISTINCT NodeName FROM node_status_table ORDER BY NodeName'
    );

    res.json({
      success: true,
      nodes: nodes.map(n => n.NodeName)
    });
  } catch (error) {
    console.error('Error fetching available nodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available nodes',
      error: error.message
    });
  }
});

// @route   POST /api/node-assignments
// @desc    Assign nodes to a user
// @access  Private (Admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { userId, nodeNames, notes } = req.body;

    // Validation
    if (!userId || !nodeNames || !Array.isArray(nodeNames) || nodeNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and at least one node name are required'
      });
    }

    // Check if user exists
    const [users] = await db.query('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Insert assignments (using INSERT IGNORE to skip duplicates)
    const assignments = [];
    for (const nodeName of nodeNames) {
      try {
        const [result] = await db.query(
          `INSERT INTO user_node_assignments (user_id, node_name, assigned_by, notes)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE notes = VALUES(notes), assigned_at = CURRENT_TIMESTAMP`,
          [userId, nodeName, req.user.id, notes || null]
        );
        
        if (result.affectedRows > 0) {
          assignments.push({ nodeName, status: 'assigned' });
        }
      } catch (err) {
        console.error(`Error assigning node ${nodeName}:`, err);
        assignments.push({ nodeName, status: 'error', error: err.message });
      }
    }

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'ASSIGN_NODES',
        'node_assignments',
        JSON.stringify({ targetUserId: userId, nodes: nodeNames }),
        req.ip
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Nodes assigned successfully',
      assignments
    });
  } catch (error) {
    console.error('Error assigning nodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign nodes',
      error: error.message
    });
  }
});

// @route   DELETE /api/node-assignments/:id
// @desc    Remove a node assignment
// @access  Private (Admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    // Get assignment details before deleting
    const [assignments] = await db.query(
      'SELECT user_id, node_name FROM user_node_assignments WHERE id = ?',
      [assignmentId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Delete assignment
    await db.query('DELETE FROM user_node_assignments WHERE id = ?', [assignmentId]);

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'REMOVE_NODE_ASSIGNMENT',
        'node_assignments',
        JSON.stringify({ assignmentId, userId: assignments[0].user_id, nodeName: assignments[0].node_name }),
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'Node assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing node assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove node assignment',
      error: error.message
    });
  }
});

// @route   DELETE /api/node-assignments/user/:userId/node/:nodeName
// @desc    Remove a specific node assignment by user ID and node name
// @access  Private (Admin)
router.delete('/user/:userId/node/:nodeName', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const nodeName = req.params.nodeName;

    const [result] = await db.query(
      'DELETE FROM user_node_assignments WHERE user_id = ? AND node_name = ?',
      [userId, nodeName]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'REMOVE_NODE_ASSIGNMENT',
        'node_assignments',
        JSON.stringify({ userId, nodeName }),
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'Node assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing node assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove node assignment',
      error: error.message
    });
  }
});

// @route   PUT /api/node-assignments/user/:userId/access-all
// @desc    Toggle user's access to all nodes
// @access  Private (Admin)
router.put('/user/:userId/access-all', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { accessAllNodes } = req.body;

    if (typeof accessAllNodes !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'accessAllNodes must be a boolean value'
      });
    }

    await db.query(
      'UPDATE users SET access_all_nodes = ? WHERE id = ?',
      [accessAllNodes, userId]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'UPDATE_NODE_ACCESS',
        'users',
        JSON.stringify({ userId, accessAllNodes }),
        req.ip
      ]
    );

    res.json({
      success: true,
      message: `User ${accessAllNodes ? 'granted' : 'revoked'} access to all nodes`
    });
  } catch (error) {
    console.error('Error updating node access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update node access',
      error: error.message
    });
  }
});

module.exports = router;
