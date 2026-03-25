const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  let connection;
  
  try {
    console.log('\n🔄 Starting migration...\n');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'horiserverlive',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    console.log('✅ Connected to database\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📄 Running migration: ${migrationFile}\n`);
    
    // Execute migration
    await connection.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('clients', 'services', 'client_services', 'service_metric_assignments', 'user_service_assignments')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'horiserverlive']);
    
    console.log('📊 Tables created:');
    tables.forEach(table => {
      console.log(`   ✓ ${table.TABLE_NAME}`);
    });
    
    // Check sample data
    console.log('\n📊 Sample data:');
    const [clients] = await connection.query('SELECT COUNT(*) as count FROM clients');
    const [services] = await connection.query('SELECT COUNT(*) as count FROM services');
    const [clientServices] = await connection.query('SELECT COUNT(*) as count FROM client_services');
    
    console.log(`   - Clients: ${clients[0].count}`);
    console.log(`   - Services: ${services[0].count}`);
    console.log(`   - Client-Service Links: ${clientServices[0].count}`);
    
    console.log('\n✨ Migration complete! You can now proceed to Phase 2 (Backend API).\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Get migration file from command line argument or use default
const migrationFile = process.argv[2] || '005_create_my_sites_tables.sql';

runMigration(migrationFile).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
