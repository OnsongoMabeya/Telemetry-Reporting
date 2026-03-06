const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'horiserverlive'
};

async function exportMetricMappings() {
  let connection;
  
  try {
    console.log('📦 Exporting Metric Mappings\n');
    console.log('================================\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');
    
    const [mappings] = await connection.query(
      `SELECT 
        node_name, 
        base_station_name, 
        metric_name, 
        column_name, 
        unit, 
        display_order, 
        is_active, 
        created_by,
        color
      FROM metric_mappings 
      WHERE is_active = 1 
      ORDER BY node_name, base_station_name, display_order`
    );
    
    if (mappings.length === 0) {
      console.log('⚠️  No active metric mappings found to export\n');
      return;
    }
    
    const timestamp = new Date().toISOString();
    let sql = `-- Metric Mappings Export\n`;
    sql += `-- Generated: ${timestamp}\n`;
    sql += `-- Source Database: ${dbConfig.database}\n`;
    sql += `-- Total Mappings: ${mappings.length}\n\n`;
    sql += `-- Clear existing mappings (optional - comment out if you want to keep existing)\n`;
    sql += `-- DELETE FROM metric_mappings;\n\n`;
    sql += `-- Insert metric mappings\n`;
    
    for (const mapping of mappings) {
      const values = [
        `'${mapping.node_name.replace(/'/g, "''")}'`,
        `'${mapping.base_station_name.replace(/'/g, "''")}'`,
        `'${mapping.metric_name.replace(/'/g, "''")}'`,
        `'${mapping.column_name.replace(/'/g, "''")}'`,
        mapping.unit ? `'${mapping.unit.replace(/'/g, "''")}'` : "''",
        mapping.display_order,
        mapping.is_active,
        mapping.created_by || 1,
        mapping.color ? `'${mapping.color}'` : 'NULL'
      ];
      
      sql += `INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by, color) VALUES (${values.join(', ')});\n`;
    }
    
    const groupedMappings = mappings.reduce((acc, m) => {
      const key = `${m.node_name}/${m.base_station_name}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    sql += `\n-- Summary:\n`;
    for (const [key, count] of Object.entries(groupedMappings)) {
      sql += `-- ${key}: ${count} metric(s)\n`;
    }
    
    const exportFile = path.join(__dirname, 'metric_mappings_export.sql');
    await fs.writeFile(exportFile, sql, 'utf8');
    
    console.log(`✅ Exported ${mappings.length} metric mapping(s)\n`);
    console.log(`📁 Export file: ${exportFile}\n`);
    console.log('Summary:');
    for (const [key, count] of Object.entries(groupedMappings)) {
      console.log(`   ${key}: ${count} metric(s)`);
    }
    console.log('\n💡 Copy this file to the other server before running setup.js\n');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message, '\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  exportMetricMappings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { exportMetricMappings };
