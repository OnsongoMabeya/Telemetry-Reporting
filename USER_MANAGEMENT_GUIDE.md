# User Management System Guide

## Overview

The BSI Telemetry Reporting System now includes a comprehensive user management system with role-based access control (RBAC). This guide covers setup, usage, and administration.

## Quick Start

### 1. Database Setup

Run the migration to create user tables:

```bash
mysql -u your_user -p your_database < backend/database/migrations/001_create_users_table.sql
```

This creates:

- `users` table - User accounts with roles
- `user_sessions` table - Session tracking
- `user_activity_log` table - Audit trail

### 2. Default Admin Account

The migration automatically creates a default admin account:

- **Username**: `BSI`
- **Password**: `Reporting2026`
- **Role**: Administrator

### 3. Start the Application

```bash
# From project root
npm run dev
```

### 4. Login and Create Users

1. Navigate to `http://localhost:3010`
2. Login with the default admin credentials
3. Click the user avatar icon in the navbar
4. Select "User Management"
5. Click "Add User" to create new accounts

## User Roles

### Admin

- Full system access
- Create, edit, and delete users
- Change user roles and status
- View activity logs
- Access all telemetry data

### Manager

- View all users
- View all telemetry data
- Cannot modify users or roles
- Limited administrative capabilities

### Viewer

- Read-only access to telemetry data
- Cannot access user management
- Cannot modify any data

## Features

### User Management Interface

Located at `/users` route, accessible from the user menu for admins and managers.

#### Create User (Admin Only)

- Username (required, unique)
- Email (required, unique, validated)
- Password (required, min 8 characters)
- First Name (optional)
- Last Name (optional)
- Role (viewer, manager, or admin)

#### Edit User (Admin Only)

- Update email, name, role
- Enable/disable user account
- Change password (optional)
- Cannot change username

#### Delete User (Admin Only)

- Permanently remove user
- Cannot delete own account
- Cascades to sessions and logs

#### View Users (Admin/Manager)

- List all users with details
- Filter and search capabilities
- View last login times
- See user status (active/inactive)

### Activity Logging

All user actions are logged for audit purposes:

- Login/Logout events
- User creation/modification/deletion
- IP address tracking
- Timestamp recording

Admins can view logs at `/api/users/activity/logs`

## API Reference

### Authentication

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
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "BSI",
    "email": "admin@bsi.com",
    "role": "admin",
    "firstName": "BSI",
    "lastName": "Administrator"
  },
  "expiresIn": 1800
}
```

### User Management

#### Create User

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

#### Get All Users

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
  "isActive": true,
  "password": "NewPassword123"
}
```

#### Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <admin_token>
```

#### Get Activity Logs

```http
GET /api/users/activity/logs?limit=100&userId=1&action=LOGIN
Authorization: Bearer <admin_token>
```

## Frontend Integration

### Using AuthContext

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { 
    user,           // Current user object
    isAuthenticated, // Boolean auth status
    isAdmin,        // Check if admin
    isAdminOrManager, // Check if admin or manager
    hasRole,        // Check specific role
    hasAnyRole,     // Check multiple roles
    login,          // Login function
    logout          // Logout function
  } = useAuth();

  return (
    <div>
      <p>Welcome, {user?.username}!</p>
      <p>Role: {user?.role}</p>
      
      {isAdmin() && <AdminPanel />}
      {isAdminOrManager() && <ManagerPanel />}
      <UserDashboard />
    </div>
  );
}
```

### Role-Based Rendering

```javascript
// Check if user is admin
{isAdmin() && <AdminOnlyFeature />}

// Check if user is admin or manager
{isAdminOrManager() && <ManagerFeature />}

// Check specific role
{hasRole('viewer') && <ViewerFeature />}

// Check multiple roles
{hasAnyRole(['admin', 'manager']) && <ManagementFeature />}
```

### Navigation

```javascript
import { Link } from 'react-router-dom';

// Navigate to user management
<Link to="/users">User Management</Link>

// Navigate to dashboard
<Link to="/">Dashboard</Link>
```

## Security Best Practices

### Password Requirements

- Minimum 8 characters
- Mix of letters, numbers, and symbols recommended
- Hashed with bcrypt (10 salt rounds)
- Never stored in plain text

### Token Management

- JWT tokens expire after 30 minutes
- Stored in localStorage
- Automatically included in API requests
- Cleared on logout

### Role-Based Access

- Backend middleware enforces role checks
- Frontend UI adapts to user permissions
- API endpoints protected by role requirements
- Activity logging for audit compliance

### Account Security

- Users cannot delete their own accounts
- Inactive users cannot login
- Failed login attempts are rate-limited
- Session tracking for security monitoring

## Troubleshooting

### Cannot Login

1. Verify username and password
2. Check if account is active
3. Ensure database connection is working
4. Check backend logs for errors

### 403 Forbidden Errors

- User doesn't have required role
- Trying to access admin-only features
- Account may be inactive

### User Not Found

- Username may be incorrect
- User may have been deleted
- Check database for user record

### Cannot Create Users

- Only admins can create users
- Check for duplicate username/email
- Verify password meets requirements
- Ensure valid role is specified

## Database Schema

### users Table

```sql
- id (INT, PRIMARY KEY)
- username (VARCHAR(50), UNIQUE)
- email (VARCHAR(100), UNIQUE)
- password_hash (VARCHAR(255))
- role (ENUM: admin, manager, viewer)
- first_name (VARCHAR(50))
- last_name (VARCHAR(50))
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_login (TIMESTAMP)
- created_by (INT, FOREIGN KEY)
```

### user_activity_log Table

```sql
- id (INT, PRIMARY KEY)
- user_id (INT, FOREIGN KEY)
- action (VARCHAR(50))
- resource (VARCHAR(100))
- details (TEXT)
- ip_address (VARCHAR(45))
- created_at (TIMESTAMP)
```

## Future Enhancements

Planned features for future releases:

- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Session management UI
- [ ] Advanced activity log filtering
- [ ] User groups and permissions
- [ ] API key management
- [ ] OAuth integration
- [ ] Password expiry policies
- [ ] Account lockout after failed attempts

## Support

For questions or issues:

- Check the main README.md
- Review backend/README.md for API details
- Review frontend/README.md for UI documentation
- Open an issue on GitHub
- Contact [support@bsi.com](mailto:support@bsi.com)
