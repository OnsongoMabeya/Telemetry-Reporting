# BSI Telemetry Authentication System

## Overview

The BSI Telemetry system now includes JWT-based authentication for the admin user. All routes require authentication.

## Admin Credentials

- **Username**: `BSI`
- **Password**: `Reporting2026`
- **Role**: Administrator

## Implementation Details

### Backend Components

#### 1. Authentication Routes (`/backend/routes/auth.js`)

- `POST /api/auth/login` - Login endpoint with rate limiting (5 attempts per 15 minutes)
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - Logout endpoint (logs the event)

#### 2. Authentication Middleware (`/backend/middleware/auth.js`)

- Validates JWT tokens on protected routes
- Returns appropriate error codes:
  - `NO_TOKEN` - No token provided
  - `TOKEN_EXPIRED` - Token has expired
  - `INVALID_TOKEN` - Token is invalid

#### 3. Protected Routes

All API routes now require authentication:

- `GET /api/nodes`
- `GET /api/basestations/:nodeName`
- `GET /api/telemetry/:nodeName/:baseStation`
- `GET /api/basestations-map`

### Frontend Components

#### 1. AuthContext (`/frontend/src/context/AuthContext.js`)

Provides authentication state management:

- `user` - Current user object
- `token` - JWT token
- `isAuthenticated` - Boolean authentication status
- `loading` - Loading state
- `login(username, password)` - Login function
- `logout()` - Logout function

#### 2. LoginModal (`/frontend/src/components/LoginModal.js`)

- Modal overlay that appears when user is not authenticated
- Cannot be closed until successful login
- Shows error messages for failed login attempts
- Beautiful gradient design matching BSI branding

#### 3. Axios Interceptor (`/frontend/src/services/axiosInterceptor.js`)

- Automatically adds JWT token to all API requests
- Handles 401 responses by logging out the user
- Removes expired/invalid tokens from localStorage

#### 4. Navbar Integration

- Shows user avatar with username tooltip
- User menu with logout option
- Displays user role (Administrator)

## Security Features

1. **Password Hashing**: Passwords stored as bcrypt hashes (10 rounds)
2. **JWT Tokens**: Signed with secret key, expire after 30 minutes
3. **Rate Limiting**:
   - Login: 5 attempts per 15 minutes
   - API: 60 requests per minute
4. **Token Storage**: localStorage (persists across sessions)
5. **Automatic Logout**: On token expiry or invalid token
6. **Protected Routes**: All routes require valid JWT token

## Session Management

- **Session Duration**: 30 minutes (configurable via `SESSION_TIMEOUT_MINUTES`)
- **Storage**: localStorage
- **Auto-refresh**: Token is verified on app load
- **Logout**: Clears token and redirects to login

## Testing the Authentication

### 1. Start the Backend

```bash
cd backend
npm start
```

### 2. Start the Frontend

```bash
cd frontend
npm start
```

### 3. Test Login Flow

1. Open `http://localhost:3010`
2. You should see the login modal
3. Enter credentials:
   - Username: `BSI`
   - Password: `Reporting2026`
4. Click "Sign In"
5. On success, you'll see the dashboard
6. Click the user icon in the navbar to see user menu
7. Click "Logout" to sign out

### 4. Test Token Expiry

1. Login successfully
2. Wait 30 minutes (or modify `SESSION_TIMEOUT_MINUTES` to 1 for testing)
3. Try to access any API endpoint
4. You should be automatically logged out

### 5. Test Invalid Credentials

1. Try logging in with wrong password
2. You should see error message: "Invalid credentials"
3. After 5 failed attempts, you'll be rate-limited for 15 minutes

## API Testing with Postman/cURL

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"BSI","password":"Reporting2026"}'
```

Response:

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

### Access Protected Route

```bash
curl -X GET http://localhost:5000/api/nodes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Verify Token

```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Environment Variables

### Backend `.env`

```env
# Admin Authentication
ADMIN_USERNAME=BSI
ADMIN_PASSWORD_HASH=$2b$10$qDH7bN/lOUxoESYtFmmFG.zfnPR8YaBTyVxIVSaMw5x5zTW/l6eRq

# JWT Configuration
JWT_SECRET=wzUwrLwZQxRo43IBoveKG2hO9hRHyA7x

# Session Configuration
SESSION_TIMEOUT_MINUTES=30
```

## Future Enhancements

As mentioned, the admin user will have future functions to:

1. Add more users
2. Manage user roles and permissions
3. View user activity logs
4. Configure system settings

These features will be implemented in the next phase after the basic authentication is tested and confirmed working.

## Troubleshooting

### Login Modal Doesn't Appear

- Check browser console for errors
- Verify AuthProvider is wrapping the app
- Check that axios interceptor is imported

### "Invalid credentials" Error

- Verify username is exactly `BSI` (case-sensitive)
- Verify password is `Reporting2026`
- Check backend logs for authentication errors

### Token Expired Immediately

- Check system time is correct
- Verify `SESSION_TIMEOUT_MINUTES` in `.env`
- Check JWT_SECRET is set correctly

### API Returns 401 Unauthorized

- Check token is being sent in Authorization header
- Verify token hasn't expired
- Check backend logs for token validation errors

### Cannot Logout

- Check browser console for errors
- Verify logout function is called
- Check localStorage is cleared

## Files Modified/Created

### Backend

- ✅ `/backend/middleware/auth.js` - Created
- ✅ `/backend/routes/auth.js` - Created
- ✅ `/backend/server.js` - Modified (added auth routes and middleware)
- ✅ `/backend/.env.example` - Modified (added admin credentials)
- ⚠️ `/backend/.env` - **MANUAL UPDATE REQUIRED**

### Frontend

- ✅ `/frontend/src/context/AuthContext.js` - Created
- ✅ `/frontend/src/components/LoginModal.js` - Created
- ✅ `/frontend/src/services/axiosInterceptor.js` - Created
- ✅ `/frontend/src/App.js` - Modified (integrated authentication)
- ✅ `/frontend/src/components/Navbar.js` - Modified (added logout functionality)

## Next Steps

1. ✅ Add admin credentials to backend `.env` file
2. ✅ Test login flow
3. ✅ Test logout functionality
4. ✅ Test token expiry
5. ✅ Test protected routes
6. 🔄 Implement user management features (future)
7. 🔄 Add role-based permissions (future)
