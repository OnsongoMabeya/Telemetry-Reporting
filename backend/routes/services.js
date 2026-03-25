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
// SERVICES MANAGEMENT
// ============================================================================

// GET /api/services - Get all services
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [services] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        s.is_active,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        (SELECT COUNT(*) FROM service_metric_assignments sma 
         WHERE sma.service_id = s.id AND sma.is_active = TRUE) as metric_count,
        (SELECT COUNT(*) FROM client_services cs 
         WHERE cs.service_id = s.id) as client_count
      FROM services s
      INNER JOIN users u ON s.created_by = u.id
      WHERE s.is_active = TRUE
      ORDER BY s.name
    `);

    res.json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services',
      message: error.message
    });
  }
});

// GET /api/services/:id - Get single service by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [services] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        s.is_active,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM services s
      INNER JOIN users u ON s.created_by = u.id
      WHERE s.id = ? AND s.is_active = TRUE
    `, [id]);

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: services[0]
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service',
      message: error.message
    });
  }
});

// POST /api/services - Create new service
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Service name is required'
      });
    }

    // Check if service name already exists
    const [existing] = await db.query(
      'SELECT id FROM services WHERE name = ?',
      [name.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Service with this name already exists'
      });
    }

    // Insert new service
    const [result] = await db.query(
      'INSERT INTO services (name, description, created_by) VALUES (?, ?, ?)',
      [name.trim(), description || null, req.user.id]
    );

    // Fetch the created service
    const [newService] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        s.is_active,
        u.username as created_by_username
      FROM services s
      INNER JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: newService[0]
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
      message: error.message
    });
  }
});

// PUT /api/services/:id - Update service
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Service name is required'
      });
    }

    // Check if service exists
    const [existing] = await db.query(
      'SELECT id FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Check if new name conflicts with another service
    const [nameConflict] = await db.query(
      'SELECT id FROM services WHERE name = ? AND id != ?',
      [name.trim(), id]
    );

    if (nameConflict.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Another service with this name already exists'
      });
    }

    // Update service
    await db.query(
      'UPDATE services SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name.trim(), description || null, id]
    );

    // Fetch updated service
    const [updatedService] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.created_at,
        s.updated_at,
        s.is_active,
        u.username as created_by_username
      FROM services s
      INNER JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService[0]
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
      message: error.message
    });
  }
});

// DELETE /api/services/:id - Soft delete service
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const [existing] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Soft delete (set is_active to FALSE)
    await db.query(
      'UPDATE services SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Service "${existing[0].name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
      message: error.message
    });
  }
});

// ============================================================================
// SERVICE METRIC ASSIGNMENTS
// ============================================================================

// GET /api/services/:id/metrics - Get all metric assignments for a service (alias)
router.get('/:id/metrics', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Get all metric assignments for this service
    const [assignments] = await db.query(`
      SELECT 
        sma.id,
        sma.metric_mapping_id,
        sma.display_name,
        sma.display_order,
        sma.created_at,
        sma.updated_at,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        u.username as created_by_username
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      INNER JOIN users u ON sma.created_by = u.id
      WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
      ORDER BY sma.display_order, sma.created_at
    `, [id]);

    res.json({
      success: true,
      service: service[0],
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error fetching service metric assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service metric assignments',
      message: error.message
    });
  }
});

// GET /api/services/:id/metric-assignments - Get all metric assignments for a service
router.get('/:id/metric-assignments', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Get all metric assignments for this service
    const [assignments] = await db.query(`
      SELECT 
        sma.id,
        sma.metric_mapping_id,
        sma.display_name,
        sma.display_order,
        sma.created_at,
        sma.updated_at,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        u.username as created_by_username
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      INNER JOIN users u ON sma.created_by = u.id
      WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
      ORDER BY sma.display_order, sma.created_at
    `, [id]);

    res.json({
      success: true,
      service: service[0],
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error fetching service metric assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service metric assignments',
      message: error.message
    });
  }
});

