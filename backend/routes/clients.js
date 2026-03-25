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
// CLIENTS MANAGEMENT
// ============================================================================

// GET /api/clients - Get all clients
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [clients] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        c.is_active,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        (SELECT COUNT(*) FROM client_services cs WHERE cs.client_id = c.id) as service_count
      FROM clients c
      INNER JOIN users u ON c.created_by = u.id
      WHERE c.is_active = TRUE
      ORDER BY c.name
    `);

    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients',
      message: error.message
    });
  }
});

// GET /api/clients/:id - Get single client by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [clients] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        c.is_active,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM clients c
      INNER JOIN users u ON c.created_by = u.id
      WHERE c.id = ? AND c.is_active = TRUE
    `, [id]);

    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: clients[0]
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client',
      message: error.message
    });
  }
});

// POST /api/clients - Create new client
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }

    // Check if client name already exists
    const [existing] = await db.query(
      'SELECT id FROM clients WHERE name = ?',
      [name.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Client with this name already exists'
      });
    }

    // Insert new client
    const [result] = await db.query(
      'INSERT INTO clients (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description || null, req.user.id]
    );

    // Fetch the created client
    const [newClient] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        c.is_active,
        u.username as created_by_username
      FROM clients c
      INNER JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: newClient[0]
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client',
      message: error.message
    });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }

    // Check if client exists
    const [existing] = await db.query(
      'SELECT id FROM clients WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Check if new name conflicts with another client
    const [nameConflict] = await db.query(
      'SELECT id FROM clients WHERE name = ? AND id != ?',
      [name.trim(), id]
    );

    if (nameConflict.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Another client with this name already exists'
      });
    }

    // Update client
    await db.query(
      'UPDATE clients SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name.trim(), description || null, id]
    );

    // Fetch updated client
    const [updatedClient] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.created_at,
        c.updated_at,
        c.is_active,
        u.username as created_by_username
      FROM clients c
      INNER JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: updatedClient[0]
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client',
      message: error.message
    });
  }
});

// DELETE /api/clients/:id - Soft delete client
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const [existing] = await db.query(
      'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Soft delete (set is_active to FALSE)
    await db.query(
      'UPDATE clients SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Client "${existing[0].name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client',
      message: error.message
    });
  }
});

// ============================================================================
// CLIENT-SERVICE ASSIGNMENTS
// ============================================================================

// GET /api/clients/:id/services - Get all services for a client
router.get('/:id/services', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const [client] = await db.query(
      'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (client.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Get all services assigned to this client
    const [services] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        cs.created_at as assigned_at,
        u.username as assigned_by_username
      FROM client_services cs
      INNER JOIN services s ON cs.service_id = s.id
      INNER JOIN users u ON cs.created_by = u.id
      WHERE cs.client_id = ? AND s.is_active = TRUE
      ORDER BY s.name
    `, [id]);

    res.json({
      success: true,
      client: client[0],
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('Error fetching client services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client services',
      message: error.message
    });
  }
});

// POST /api/clients/:id/services - Assign service to client
router.post('/:id/services', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId } = req.body;

    // Validation
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Service ID is required'
      });
    }

    // Check if client exists
    const [client] = await db.query(
      'SELECT id, name FROM clients WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (client.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
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
      'SELECT id FROM client_services WHERE client_id = ? AND service_id = ?',
      [id, serviceId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Service is already assigned to this client'
      });
    }

    // Create assignment
    await db.query(
      'INSERT INTO client_services (client_id, service_id, created_by) VALUES (?, ?, ?)',
      [id, serviceId, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: `Service "${service[0].name}" assigned to client "${client[0].name}" successfully`
    });
  } catch (error) {
    console.error('Error assigning service to client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign service to client',
      message: error.message
    });
  }
});

// DELETE /api/clients/:id/services/:serviceId - Remove service from client
router.delete('/:id/services/:serviceId', requireAdmin, async (req, res) => {
  try {
    const { id, serviceId } = req.params;

    // Check if assignment exists
    const [assignment] = await db.query(`
      SELECT 
        cs.id,
        c.name as client_name,
        s.name as service_name
      FROM client_services cs
      INNER JOIN clients c ON cs.client_id = c.id
      INNER JOIN services s ON cs.service_id = s.id
      WHERE cs.client_id = ? AND cs.service_id = ?
    `, [id, serviceId]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service assignment not found'
      });
    }

    // Delete assignment
    await db.query(
      'DELETE FROM client_services WHERE client_id = ? AND service_id = ?',
      [id, serviceId]
    );

    res.json({
      success: true,
      message: `Service "${assignment[0].service_name}" removed from client "${assignment[0].client_name}" successfully`
    });
  } catch (error) {
    console.error('Error removing service from client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove service from client',
      message: error.message
    });
  }
});

module.exports = router;
