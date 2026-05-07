# BSI Telemetry Reports - Backend

[![Node.js](https://img.shields.io/badge/Node.js-22.x-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

High-performance Node.js/Express backend for the BSI Telemetry Reports system. Provides RESTful API, user management, node assignment, and real-time data processing.

## 🚀 Features

### Core Features

- **RESTful API** with JWT authentication and role-based access control (RBAC)
- **Dynamic Metric Mapping System (v2.1.0)** - Grafana-style configuration for custom visualizations
  - Intelligent column data analysis with node-specific filtering
  - Real-time detection of columns with data (percentage, count, statistics)
  - Dynamic SQL query building based on user-configured mappings
  - Custom metric names displayed on dashboard
- **User Management System** with admin, manager, and viewer roles
- **Node Assignment** for granular access control
- **Comprehensive Error Handling** with custom middleware
- **Activity Logging** for audit compliance

### Performance & Scalability

- **Caching** with node-cache for improved response times
- **Rate Limiting** to prevent abuse (5 login attempts per 15 minutes)
- **Connection Pooling** for efficient database operations

### Security

- **JWT Authentication** with bcrypt password hashing (10 salt rounds)
- **Role-Based Access Control (RBAC)** with three permission levels
- **CORS** configuration with dynamic origin support
- **Trust Proxy** enabled for nginx reverse proxy compatibility
- **Rate Limiting** optimized for proxy environments (60 requests per minute)
- **Input Sanitization** and validation
- **Activity Logging** for security audit trails
- **Account Status Management** (active/inactive users)
- **Password Strength Validation** (minimum 8 characters)

## 🛠 Getting Started

### Prerequisites

- Node.js 22.x (LTS recommended)
- MySQL 8.0+ or compatible database
- npm 10.x or yarn
- Git

### 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd Telemetry-Reporting/backend
   ```

2. **Install dependencies**

   ```bash
   # Using npm
   npm install
   
   # Or using yarn
   yarn install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   # Update database credentials and other settings
   ```

4. **Database setup**

   ```bash
   # Automated setup (recommended) - creates tables and imports metric mappings
   node database/setup.js
   
   # Manual migration (alternative)
   mysql -u username -p database_name < database/migrations/001_create_users_table.sql
   mysql -u username -p database_name < database/migrations/002_create_user_node_assignments.sql
   mysql -u username -p database_name < database/migrations/003_create_metric_mappings.sql
   mysql -u username -p database_name < database/migrations/004_add_color_to_metric_mappings.sql
   ```

   **Note:** The automated `setup.js` script will automatically import metric mappings from `database/metric_mappings_export.sql` if the file exists.

5. **Start the server**

   ```bash
   # Development mode with hot-reload
   npm run dev
   
   # Production mode
   npm start
   
   # Using Docker
   docker-compose up -d
   ```

6. **Access the API**

   - API Documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
   - Health Check: [http://localhost:5000/health](http://localhost:5000/health)
   - API Base URL: [http://localhost:5000/api](http://localhost:5000/api) by default.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=horiserverdatalive

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM="BSI Telemetry <noreply@bsitelemetry.com>"

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100

# Cache Settings
CACHE_TTL=300  # 5 minutes

# Admin Authentication
ADMIN_USERNAME=BSI
ADMIN_PASSWORD_HASH=$2b$10$qDH7bN/lOUxoESYtFmmFG.zfnPR8YaBTyVxIVSaMw5x5zTW/l6eRq

# Session Configuration
SESSION_TIMEOUT_MINUTES=30
```

### Network & CORS Configuration

The backend is configured to handle requests from specific origins defined in the environment variables for security.

#### Setup

1. Copy `.env.example` to `.env` if you haven't already:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and update the `ALLOWED_ORIGINS` variable with your frontend URLs:

   ```plaintext
   # Example:
   ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000,http://your-ip:3010
   ```

#### CORS Configuration

- **Allowed Methods**:
  - GET, POST, PUT, DELETE, OPTIONS
  - PATCH for partial updates
- **Allowed Headers**:
  - Authorization
  - Content-Type
  - Accept
  - Cache-Control
  - Pragma
  - Expires
  - If-Modified-Since
  - X-HTTP-Method-Override
  - X-Requested-With
- **Credentials**: Enabled (cookies, HTTP authentication)
- **Preflight Cache**: 24 hours
- **Max Age**: 86400 seconds

#### Nginx Reverse Proxy Configuration

When deploying behind nginx, the backend is configured to:

- **Trust Proxy**: Enabled (`app.set('trust proxy', true)`) to correctly identify client IPs from `X-Forwarded-For` headers
- **Rate Limiter**: Configured with `validate: {trustProxy: false}` to prevent validation errors while still using proxy headers
- **Standard Headers**: Rate limit info returned in `RateLimit-*` headers for better client feedback

This configuration ensures proper IP-based rate limiting and logging when the backend is accessed through nginx reverse proxy.

## � Authentication

The backend implements JWT-based authentication for secure access control.

### Authentication Endpoints

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "BSI",
  "password": "Reporting2026"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "BSI",
    "role": "admin"
  },
  "expiresIn": 1800
}
```

#### Verify Token

```http
GET /api/auth/verify
Authorization: Bearer <token>
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Protected Routes