// POST /api/services/:id/metrics - Assign metric mapping to service (alias)
router.post('/:id/metrics', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { metricMappingId, displayName, displayOrder } = req.body;

    // Validation
    if (!metricMappingId) {
      return res.status(400).json({
        success: false,
        error: 'Metric mapping ID is required'
      });
    }

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Check if metric mapping exists
    const [metricMapping] = await db.query(
      'SELECT id, metric_name, node_name, base_station_name FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [metricMappingId]
    );

    if (metricMapping.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric mapping not found'
      });
    }

    // Check if assignment already exists
    const [existing] = await db.query(
      'SELECT id FROM service_metric_assignments WHERE service_id = ? AND metric_mapping_id = ?',
      [id, metricMappingId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This metric mapping is already assigned to this service'
      });
    }

    // Use metric name as default display name if not provided
    const finalDisplayName = displayName && displayName.trim() !== '' 
      ? displayName.trim() 
      : metricMapping[0].metric_name;

    // Insert assignment
    const [result] = await db.query(
      `INSERT INTO service_metric_assignments 
       (service_id, metric_mapping_id, display_name, display_order, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, metricMappingId, finalDisplayName, displayOrder || 0, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Metric mapping assigned to service successfully',
      data: {
        id: result.insertId,
        service_id: id,
        metric_mapping_id: metricMappingId,
        display_name: finalDisplayName,
        display_order: displayOrder || 0
      }
    });
  } catch (error) {
    console.error('Error assigning metric to service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign metric to service',
      message: error.message
    });
  }
});

// POST /api/services/:id/metric-assignments - Assign metric mapping to service
router.post('/:id/metric-assignments', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { metricMappingId, displayName, displayOrder } = req.body;

    // Validation
    if (!metricMappingId) {
      return res.status(400).json({
        success: false,
        error: 'Metric mapping ID is required'
      });
    }

    if (!displayName || displayName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Display name is required'
      });
    }

    // Check if service exists
    const [service] = await db.query(
      'SELECT id, name FROM services WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (service.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Check if metric mapping exists
    const [metricMapping] = await db.query(
      'SELECT id, metric_name, node_name, base_station_name FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [metricMappingId]
    );

    if (metricMapping.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric mapping not found'
      });
    }

    // Check if assignment already exists
    const [existing] = await db.query(
      'SELECT id FROM service_metric_assignments WHERE service_id = ? AND metric_mapping_id = ?',
      [id, metricMappingId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This metric mapping is already assigned to this service'
      });
    }

    // Create assignment
    const [result] = await db.query(
      'INSERT INTO service_metric_assignments (service_id, metric_mapping_id, display_name, display_order, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, metricMappingId, displayName.trim(), displayOrder || 0, req.user.id]
    );

    // Fetch the created assignment
    const [newAssignment] = await db.query(`
      SELECT 
        sma.id,
        sma.metric_mapping_id,
        sma.display_name,
        sma.display_order,
        sma.created_at,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      WHERE sma.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: `Metric "${metricMapping[0].metric_name}" assigned to service "${service[0].name}" successfully`,
      data: newAssignment[0]
    });
  } catch (error) {
    console.error('Error assigning metric to service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign metric to service',
      message: error.message
    });
  }
});

// PUT /api/services/metric-assignments/:assignmentId - Update metric assignment
router.put('/metric-assignments/:assignmentId', requireAdmin, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { displayName, displayOrder } = req.body;

    // Validation
    if (!displayName || displayName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Display name is required'
      });
    }

    // Check if assignment exists
    const [existing] = await db.query(
      'SELECT id FROM service_metric_assignments WHERE id = ? AND is_active = TRUE',
      [assignmentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric assignment not found'
      });
    }

    // Update assignment
    await db.query(
      'UPDATE service_metric_assignments SET display_name = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName.trim(), displayOrder || 0, assignmentId]
    );

    // Fetch updated assignment
    const [updatedAssignment] = await db.query(`
      SELECT 
        sma.id,
        sma.service_id,
        sma.metric_mapping_id,
        sma.display_name,
        sma.display_order,
        sma.updated_at,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        s.name as service_name
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      INNER JOIN services s ON sma.service_id = s.id
      WHERE sma.id = ?
    `, [assignmentId]);

    res.json({
      success: true,
      message: 'Metric assignment updated successfully',
      data: updatedAssignment[0]
    });
  } catch (error) {
    console.error('Error updating metric assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update metric assignment',
      message: error.message
    });
  }
});

// DELETE /api/services/:serviceId/metrics/:metricMappingId - Remove metric assignment (alias)
router.delete('/:serviceId/metrics/:metricMappingId', requireAdmin, async (req, res) => {
  try {
    const { serviceId, metricMappingId } = req.params;

    // Find the assignment
    const [assignment] = await db.query(`
      SELECT 
        sma.id,
        s.name as service_name,
        mm.metric_name
      FROM service_metric_assignments sma
      INNER JOIN services s ON sma.service_id = s.id
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      WHERE sma.service_id = ? AND sma.metric_mapping_id = ? AND sma.is_active = TRUE
    `, [serviceId, metricMappingId]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric assignment not found'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE service_metric_assignments SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [assignment[0].id]
    );

    res.json({
      success: true,
      message: `Metric "${assignment[0].metric_name}" removed from service "${assignment[0].service_name}" successfully`
    });
  } catch (error) {
    console.error('Error removing metric assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove metric assignment',
      message: error.message
    });
  }
});

// DELETE /api/services/metric-assignments/:assignmentId - Remove metric assignment
router.delete('/metric-assignments/:assignmentId', requireAdmin, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Check if assignment exists
    const [assignment] = await db.query(`
      SELECT 
        sma.id,
        s.name as service_name,
        mm.metric_name
      FROM service_metric_assignments sma
      INNER JOIN services s ON sma.service_id = s.id
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      WHERE sma.id = ? AND sma.is_active = TRUE
    `, [assignmentId]);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric assignment not found'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE service_metric_assignments SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [assignmentId]
    );

    res.json({
      success: true,
      message: `Metric "${assignment[0].metric_name}" removed from service "${assignment[0].service_name}" successfully`
    });
  } catch (error) {
    console.error('Error removing metric assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove metric assignment',
      message: error.message
    });
  }
});

module.exports = router;
