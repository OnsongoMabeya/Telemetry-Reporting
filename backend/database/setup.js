const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'horiserverlive',
  multipleStatements: true
};

async function checkTableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [dbConfig.database, tableName]
  );
  return rows[0].count > 0;
}

async function runMigration(connection, migrationFile) {
  console.log(`\n📄 Running migration: ${path.basename(migrationFile)}`);
  
  try {
    const sql = await fs.readFile(migrationFile, 'utf8');
    await connection.query(sql);
    console.log(`✅ Migration completed: ${path.basename(migrationFile)}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${path.basename(migrationFile)}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 BSI Telemetry Database Setup\n');
    console.log('================================\n');
    
    // Show configuration being used
    console.log('📋 Database Configuration:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Password: ${dbConfig.password ? '***' : '(empty)'}\n`);
    
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log(`✅ Connected successfully!\n`);
    
    // Check required tables
    const requiredTables = {
      'users': '001_create_users_table.sql',
      'user_sessions': '001_create_users_table.sql',
      'user_activity_log': '001_create_users_table.sql',
      'user_node_assignments': '002_create_user_node_assignments.sql'
    };
    
    console.log('🔍 Checking database tables...\n');
    
    const missingTables = [];
    const migrationsToRun = new Set();
    
    for (const [tableName, migrationFile] of Object.entries(requiredTables)) {
      const exists = await checkTableExists(connection, tableName);
      const status = exists ? '✅' : '❌';
      console.log(`${status} Table: ${tableName}`);
      
      if (!exists) {
        missingTables.push(tableName);
        migrationsToRun.add(migrationFile);
      }
    }
    
    // Check for access_all_nodes column in users table
    if (await checkTableExists(connection, 'users')) {
      const [columns] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = 'users' AND column_name = 'access_all_nodes'`,
        [dbConfig.database]
      );
      
      if (columns[0].count === 0) {
        console.log('❌ Column: users.access_all_nodes (missing)');
        migrationsToRun.add('002_create_user_node_assignments.sql');
      } else {
        console.log('✅ Column: users.access_all_nodes');
      }
    }
    
    console.log('\n================================\n');
    
    if (migrationsToRun.size === 0) {
      console.log('🎉 All database tables exist! No migrations needed.\n');
      return true;
    }
    
    console.log(`⚠️  Found ${missingTables.length} missing table(s)\n`);
    console.log('🔄 Running migrations...\n');
    
    // Run migrations in order
    const migrationsDir = path.join(__dirname, 'migrations');
    const orderedMigrations = Array.from(migrationsToRun).sort();
    
    let allSuccess = true;
    for (const migrationFile of orderedMigrations) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const success = await runMigration(connection, migrationPath);
      if (!success) {
        allSuccess = false;
      }
    }
    
    console.log('\n================================\n');
    
    if (allSuccess) {
      console.log('🎉 Database setup completed successfully!\n');
      
      // Verify all tables now exist
      console.log('🔍 Verifying tables...\n');
      let allTablesExist = true;
      
      for (const tableName of Object.keys(requiredTables)) {
        const exists = await checkTableExists(connection, tableName);
        const status = exists ? '✅' : '❌';
        console.log(`${status} Table: ${tableName}`);
        if (!exists) allTablesExist = false;
      }
      
      if (allTablesExist) {
        console.log('\n✅ All tables verified successfully!\n');
        console.log('📝 Default admin account:');
        console.log('   Username: BSI');
        console.log('   Password: Reporting2026\n');
      } else {
        console.log('\n⚠️  Some tables are still missing. Please check the errors above.\n');
      }
      
      return allTablesExist;
    } else {
      console.log('❌ Database setup completed with errors.\n');
      console.log('Please check the error messages above and fix any issues.\n');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Database setup failed:');
    console.error(`   ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting:');
      console.error('   - Make sure MySQL is running');
      console.error('   - Check DB_HOST in your .env file');
      console.error('   - Verify database credentials\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Troubleshooting:');
      console.error(`   - Database '${dbConfig.database}' does not exist`);
      console.error('   - Create it with: CREATE DATABASE ${dbConfig.database};\n');
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
  setupDatabase()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase, checkTableExists };