All API routes require authentication:

- `GET /api/nodes` - Get all nodes
- `GET /api/basestations/:nodeName` - Get base stations for a node
- `GET /api/telemetry/:nodeName/:baseStation` - Get telemetry data (dynamically filtered by metric mappings)
- `GET /api/basestations-map` - Get base stations with coordinates
- `GET /api/metric-mappings/columns` - Get available columns with data analysis
- `GET /api/metric-mappings` - Get/Create/Update/Delete metric mappings (Admin only)
- `GET /api/telemetry-mappings/:nodeName/:baseStation` - Get metric mappings for a node

### Authentication Middleware

The authentication middleware (`/middleware/auth.js`) validates JWT tokens and returns appropriate error codes:

- `NO_TOKEN` - No token provided in Authorization header
- `TOKEN_EXPIRED` - Token has expired (30 minutes)
- `INVALID_TOKEN` - Token is invalid or malformed

### Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: Signed with `JWT_SECRET`, expire after `SESSION_TIMEOUT_MINUTES`
- **Rate Limiting**: Login endpoint limited to 5 attempts per 15 minutes
- **Error Codes**: Specific error codes for different authentication failures

### Admin Credentials

Default admin user (configured in `.env`):

- **Username**: `BSI`
- **Password**: `Reporting2026` (stored as bcrypt hash)
- **Role**: Administrator

**Password Hash Generation:**

```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('Reporting2026', 10);
// Result: $2b$10$qDH7bN/lOUxoESYtFmmFG.zfnPR8YaBTyVxIVSaMw5x5zTW/l6eRq
```

### Troubleshooting Authentication

#### 401 Errors After Login

If clients receive 401 errors after successful login:

1. **Verify token is being sent**: Check that the `Authorization: Bearer <token>` header is present in requests
2. **Check token expiry**: Tokens expire after 30 minutes (configurable via `SESSION_TIMEOUT_MINUTES`)
3. **Validate JWT_SECRET**: Ensure the `JWT_SECRET` in `.env` matches what was used to sign the token
4. **Review middleware order**: Authentication middleware must be applied before protected routes

#### Common Issues

- **Missing Authorization header**: Frontend must include token in all API requests
- **Token format**: Must be `Bearer <token>`, not just the token string
- **CORS issues**: Ensure frontend origin is in `ALLOWED_ORIGINS`
- **Stale tokens**: Clients should clear localStorage and re-login if tokens become invalid

## � User Management

The system supports multiple users with role-based access control (RBAC).

### User Roles

- **Admin**: Full system access, can manage users, view all data
- **Manager**: Can view users and all data, limited management capabilities
- **Viewer**: Read-only access to telemetry data

### Database Schema

The user management system uses three tables:

1. **users**: Stores user accounts with roles and profile information
2. **user_sessions**: Tracks active sessions (future feature)
3. **user_activity_log**: Audit trail of user actions

### User Management Endpoints

#### Create User (Admin Only)

```http
POST /api/users/signup
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "viewer",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Get All Users (Admin/Manager)

```http
GET /api/users
Authorization: Bearer <token>
```

#### Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Update User

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "role": "manager",
  "isActive": true
}
```

