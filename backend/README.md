# BSI Telemetry Reports - Backend

[![Node.js](https://img.shields.io/badge/Node.js-22.x-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

High-performance Node.js/Express backend for the BSI Telemetry Reports system. Provides RESTful API, user management, node assignment, and real-time data processing.

## 🚀 Features

### Core Features

- **RESTful API** with JWT authentication and role-based access control (RBAC)
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
   # Run migrations
   npx knex migrate:latest
   
   # Seed initial data (optional)
   npx knex seed:run
   ```

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
- `GET /api/telemetry/:nodeName/:baseStation` - Get telemetry data
- `GET /api/basestations-map` - Get base stations with coordinates

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

## � Available Scripts

- `npm start` - Start the backend server
- `npm run db:setup` - Run automated database setup and migrations
- `npm run db:migrate` - Alias for db:setup

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
