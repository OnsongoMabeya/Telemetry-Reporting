const express = require('express');
const router = express.Router();

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// GET /api/telemetry-mappings/:nodeName/:baseStation - Get metric mappings for telemetry display
router.get('/:nodeName/:baseStation', async (req, res) => {
  try {
    const { nodeName, baseStation } = req.params;

    // Get active metric mappings for this node/base station
    const [mappings] = await db.query(
      `SELECT 
        id,
        metric_name,
        column_name,
        unit,
        display_order
       FROM metric_mappings
       WHERE node_name = ? 
         AND base_station_name = ?
         AND is_active = TRUE
       ORDER BY display_order, metric_name`,
      [nodeName, baseStation]
    );

    // If no mappings found, return empty to enforce manual configuration
    if (mappings.length === 0) {
      return res.json({
        hasMappings: false,
        mappings: [],
        message: 'No metric mappings configured for this node/base station. Please configure in Visualization Settings.'
      });
    }

    res.json({
      hasMappings: true,
      mappings,
      message: 'Custom metric mappings loaded successfully.'
    });

  } catch (error) {
    console.error('Error fetching telemetry mappings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch telemetry mappings',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
