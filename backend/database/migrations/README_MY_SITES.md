# My Sites Database Migration

## Overview

This migration creates the database structure for the My Sites feature, which enables hierarchical service management with clients, services, and granular metric assignments using a **user-client assignment model**.

## Architecture

The My Sites feature uses a client-based access control model:

- Users are assigned to **clients** (not individual services)
- Each client can have multiple **services**
- Each service can have multiple **metric assignments**
- Users access all services belonging to their assigned clients

## Tables Created

### 1. `clients`

Stores client information (e.g., Radio Africa Group, Standard Group)

- Primary key: `id`
- Unique constraint: `name`
- Foreign key: `created_by` → `users(id)`

### 2. `services`

Stores services (e.g., Kameme FM, EMOO FM)

- Primary key: `id`
- Unique constraint: `name`
- Foreign key: `created_by` → `users(id)`

### 3. `client_services`

Many-to-many relationship between clients and services

- A service can belong to multiple clients
- Unique constraint: `(client_id, service_id)`
- Foreign keys: `client_id` → `clients(id)`, `service_id` → `services(id)`

### 4. `service_metric_assignments`

Assigns individual metric mappings to services with custom display names

- Each metric mapping can be assigned to a service with a custom display name
- Example: "Genset01/NAKURU - Kameme FM Forward Power" → Display as "Nakuru Site"
- Unique constraint: `(service_id, metric_mapping_id)`
- Foreign keys: `service_id` → `services(id)`, `metric_mapping_id` → `metric_mappings(id)`

### 5. `user_client_assignments` ⭐ NEW

Assigns specific clients to specific users for access control

- Users can access all services belonging to their assigned clients
- A user can have one or more clients
- Unique constraint: `(user_id, client_id)`
- Foreign keys: `user_id` → `users(id)`, `client_id` → `clients(id)`
- Includes audit fields: `assigned_at`, `assigned_by`

## Views Created

### `v_active_clients`

Shows active clients with creator info and service count

### `v_active_services`

Shows active services with creator info, metric count, and client count

### `v_service_metric_assignments`

Shows service metric assignments with full details (service name, node, base station, metric name, display name, etc.)

### `v_user_client_assignments` ⭐ UPDATED

Shows user-client assignments with full details (replaces `v_user_services`)

## Sample Data

The migration includes sample data for testing:

- **Clients**: Radio Africa Group, Standard Group
- **Services**: Kameme FM, EMOO FM, Spice FM
- **Client-Service Links**:
  - Radio Africa Group → Kameme FM, EMOO FM
  - Standard Group → Spice FM

## How to Run Migration

### Option 1: Using MySQL Command Line

```bash
mysql -u your_username -p your_database_name < backend/database/migrations/005_create_my_sites_tables.sql
```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. Open the migration file: `005_create_my_sites_tables.sql`
4. Execute the script

### Option 3: Using Node.js Script

Create a migration runner script or execute directly:

```javascript
const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const sql = fs.readFileSync('./database/migrations/005_create_my_sites_tables.sql', 'utf8');
  await connection.query(sql);
  console.log('Migration completed successfully!');
  await connection.end();
}

runMigration().catch(console.error);
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check all tables exist
SHOW TABLES LIKE '%client%';
SHOW TABLES LIKE '%service%';

-- Check sample data
SELECT * FROM clients;
SELECT * FROM services;
SELECT * FROM client_services;

-- Check views
SELECT * FROM v_active_clients;
SELECT * FROM v_active_services;
```

## Access Control Model

### User-Client Assignment Flow

1. **Admin assigns clients to users** via My Sites Customization
2. **User accesses My Sites** and sees all clients they're assigned to
3. **User selects a client** from the navbar dropdown
4. **User sees all services** belonging to that client
5. **User selects a service** from the navbar dropdown
6. **Telemetry graphs populate** with all metrics assigned to that service

### Benefits of Client-Based Access

- **Simplified management**: Assign users to clients instead of individual services
- **Scalability**: Adding new services to a client automatically grants access to assigned users
- **Hierarchical organization**: Mirrors real-world client-service relationships
- **Reduced complexity**: Fewer assignment records to manage

## My Sites Features

### My Sites Customization (Admin/Manager)

Located at `/my-sites-customization`, provides complete management interface:

- **Client Management**: Create, edit, delete clients
- **Service Management**: Create, edit, delete services
- **Client-Service Assignments**: Link services to clients
- **Service-Metric Assignments**: Assign metric mappings to services
- **User-Client Assignments**: Grant users access to clients

### My Sites (All Users)

Located at `/my-sites`, provides user-facing telemetry interface:

- **Navbar Filters**: Client, Service, Time Range, and Speed selectors in top navigation bar
- **Smart Telemetry**: Fetches latest available data (not NOW())
- **Time Bucketing**: Performance-optimized data sampling
- **Dashboard-Style Graphs**: Same visualization as main dashboard with area fills
- **Responsive Design**: Mobile-friendly interface
- **Slideshow Mode**: Full-screen auto-cycling display for monitoring screens
  - Play/Stop button in navbar (green ▶ / red ⏹)
  - Speed control dropdown (10s, 20s, 30s default, 1min, 2min)
  - Automatically enters fullscreen when started
  - Cycles through all services for the selected client
  - Preloads next service data for smooth transitions
  - Fade transitions between services (300ms)
  - Auto-hiding overlay controls (5s timeout, reappear on mouse move)
  - Top header: service name, client name, time range, speed, service counter
  - Bottom bar: countdown timer, progress bar, pause/resume, stop, exit fullscreen
  - Session keep-alive via `/api/keep-alive` endpoint (25-min ping)
  - Internet disconnection detection with auto-retry overlay
  - Data reload when connection is restored
  - Dynamic service list refresh (detects added/removed services)
  - ESC key exits slideshow and fullscreen

## Next Steps

After running this migration:

1. ✅ Create backend API endpoints for CRUD operations
2. ✅ Build "My Sites Customization" UI (admin only)
3. ✅ Build "My Sites" UI (all users)
4. ✅ Assign metric mappings to services via the UI
5. ✅ Assign clients to users via the UI (user-client model)
6. ✅ Add slideshow mode with fullscreen cycling, keep-alive, and error handling

## Rollback

To rollback this migration:

```sql
DROP VIEW IF EXISTS v_user_client_assignments;
DROP VIEW IF EXISTS v_service_metric_assignments;
DROP VIEW IF EXISTS v_active_services;
DROP VIEW IF EXISTS v_active_clients;

DROP TABLE IF EXISTS user_client_assignments;
DROP TABLE IF EXISTS service_metric_assignments;
DROP TABLE IF EXISTS client_services;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS clients;
```

## Notes

- All tables use `InnoDB` engine for transaction support
- All tables use `utf8mb4` charset for full Unicode support
- Foreign keys use `ON DELETE CASCADE` for automatic cleanup
- All tables include audit fields: `created_at`, `updated_at`, `created_by`
- All tables include `is_active` flag for soft deletes