**Note**: Only admins can change roles and active status. Users can update their own profile.

#### Delete User (Admin Only)

```http
DELETE /api/users/:id
Authorization: Bearer <admin_token>
```

#### Get Activity Logs (Admin Only)

```http
GET /api/users/activity/logs?limit=100&userId=1&action=LOGIN
Authorization: Bearer <admin_token>
```

### Role-Based Access Control

Routes are protected with middleware that checks user roles:

- `requireAdmin`: Only admin users can access
- `requireAdminOrManager`: Admin or manager users can access
- Profile routes: Users can access their own profile, admins/managers can access any profile

### Database Migration

Run the migration to create user tables:

```bash
mysql -u your_user -p your_database < backend/database/migrations/001_create_users_table.sql
```

This will:

- Create the `users`, `user_sessions`, and `user_activity_log` tables
- Insert the default admin user (BSI)
- Set up foreign keys and indexes

## 🔐 Node Assignment System

The system includes granular node access control, allowing admins to restrict which telemetry nodes each user can view.

### Access Modes

#### 1. Access to All Nodes

- Admins have this by default (`access_all_nodes = 1`)
- Can be granted to any user
- User sees all nodes in the system
- Overrides individual node assignments

#### 2. Specific Node Assignment

- Assign individual nodes to users
- Users only see assigned nodes
- Multiple nodes can be assigned per user
- Assignments tracked with notes and timestamps

### Node Assignment Endpoints

#### Get User's Node Assignments

```http
GET /api/node-assignments/user/:userId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "assignments": [
    {
      "id": 1,
      "userId": 2,
      "nodeName": "NAIROBI_CBD",
      "assignedBy": 1,
      "assignedByUsername": "BSI",
      "assignedAt": "2026-02-10T09:30:00Z",
      "notes": "Primary monitoring node"
    }
  ]
}
```

#### Get Available Nodes (Admin Only)

```http
GET /api/node-assignments/available-nodes
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "success": true,
  "nodes": ["NAIROBI_CBD", "MOMBASA_PORT", "KISUMU_WEST", ...]
}
```

#### Assign Nodes to User (Admin Only)

```http
POST /api/node-assignments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": 2,
  "nodeNames": ["NAIROBI_CBD", "MOMBASA_PORT"],
  "notes": "Assigned for regional monitoring"
}
```

#### Remove Node Assignment (Admin Only)

```http
DELETE /api/node-assignments/:id
Authorization: Bearer <admin_token>
```

Or by user and node:

```http
DELETE /api/node-assignments/user/:userId/node/:nodeName
Authorization: Bearer <admin_token>
```

#### Toggle Access to All Nodes (Admin Only)

```http
PUT /api/node-assignments/user/:userId/access-all
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "accessAllNodes": true
}
```

### Node Filtering

The `/api/nodes` endpoint automatically filters nodes based on user assignments:

- **Admins**: See all nodes (bypass filtering)
- **Users with `access_all_nodes = 1`**: See all nodes
- **Users with specific assignments**: Only see assigned nodes
- **Users with no assignments**: See no nodes

This filtering is enforced at the API level to ensure data security.

## 📚 API Documentation

API documentation is available at `/api-docs` when running in development mode. The documentation is generated using Swagger/OpenAPI.

To view the API documentation:

1. Start the server in development mode:

   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:

   ```link
   http://localhost:5000/api-docs
   ```

## 📦 Available Scripts

- `npm start` - Start the backend server
- `npm run db:setup` - Run automated database setup and migrations
- `npm run db:migrate` - Alias for db:setup

## � Deploying to New Environments

### Migrating Metric Mappings

When deploying to a new server or computer, you can migrate your existing metric mapping configurations:

#### 1. Export from Source Environment

On your development/source computer:

```bash
cd backend
node database/migrate_mappings.js
```

This creates `database/metric_mappings_export.sql` with all your configured metrics.

#### 2. Sync Code to Target Environment

On the target computer:

```bash
git pull origin main
```

If the export file wasn't committed, manually copy `metric_mappings_export.sql` to `backend/database/`.

#### 3. Run Automated Setup

On the target computer:

