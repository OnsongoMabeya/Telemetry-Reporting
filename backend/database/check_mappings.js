const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'horiserverlive',
  port: process.env.DB_PORT || 3306
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask yes/no questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Helper function to format table
function formatTable(data, headers) {
  if (data.length === 0) {
    return 'No data to display';
  }

  // Calculate column widths
  const widths = headers.map((header, i) => {
    const headerWidth = header.length;
    const dataWidth = Math.max(...data.map(row => String(row[i] || '').length));
    return Math.max(headerWidth, dataWidth);
  });

  // Create separator line
  const separator = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';

  // Format header
  const headerRow = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';

  // Format data rows
  const dataRows = data.map(row => 
    '| ' + row.map((cell, i) => String(cell || '').padEnd(widths[i])).join(' | ') + ' |'
  );

  return [separator, headerRow, separator, ...dataRows, separator].join('\n');
}

// Export to CSV
function exportToCSV(mappedData, unmappedData, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filepath = path.join(__dirname, `${filename}_${timestamp}.csv`);

  let csvContent = '';

  // Mapped configurations
  csvContent += 'MAPPED CONFIGURATIONS\n';
  csvContent += 'Node,Base Station,Database Column,Metric Name,Unit,Display Order,Color\n';
  mappedData.forEach(row => {
    csvContent += `"${row[0]}","${row[1]}","${row[2]}","${row[3]}","${row[4] || ''}",${row[5]},"${row[6] || ''}"\n`;
  });

  csvContent += '\n\n';

  // Unmapped nodes
  csvContent += 'UNMAPPED NODE/BASE STATION COMBINATIONS\n';
  csvContent += 'Node,Base Station\n';
  unmappedData.forEach(row => {
    csvContent += `"${row[0]}","${row[1]}"\n`;
  });

  fs.writeFileSync(filepath, csvContent);
  return filepath;
}

async function checkMappings() {
  let connection;

  try {
    console.log('\n🔍 Checking Metric Mappings Configuration...\n');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // 1. Get all mapped configurations
    console.log('📊 MAPPED CONFIGURATIONS:\n');
    const [mappedRows] = await connection.execute(`
      SELECT 
        node_name,
        base_station_name,
        column_name,
        metric_name,
        unit,
        display_order,
        color
      FROM metric_mappings
      WHERE is_active = 1
      ORDER BY node_name, base_station_name, display_order
    `);

    if (mappedRows.length === 0) {
      console.log('⚠️  No metric mappings configured yet!\n');
    } else {
      const mappedData = mappedRows.map(row => [
        row.node_name,
        row.base_station_name,
        row.column_name,
        row.metric_name,
        row.unit || '',
        row.display_order,
        row.color || 'default'
      ]);

      const mappedTable = formatTable(
        mappedData,
        ['Node', 'Base Station', 'Database Column', 'Metric Name', 'Unit', 'Order', 'Color']
      );

      console.log(mappedTable);
      console.log(`\n✅ Total mapped configurations: ${mappedRows.length}\n`);

      // Show summary by node/base station
      const summary = {};
      mappedRows.forEach(row => {
        const key = `${row.node_name}/${row.base_station_name}`;
        summary[key] = (summary[key] || 0) + 1;
      });

      console.log('📈 Summary by Node/Base Station:');
      Object.entries(summary).forEach(([key, count]) => {
        console.log(`   - ${key}: ${count} metric(s)`);
      });
      console.log('');
    }

    // 2. Get all unique Node/Base Station combinations from node_status_table
    console.log('\n🔍 Checking for unmapped Node/Base Station combinations...\n');

    const [allCombinations] = await connection.execute(`
      SELECT DISTINCT NodeName, NodeBaseStationName
      FROM node_status_table
      WHERE NodeName IS NOT NULL 
        AND NodeBaseStationName IS NOT NULL
        AND NodeName != ''
        AND NodeBaseStationName != ''
      ORDER BY NodeName, NodeBaseStationName
    `);

    // Get mapped combinations
    const mappedCombinations = new Set(
      mappedRows.map(row => `${row.node_name}|${row.base_station_name}`)
    );

    // Find unmapped combinations
    const unmappedCombinations = allCombinations.filter(row => 
      !mappedCombinations.has(`${row.NodeName}|${row.NodeBaseStationName}`)
    );

    if (unmappedCombinations.length === 0) {
      console.log('✅ All Node/Base Station combinations have been mapped!\n');
    } else {
      console.log('⚠️  UNMAPPED NODE/BASE STATION COMBINATIONS:\n');
      
      const unmappedData = unmappedCombinations.map(row => [
        row.NodeName,
        row.NodeBaseStationName
      ]);

      const unmappedTable = formatTable(
        unmappedData,
        ['Node', 'Base Station']
      );

      console.log(unmappedTable);
      console.log(`\n⚠️  Total unmapped combinations: ${unmappedCombinations.length}\n`);
    }

    // Ask if user wants to export to CSV
    const answer = await askQuestion('\n💾 Would you like to export this data to CSV? (y/n): ');
    
    if (answer === 'y' || answer === 'yes') {
      const mappedData = mappedRows.map(row => [
        row.node_name,
        row.base_station_name,
        row.column_name,
        row.metric_name,
        row.unit || '',
        row.display_order,
        row.color || ''
      ]);

      const unmappedData = unmappedCombinations.map(row => [
        row.NodeName,
        row.NodeBaseStationName
      ]);

      const filepath = exportToCSV(mappedData, unmappedData, 'metric_mappings_report');
      console.log(`\n✅ Data exported to: ${filepath}\n`);
    } else {
      console.log('\n📋 Export skipped.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    rl.close();
  }
}

// Run the script
checkMappings().then(() => {
  console.log('✅ Done!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
