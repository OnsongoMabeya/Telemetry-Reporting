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

// Analog columns to check
const ANALOG_COLUMNS = [
  'Analog1Value',
  'Analog2Value',
  'Analog3Value',
  'Analog4Value',
  'Analog5Value',
  'Analog6Value',
  'Analog7Value',
  'Analog8Value',
  'Analog9Value',
  'Analog10Value',
  'Analog11Value',
  'Analog12Value',
  'Analog13Value',
  'Analog14Value',
  'Analog15Value',
  'Analog16Value'
];

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
function exportToCSV(data, filename) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filepath = path.join(__dirname, `${filename}_${timestamp}.csv`);

  let csvContent = '';

  // Header
  csvContent += 'Node,Base Station,Database Column,Metric Name,Has Been Mapped\n';
  
  // Data rows
  data.forEach(row => {
    csvContent += `"${row[0]}","${row[1]}","${row[2]}","${row[3] || ''}","${row[4]}"\n`;
  });

  fs.writeFileSync(filepath, csvContent);
  return filepath;
}

async function checkMappings() {
  let connection;

  try {
    console.log('\n🔍 Checking Analog Columns with Data and Mapping Status...\n');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // 1. Get all metric mappings
    const [mappedRows] = await connection.execute(`
      SELECT 
        node_name,
        base_station_name,
        column_name,
        metric_name
      FROM metric_mappings
      WHERE is_active = 1
    `);

    // Create a map for quick lookup: "NodeName|BaseStation|ColumnName" -> metric_name
    const mappingLookup = new Map();
    mappedRows.forEach(row => {
      const key = `${row.node_name}|${row.base_station_name}|${row.column_name}`;
      mappingLookup.set(key, row.metric_name);
    });

    // 2. Get all unique Node/Base Station combinations from node_status_table
    const [nodeCombinations] = await connection.execute(`
      SELECT DISTINCT NodeName, NodeBaseStationName
      FROM node_status_table
      WHERE NodeName IS NOT NULL 
        AND NodeBaseStationName IS NOT NULL
        AND NodeName != ''
        AND NodeBaseStationName != ''
      ORDER BY NodeName, NodeBaseStationName
    `);

    console.log(`📊 Found ${nodeCombinations.length} Node/Base Station combinations\n`);
    console.log('🔍 Checking which analog columns have data...\n');

    // 3. For each Node/Base Station combination, check which analog columns have data
    const results = [];
    let totalChecked = 0;
    let totalWithData = 0;

    for (const combo of nodeCombinations) {
      const nodeName = combo.NodeName;
      const baseStation = combo.NodeBaseStationName;

      // Check each analog column for this Node/Base Station
      for (const analogColumn of ANALOG_COLUMNS) {
        totalChecked++;
        
        // Check if this column has any non-null data
        const [dataCheck] = await connection.execute(`
          SELECT COUNT(*) as count
          FROM node_status_table
          WHERE NodeName = ?
            AND NodeBaseStationName = ?
            AND ${analogColumn} IS NOT NULL
            AND ${analogColumn} != ''
          LIMIT 1
        `, [nodeName, baseStation]);

        if (dataCheck[0].count > 0) {
          totalWithData++;
          
          // Check if this combination is mapped
          const lookupKey = `${nodeName}|${baseStation}|${analogColumn}`;
          const metricName = mappingLookup.get(lookupKey) || '';
          const isMapped = metricName !== '';

          results.push({
            node: nodeName,
            baseStation: baseStation,
            column: analogColumn,
            metricName: metricName,
            mapped: isMapped ? 'Yes' : 'No'
          });
        }
      }
    }

    console.log(`✅ Checked ${totalChecked} combinations, found ${totalWithData} with data\n`);

    // 4. Display results in table
    if (results.length === 0) {
      console.log('⚠️  No analog columns with data found!\n');
    } else {
      console.log('📊 ANALOG COLUMNS WITH DATA:\n');
      
      const tableData = results.map(row => [
        row.node,
        row.baseStation,
        row.column,
        row.metricName,
        row.mapped
      ]);

      const table = formatTable(
        tableData,
        ['Node', 'Base Station', 'Database Column', 'Metric Name', 'Has Been Mapped']
      );

      console.log(table);
      
      // Summary statistics
      const mappedCount = results.filter(r => r.mapped === 'Yes').length;
      const unmappedCount = results.filter(r => r.mapped === 'No').length;
      
      console.log(`\n📈 Summary:`);
      console.log(`   - Total analog columns with data: ${results.length}`);
      console.log(`   - Mapped: ${mappedCount} (${((mappedCount/results.length)*100).toFixed(1)}%)`);
      console.log(`   - Unmapped: ${unmappedCount} (${((unmappedCount/results.length)*100).toFixed(1)}%)`);
      console.log('');

      // Ask if user wants to export to CSV
      const answer = await askQuestion('\n💾 Would you like to export this data to CSV? (y/n): ');
      
      if (answer === 'y' || answer === 'yes') {
        const filepath = exportToCSV(tableData, 'analog_columns_mapping_status');
        console.log(`\n✅ Data exported to: ${filepath}\n`);
      } else {
        console.log('\n📋 Export skipped.\n');
      }
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