```bash
cd backend
node database/setup.js
```

The script will:

- Create all required database tables
- Automatically import metric mappings from the export file
- Show a summary of imported configurations

**Example Output:**

```text
✅ All tables verified successfully!

📦 Importing metric mappings...
✅ Imported 21 metric mapping(s)
```

This ensures consistent metric configurations across all environments without manual reconfiguration.

## 📝 Logging System

The backend includes a comprehensive structured logging system for audit trails, debugging, and monitoring.

### Features

- **Structured JSON Format** — All logs in JSON Lines format for easy parsing
- **Weekly File Rotation** — New log file created every Sunday (`logs_YYYY-MM-DD.jsonl`)
- **Dual Output** — Logs written to both file and database (`user_activity_log` table)
- **Log Levels** — DEBUG, INFO, WARN, ERROR
- **Categories** — AUTH, API, SLIDESHOW, CRUD, SYSTEM
- **Non-Blocking** — Async DB inserts never slow down the application

### Log Location

```bash
backend/logs/logs_2026-04-26.jsonl  (example: week starting Sunday, April 26)
```

### Log Format

```json
{"timestamp":"2026-04-28T09:23:32.094Z","level":"INFO","category":"AUTH","message":"User BSI logged in","userId":1,"ip":"::1"}
{"timestamp":"2026-04-28T09:23:38.580Z","level":"INFO","category":"API","message":"GET /api/nodes → 200 (223ms)","userId":1,"ip":"::1","metadata":{"method":"GET","path":"/api/nodes","status":200,"duration":223}}
```

### Logger Usage

```javascript
const logger = require('./utils/logger');

// Basic logging
logger.info('SYSTEM', 'Server started');
logger.warn('AUTH', 'Token expired', { userId: 1, ip: '127.0.0.1' });
logger.error('CRUD', 'Database error', { metadata: { error: err.message } });

// Auth events
logger.auth.login('username', { userId: 1, ip: '127.0.0.1' });
logger.auth.logout('username', { userId: 1, ip: '127.0.0.1' });
logger.auth.failedLogin('username', 'Invalid password', { ip: '127.0.0.1' });

// API events
logger.api.request('GET', '/api/nodes', { userId: 1, ip: '127.0.0.1' });
logger.api.response('GET', '/api/nodes', 200, 150, { userId: 1, ip: '127.0.0.1' });

// CRUD events
logger.crud.create('users', 123, { userId: 1, ip: '127.0.0.1' });
logger.crud.read('telemetry', { userId: 1, ip: '127.0.0.1' });
logger.crud.update('mappings', 456, { userId: 1, ip: '127.0.0.1' });

// Slideshow events
logger.slideshow.start({ userId: 1, ip: '127.0.0.1' });
logger.slideshow.switch('serviceId', { userId: 1, ip: '127.0.0.1' });
```

### Database Schema 2

The `user_activity_log` table stores structured logs:

| Column       | Type         | Description                                |
|--------------|--------------|--------------------------------------------|
| `id`         | INT          | Auto-increment primary key                 |
| `user_id`    | INT          | User ID (nullable)                         |
| `level`      | ENUM         | DEBUG, INFO, WARN, ERROR                   |
| `category`   | ENUM         | AUTH, API, SLIDESHOW, CRUD, SYSTEM         |
| `action`     | VARCHAR(50)  | Action type (LOGIN, LOGOUT, REQUEST, etc.) |
| `resource`   | VARCHAR(100) | Resource being accessed                    |
| `details`    | TEXT         | Human-readable description                 |
| `ip_address` | VARCHAR(45)  | Client IP address                          |
| `metadata`   | JSON         | Structured additional data                 |
| `created_at` | TIMESTAMP    | Log timestamp                              |

### Querying Logs

```sql
-- Recent login attempts
SELECT * FROM user_activity_log 
WHERE category = 'AUTH' AND action = 'LOGIN' 
ORDER BY created_at DESC LIMIT 10;

-- API errors in last hour
SELECT * FROM user_activity_log 
WHERE level = 'ERROR' AND category = 'API' 
AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- User activity summary
SELECT category, action, COUNT(*) as count 
FROM user_activity_log 
WHERE user_id = 1 AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY category, action;
```

