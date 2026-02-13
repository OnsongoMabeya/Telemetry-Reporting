const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function getTableColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'horiserverlive'
  });

  try {
    console.log('\n=== Node Status Table Columns ===\n');

    // Get all columns from node_status_table
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'node_status_table'
       ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME || 'horiserverlive']
    );

    console.log(`Total columns: ${columns.length}\n`);

    // Display all columns with their position
    columns.forEach((col, index) => {
      console.log(`${col.ORDINAL_POSITION}. ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Filter analog, digital, and outValue columns
    console.log('\n=== Analog Columns ===\n');
    const analogCols = columns.filter(c => c.COLUMN_NAME.toLowerCase().includes('analog'));
    analogCols.forEach(col => {
      console.log(`  ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME}`);
    });

    console.log('\n=== Digital Columns ===\n');
    const digitalCols = columns.filter(c => c.COLUMN_NAME.toLowerCase().includes('digital'));
    digitalCols.forEach(col => {
      console.log(`  ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME}`);
    });

    console.log('\n=== OutValue Columns ===\n');
    const outValueCols = columns.filter(c => c.COLUMN_NAME.toLowerCase().includes('outvalue'));
    outValueCols.forEach(col => {
      console.log(`  ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME}`);
    });

    console.log(`\nAnalog columns: ${analogCols.length}`);
    console.log(`Digital columns: ${digitalCols.length}`);
    console.log(`OutValue columns: ${outValueCols.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

getTableColumns().catch(console.error);
