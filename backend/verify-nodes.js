const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verifyNodes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'horiserverlive'
  });

  try {
    console.log('\n=== Node/Base Station Verification ===\n');

    // Get all unique node/base station combinations from node_status_table
    const [allNodes] = await connection.query(`
      SELECT DISTINCT NodeName, NodeBaseStationName
      FROM node_status_table
      ORDER BY NodeName, NodeBaseStationName
    `);

    console.log(`Total unique node/base station combinations: ${allNodes.length}\n`);

    // Get nodes with metric mappings
    const [mappedNodes] = await connection.query(`
      SELECT DISTINCT node_name, base_station_name
      FROM metric_mappings
      WHERE is_active = TRUE
    `);

    console.log(`Nodes with metric mappings: ${mappedNodes.length}\n`);

    // Create a set of mapped nodes for quick lookup
    const mappedSet = new Set(
      mappedNodes.map(n => `${n.node_name}|${n.base_station_name}`)
    );

    // Display all nodes with their mapping status
    console.log('Node/Base Station Mapping Status:\n');
    console.log('%-30s %-30s %s', 'Node Name', 'Base Station', 'Status');
    console.log('-'.repeat(80));

    let mappedCount = 0;
    let unmappedCount = 0;

    allNodes.forEach(node => {
      const key = `${node.NodeName}|${node.NodeBaseStationName}`;
      const isMapped = mappedSet.has(key);
      const status = isMapped ? '✅ Mapped' : '❌ Not Mapped';
      
      console.log('%-30s %-30s %s', 
        node.NodeName, 
        node.NodeBaseStationName, 
        status
      );

      if (isMapped) {
        mappedCount++;
      } else {
        unmappedCount++;
      }
    });

    console.log('-'.repeat(80));
    console.log(`\nSummary:`);
    console.log(`  Total nodes: ${allNodes.length}`);
    console.log(`  Mapped: ${mappedCount}`);
    console.log(`  Unmapped: ${unmappedCount}`);
    console.log(`  Coverage: ${((mappedCount / allNodes.length) * 100).toFixed(1)}%\n`);

    // Show unmapped nodes that need configuration
    if (unmappedCount > 0) {
      console.log('\n⚠️  Unmapped Nodes (Need Configuration):\n');
      allNodes.forEach(node => {
        const key = `${node.NodeName}|${node.NodeBaseStationName}`;
        if (!mappedSet.has(key)) {
          console.log(`  - ${node.NodeName} / ${node.NodeBaseStationName}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyNodes().catch(console.error);