### Environment Variables 2

```env
# Optional: Enable console output in addition to file/DB (default: errors only)
LOG_TO_CONSOLE=true
```

### Log Rotation

- Logs automatically rotate weekly (new file every Sunday)
- Old log files are not automatically deleted
- Manually archive or delete old logs as needed:

```bash
# Archive logs older than 30 days
find backend/logs/ -name "logs_*.jsonl" -mtime +30 -exec gzip {} \;

# Delete logs older than 90 days
find backend/logs/ -name "logs_*.jsonl" -mtime +90 -delete
```

### Git Ignore

Log files are excluded from Git:

```gitignore
backend/logs/
*.log
```

## �️ Base Station Map

The system includes an interactive map visualization showing all base stations across Kenya with real-time status indicators.

### Data Sources

The map combines data from two tables:

1. **`mapviewtable`** — GPS coordinates and status counter
   - `BaseStationName`: Station identifier
   - `Latitude` / `Longitude`: GPS coordinates
   - `BaseStationStatus`: Counter value (1-50)
   - `time`: Timestamp of reading

2. **`node_status_table`** — Online/offline detection
   - Uses `MAX(time)` per station to determine if station reported within last 3 hours
   - Online: Latest `time` within 3 hours of server time
   - Offline: Latest `time` older than 3 hours

### Status Color Coding

Marker colors reflect `BaseStationStatus` value, with visual distinction for online vs offline:

#### Status Tier (BaseStationStatus)

| Range   | Color       | Hex Code  | Tier     |
|---------|-------------|-----------|----------|
| 1-10    | 🟢 Green    | #1FC700   | Good     |
| 11-30   | 🟠 Orange   | #CF8700   | Warning  |
| 31-50   | 🔴 Red      | #D92A00   | Critical |

#### Online vs Offline Visual Style

| State   | Opacity | Center Dot | Border       | Animation    | Filter          |
|---------|---------|------------|--------------|--------------|-----------------|
| Online  | 100%    | White      | White        | Pulsing glow | Full color      |
| Offline | 50%     | Gray       | Light gray   | Static       | 30% grayscale   |

**Examples:**

- **Bright green + pulse** = Online, status good
- **Dimmed orange + static** = Offline, was in warning state
- **Bright red + pulse** = Online, status critical (needs attention!)
- **Dimmed red + static** = Offline, was critical before going offline

### API Endpoint

**`GET /api/basestations-map`**

Returns all base stations with coordinates and status.

**Query Parameters:**

- `nodeName` (optional): Filter to stations belonging to specific node

**Response:**

```json
[
  {
    "id": "KITUI",
    "name": "KITUI",
    "lat": -1.27639,
    "lng": 38.0325,
    "status": "online",
    "statusTier": "good",
    "statusValue": 4,
    "statusColor": "#1FC700",
    "lastStatusUpdate": "2026-05-04T09:23:00.000Z"
  }
]
```

### Fallback Coordinates

For stations not yet in `mapviewtable`, the system uses hardcoded coordinates for 34+ known locations across Kenya. These are defined in the `/api/basestations-map` endpoint.

### Frontend Component

The `KenyaMap` React component (`frontend/src/components/KenyaMap.js`) renders the map using:

- **Leaflet** for map tiles and markers
- **Framer Motion** for marker animations
- **Material-UI** for popup styling

Features:

- Auto-fit to Kenya boundaries on load
- Pulsing animation for online stations
- Click/hover interactions with station details
- Color-coded markers based on status tier

### Setting Up mapviewtable

If the `mapviewtable` doesn't exist, create it:

```sql
CREATE TABLE mapviewtable (
  BaseStationName VARCHAR(100) NOT NULL,
  Latitude DECIMAL(10,8) NOT NULL,
  Longitude DECIMAL(11,8) NOT NULL,
  BaseStationStatus INT NOT NULL,
  time DATETIME NOT NULL,
  INDEX idx_station_time (BaseStationName, time)
);
```

Insert sample data:

```sql
INSERT INTO mapviewtable (BaseStationName, Latitude, Longitude, BaseStationStatus, time)
VALUES 
  ('KITUI', -1.27639, 38.0325, 4, NOW()),
  ('KAKAMEGA', 0.28273, 34.751, 15, NOW()),
  ('KISUMU', -0.0917, 34.7679, 25, NOW());
```

