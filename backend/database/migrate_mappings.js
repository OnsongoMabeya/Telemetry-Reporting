const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Source database (your development Mac)
const sourceConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'john',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'horiserverlive',
  multipleStatements: true
};

async function exportMappings() {
  let connection;
  
  try {
    console.log('🔧 Metric Mappings Export Tool\n');
    console.log('================================\n');
    
    console.log('📋 Source Database Configuration:');
    console.log(`   Host: ${sourceConfig.host}`);
    console.log(`   User: ${sourceConfig.user}`);
    console.log(`   Database: ${sourceConfig.database}\n`);
    
    // Connect to source database
    console.log('📡 Connecting to source database...');
    connection = await mysql.createConnection(sourceConfig);
    console.log('✅ Connected successfully!\n');
    
    // Check if metric_mappings table exists
    const [tables] = await connection.query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = 'metric_mappings'`,
      [sourceConfig.database]
    );
    
    if (tables[0].count === 0) {
      console.error('❌ Error: metric_mappings table does not exist in source database\n');
      return false;
    }
    
    // Fetch all active metric mappings
    console.log('📥 Fetching metric mappings...');
    const [mappings] = await connection.query(
      `SELECT 
        node_name,
        base_station_name,
        metric_name,
        column_name,
        unit,
        display_order,
        is_active,
        created_by
       FROM metric_mappings
       WHERE is_active = 1
       ORDER BY node_name, base_station_name, display_order`
    );
    
    if (mappings.length === 0) {
      console.log('⚠️  No active metric mappings found in source database\n');
      return false;
    }
    
    console.log(`✅ Found ${mappings.length} metric mapping(s)\n`);
    
    // Generate SQL INSERT statements
    console.log('📝 Generating SQL export file...');
    
    let sqlContent = `-- Metric Mappings Export
-- Generated: ${new Date().toISOString()}
-- Source Database: ${sourceConfig.database}
-- Total Mappings: ${mappings.length}

-- Clear existing mappings (optional - comment out if you want to keep existing)
-- DELETE FROM metric_mappings;

-- Insert metric mappings
`;
    
    const nodeStats = {};
    
    for (const mapping of mappings) {
      const nodeName = mapping.node_name;
      const baseStation = mapping.base_station_name;
      const key = `${nodeName}/${baseStation}`;
      
      if (!nodeStats[key]) {
        nodeStats[key] = 0;
      }
      nodeStats[key]++;
      
      sqlContent += `INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES (`;
      sqlContent += `${connection.escape(mapping.node_name)}, `;
      sqlContent += `${connection.escape(mapping.base_station_name)}, `;
      sqlContent += `${connection.escape(mapping.metric_name)}, `;
      sqlContent += `${connection.escape(mapping.column_name)}, `;
      sqlContent += `${connection.escape(mapping.unit || '')}, `;
      sqlContent += `${mapping.display_order}, `;
      sqlContent += `${mapping.is_active}, `;
      sqlContent += `${connection.escape(mapping.created_by || 'admin')}`;
      sqlContent += `);\n`;
    }
    
    sqlContent += `\n-- Summary:\n`;
    for (const [key, count] of Object.entries(nodeStats)) {
      sqlContent += `-- ${key}: ${count} metric(s)\n`;
    }
    
    // Save to file
    const exportFile = path.join(__dirname, 'metric_mappings_export.sql');
    await fs.writeFile(exportFile, sqlContent, 'utf8');
    
    console.log(`✅ Export file created: ${exportFile}\n`);
    
    console.log('📊 Export Summary:');
    console.log(`   Total mappings: ${mappings.length}`);
    console.log(`   Configured nodes:\n`);
    for (const [key, count] of Object.entries(nodeStats)) {
      console.log(`   - ${key}: ${count} metric(s)`);
    }
    
    console.log('\n================================\n');
    console.log('✅ Export completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Copy the export file to your new computer:');
    console.log(`      ${exportFile}`);
    console.log('   2. On the new computer, run:');
    console.log('      mysql -u root -pHorizonBsi_2019 horiserverdatalive < metric_mappings_export.sql\n');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting:');
      console.error('   - Make sure MySQL is running');
      console.error('   - Check DB_HOST in your .env file');
      console.error('   - Verify database credentials\n');
    }
    
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Database connection closed.\n');
    }
  }
}

// Run if called directly
if (require.main === module) {
  exportMappings()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { exportMappings };
