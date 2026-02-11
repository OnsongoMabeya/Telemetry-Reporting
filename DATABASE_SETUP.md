# Database Setup Guide

This guide helps you set up the BSI Telemetry database on a new computer or environment.

## Quick Setup

### Option 1: Automated Setup (Recommended)

**Important:** The setup script uses your database credentials from the `.env` file in the `backend` folder. Make sure to configure your `.env` file with your MySQL credentials before running the setup.

Run the automated setup script that checks and creates all required tables:

```bash
cd backend
npm run db:setup
```

The script will display your configuration before connecting:

```text
📋 Database Configuration:
   Host: localhost
   User: john
   Database: horiserverlive
   Password: ***
```

This script will:

- ✅ Load credentials from your `.env` file
- ✅ Check if all required tables exist
- ✅ Run missing migrations automatically
- ✅ Verify the setup was successful
- ✅ Create the default admin account

### Option 2: Manual Setup

If you prefer to run migrations manually:

```bash
# From the project root
cd backend

# Run user management migration
mysql -u your_user -p your_database < database/migrations/001_create_users_table.sql

# Run node assignment migration
mysql -u your_user -p your_database < database/migrations/002_create_user_node_assignments.sql
```

Replace `your_user` and `your_database` with your MySQL credentials.

## Prerequisites

Before running the setup, ensure:

1. **MySQL is installed and running**

   ```bash
   # Check if MySQL is running
   mysql --version
   ```

2. **Database exists**

   ```sql
   -- Create database if it doesn't exist
   CREATE DATABASE horiserverlive;
   ```

3. **Environment variables are configured**

   Create a `.env` file in the `backend` folder with **your local MySQL credentials**:

   ```env
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=horiserverlive
   JWT_SECRET=your_secret_key_here
   SESSION_TIMEOUT_MINUTES=30
   ```

   **Important for Multiple Computers:**
   - Each computer should have its own `.env` file with local MySQL credentials
   - The `.env` file is gitignored and won't be committed to version control
   - Example: Computer A uses `DB_USER=root`, Computer B uses `DB_USER=john`
   - The setup scripts automatically read from your local `.env` file

## Required Tables

The setup creates the following tables:

### User Management Tables

1. **`users`** - User accounts with roles and authentication
   - Stores username, email, password (hashed), role, profile info
   - Default admin: `BSI` / `Reporting2026`

2. **`user_sessions`** - Session tracking (future feature)
   - Tracks active user sessions
   - Session tokens and expiry

3. **`user_activity_log`** - Audit trail
   - Logs all user actions (login, logout, CRUD operations)
   - IP addresses and timestamps

### Node Assignment Tables

1. **`user_node_assignments`** - Node access control

   - Maps users to specific telemetry nodes
   - Tracks who assigned nodes and when
   - Includes notes for context

### Additional Columns

- **`users.access_all_nodes`** - Boolean flag for unrestricted node access

## Verification

After running the setup, verify all tables exist:

```sql
-- Connect to database
mysql -u your_user -p horiserverlive

-- Check tables
SHOW TABLES;

-- Should show:
-- +---------------------------+
-- | Tables_in_horiserverlive  |
-- +---------------------------+
-- | user_activity_log         |
-- | user_node_assignments     |
-- | user_sessions             |
-- | users                     |
-- +---------------------------+
```

Verify the default admin account:

```sql
SELECT id, username, email, role, is_active, access_all_nodes 
FROM users 
WHERE username = 'BSI';

-- Should return:
-- +----+----------+---------------+-------+-----------+------------------+
-- | id | username | email         | role  | is_active | access_all_nodes |
-- +----+----------+---------------+-------+-----------+------------------+
-- |  1 | BSI      | admin@bsi.com | admin |         1 |                1 |
-- +----+----------+---------------+-------+-----------+------------------+
```

## Troubleshooting

### Connection Refused

**Error:** `ECONNREFUSED`

**Solution:**

- Ensure MySQL is running: `sudo systemctl start mysql` (Linux) or check MySQL service (Windows/Mac)
- Verify `DB_HOST` in `.env` file
- Check firewall settings

### Database Not Found

**Error:** `ER_BAD_DB_ERROR: Unknown database 'horiserverlive'`

**Solution:**

```sql
CREATE DATABASE horiserverlive;
```

### Access Denied

**Error:** `ER_ACCESS_DENIED_ERROR`

**Solution:**

- Verify MySQL username and password in `.env`
- Grant proper permissions:

  ```sql
  GRANT ALL PRIVILEGES ON horiserverlive.* TO 'your_user'@'localhost';
  FLUSH PRIVILEGES;
  ```

### Migration Already Run

**Error:** Table already exists

**Solution:**

- The setup script automatically detects existing tables
- If you need to reset, drop and recreate the database:

  ```sql
  DROP DATABASE horiserverlive;
  CREATE DATABASE horiserverlive;
  ```

  Then run `npm run db:setup` again

### Missing Columns

**Error:** Column `access_all_nodes` doesn't exist

**Solution:**

```bash
# Re-run the node assignment migration
mysql -u your_user -p horiserverlive < database/migrations/002_create_user_node_assignments.sql
```

## Migration Files

### 001_create_users_table.sql

Creates:

- `users` table
- `user_sessions` table
- `user_activity_log` table
- Default admin account (BSI)

### 002_create_user_node_assignments.sql

Creates:

- `user_node_assignments` table
- Adds `access_all_nodes` column to `users` table
- Sets up foreign key constraints

## Default Admin Account

After setup, you can login with:

- **Username:** `BSI`
- **Password:** `Reporting2026`
- **Role:** Administrator
- **Access:** All nodes (unrestricted)

**⚠️ Security Note:** Change the default password after first login!

## Running on Different Environments

### Development

```bash
# .env
DB_HOST=localhost
DB_NAME=horiserverlive
```

### Staging

```bash
# .env
DB_HOST=staging-db.example.com
DB_NAME=horiserverlive_staging
```

### Production

```bash
# .env
DB_HOST=prod-db.example.com
DB_NAME=horiserverlive_prod
JWT_SECRET=strong_random_secret_key
```

## Backup and Restore

### Backup

```bash
# Backup all data
mysqldump -u your_user -p horiserverlive > backup_$(date +%Y%m%d).sql

# Backup structure only
mysqldump -u your_user -p --no-data horiserverlive > structure_$(date +%Y%m%d).sql
```

### Restore

```bash
mysql -u your_user -p horiserverlive < backup_20260210.sql
```

## Next Steps

After database setup:

1. **Start the backend server**

   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend**

   ```bash
   cd frontend
   npm start
   ```

3. **Login to the application**
   - Navigate to `http://localhost:3010`
   - Use BSI credentials
   - Create additional users via User Management

4. **Assign nodes to users**
   - Go to User Management
   - Click "Assign Nodes" for each user
   - Configure access levels

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs for detailed error messages
3. Verify `.env` configuration
4. Ensure MySQL version compatibility (5.7+ or 8.0+)

For additional help, see:

- [Backend README](backend/README.md)
- [User Management Guide](USER_MANAGEMENT_GUIDE.md)
- [Main README](README.md)