## 🗺️ My Sites Map

The My Sites page includes a client-specific map showing base stations for each client:

**API Endpoint:** `GET /api/my-sites/clients/:clientId/map-stations`

**Features:**

- **Client View**: Shows all base stations across all client services
- **Service View**: Shows only base stations for the currently selected service
- **Status Filters**: Toggle visibility of green (good), orange (warning), red (critical) stations
- **Online/Offline Toggle**: Filter by connectivity status
- **Slideshow Integration**: Map updates automatically when service changes during slideshow
- **Fixed Kenya View**: Map displays all of Kenya with fixed bounds (no auto-zoom to stations)

**How it works:**

1. Queries `service_metric_assignments` joined with `metric_mappings` to find unique `base_station_name`s
2. Fetches coordinates and status from `mapviewtable`
3. Determines online/offline from `node_status_table.time`
4. Returns stations with same color coding as dashboard map

**Example Use Case:**

- MediaMax client has services across Nairobi, Mombasa, and Kisumu
- Client View shows all 3 stations on the map
- Switching to "Weather Service" (Service View) shows only Kisumu station
- User can filter to see only "critical" (red) stations
- Map maintains fixed view of all Kenya regardless of which stations are visible

## 📊 Metric View Settings

Configure how metrics are displayed in Dashboard and My Sites views.

**Admin Page:** `/metric-view-settings`

**Features:**

- **Graph/Dial Toggle** — Switch between line graphs and gauge/dial displays
  - Line Graph: Time-series with historical data
  - Dial: Current value with color-coded zones (green/orange/red)

- **Merge Groups** — Combine multiple metrics into one multi-line graph
  - Select any metrics to merge
  - Shared time axis with different colored lines
  - Group name displayed on card

- **Batch Operations**
  - Set all metrics to Line Graph
  - Set all metrics to Dial
  - Ungroup all merged metrics

**Database Table:**

```sql
CREATE TABLE metric_view_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_mapping_id INT NOT NULL,
  view_type ENUM('line', 'dial') DEFAULT 'line',
  merge_group_id VARCHAR(36) DEFAULT NULL,
  merge_group_name VARCHAR(100) DEFAULT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (metric_mapping_id) REFERENCES metric_mappings(id) ON DELETE CASCADE
);
```

**API Endpoints:**

- `GET /api/metric-view-settings` — List all settings
- `POST /api/metric-view-settings` — Create/update setting
- `POST /api/metric-view-settings/merge` — Create merge group
- `POST /api/metric-view-settings/ungroup/:groupId` — Ungroup metrics

## 🤝 Troubleshooting

### Node Filtering Issues

If users see all nodes instead of their assigned nodes:

**Diagnostic Script:**

```bash
node check-user-nodes.js
```

This script checks:

- User's role and access settings
- Node assignments in database
- What nodes the user should see
- Potential configuration issues

**Common Issues:**

1. **Frontend not using authenticated axios**
   - Components must import from `'../services/axiosInterceptor'`
   - NOT from `'axios'` directly

2. **User has `access_all_nodes = 1`**
   - Check database: `SELECT access_all_nodes FROM users WHERE username = 'USERNAME'`
   - Set to 0 for specific node access

3. **No node assignments**
   - Assign nodes via User Management UI
   - Or directly in database: `user_node_assignments` table

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please contact:

- **Email**: [support@bsi.com](mailto:support@bsi.com)
- **Issues**: [GitHub Issues](https://github.com/OnsongoMabeya/Telemetry-Reporting/issues)
- **Documentation**: [GitHub Wiki](https://github.com/OnsongoMabeya/Telemetry-Reporting/wiki)

## 🙏 Acknowledgments

- [Express](https://expressjs.com/) - Web framework for Node.js
- [MySQL2](https://github.com/sidorares/node-mysql2) - MySQL client for Node.js
- [JWT](https://jwt.io/) - JSON Web Tokens for authentication
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - Password hashing library
- [Swagger](https://swagger.io/) - API documentation

---

Built with ❤️ by the BSI Engineering Team
