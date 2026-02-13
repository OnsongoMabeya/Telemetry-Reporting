# Changelog

All notable changes to the BSI Telemetry Reporting System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-13

### Added - Dynamic Metric Mapping System

#### Database V 2.0.0

- `metric_mappings` table for per-node visualization configuration
- `metric_mapping_audit` table for complete audit trail
- Migration 003_create_metric_mappings.sql
- Support for 48 database columns (Analog1-16, Digital1-16, Output1-16)
- Sample mappings for MediaMax1/Nairobi as template

#### Backend API V 2.0.0

- `/api/metric-mappings/columns` - List all 48 available database columns
- `/api/metric-mappings` - CRUD operations for metric mappings
- `/api/metric-mappings/nodes` - Get nodes with mapping status
- `/api/metric-mappings/unmapped` - Alert for unconfigured nodes
- `/api/metric-mappings/audit/:id` - View complete audit trail
- `/api/telemetry-mappings/:nodeName/:baseStation` - Fetch mappings for display
- Role-based access control (Admin full CRUD, Manager read-only)
- Complete input validation and error handling
- Activity logging for all metric mapping operations

#### Frontend V 2.0.0

- **VisualizationSettings** component - New configuration page
  - Statistics dashboard with coverage metrics
  - Alert system for unmapped nodes
  - Node-by-node configuration interface
  - Add/Edit dialog with 48 categorized columns
  - Real-time validation and duplicate detection
  - Manager read-only view, Admin full CRUD access
- **NodeDetail** component - Dynamic graph rendering
  - Conditional rendering based on metric mappings
  - Role-based messaging for unmapped nodes
  - Graphs only display when mappings are configured
  - Kenya Map optimized layout (integrated into grid)
- Navigation menu item for Visualization Settings (Admin/Manager only)

#### Tools & Scripts V 2.0.0

- `verify-nodes.js` - Verification script for mapping coverage
- Works with any database size (13 to 100+ nodes)
- Shows mapping status and coverage percentage

#### Documentation V 2.0.0

- `METRIC_MAPPING_GUIDE.md` - Comprehensive guide for metric mapping system
- `CHANGELOG.md` - Version history tracking
- Updated `README.md` with Dynamic Metric Mapping System section
- Updated `DATABASE_SETUP.md` with migration 003 instructions
- Updated `backend/API_DOCUMENTATION.md` with new endpoints

### Changed

#### UI/UX Improvements V 2.0.0

- Kenya Map height reduced from 450-500px to 300-350px
- Map integrated into grid layout with graphs for better space utilization
- Dashboard now shows everything at a glance without excessive scrolling
- Removed hardcoded telemetry graphs in favor of dynamic rendering

#### Breaking Changes V 2.0.0

- **Telemetry graphs now require metric mapping configuration**
- All existing nodes will show configuration prompts until mappings are set
- No default mappings provided - explicit configuration required
- Frontend components must use metric mappings API

### Fixed

- Compilation errors in NodeDetail.js (unused imports, JSX structure)
- Runtime errors with Leaflet map when conditionally rendered
- ESLint warnings for unused variables and functions
- Markdown linting issues in documentation files

### Security

- Audit trail for all metric mapping changes
- IP address logging for compliance
- Role-based access control enforcement
- Input sanitization and validation

## [1.0.0] - 2026-02-10

### Added - User Management & Node Assignment System

#### Database V 1.0.0

- `users` table with role-based access control
- `user_sessions` table for session tracking
- `user_activity_log` table for audit trail
- `user_node_assignments` table for granular access control
- Migration 001_create_users_table.sql
- Migration 002_create_user_node_assignments.sql
- Default admin account (BSI/Reporting2026)

#### Backend API V 1.0.0

- JWT authentication with bcrypt password hashing
- `/api/auth/login` - User authentication
- `/api/auth/logout` - Session termination
- `/api/auth/verify` - Token validation
- `/api/users/*` - Complete user management CRUD
- `/api/node-assignments/*` - Node access control
- Role-based middleware (requireAdmin, requireAdminOrManager)
- Rate limiting (5 login attempts per 15 minutes)
- Activity logging for security audit

#### Frontend V 1.0.0

- **Login** page with authentication
- **UserManagement** component - Admin/Manager interface
  - Create, edit, delete users
  - View activity logs
  - Manage user roles and status
- **NodeAssignment** dialog - Granular access control
  - Assign specific nodes to users
  - Toggle "Access All Nodes" flag
  - Track assignment history
- **AuthContext** - Global authentication state
- **ProtectedRoute** - Route-level access control
- Navbar with user menu and role-based navigation

#### Documentation V 1.0.0

- `USER_MANAGEMENT_GUIDE.md` - Complete user management documentation
- `DATABASE_SETUP.md` - Database setup and migration guide
- `backend/README.md` - Backend API documentation
- Updated `README.md` with user management features

### Changed V 1.0.0

- Migrated from hardcoded credentials to database-driven authentication
- Implemented role-based access control (Admin, Manager, Viewer)
- Added session timeout (30 minutes configurable)
- Enhanced security with password hashing and JWT tokens

### Security V 1.0.0

- Bcrypt password hashing (10 salt rounds)
- JWT token-based authentication
- Session timeout enforcement
- Activity logging for compliance
- Rate limiting on login endpoint
- Account status management (active/inactive)

## [0.1.0] - 2026-01-15

### Added - Initial Release

#### Core Features V 0.1.0

- Real-time telemetry data visualization
- Node and base station selection
- Time-based filtering (1h, 6h, 24h, 7d, 30d)
- Interactive charts with Recharts
- Kenya map integration with Leaflet
- Responsive Material-UI design

#### Backend V 0.1.0

- Express.js REST API
- MySQL database integration
- CORS configuration for network access
- Caching with node-cache
- Connection pooling for performance

#### Frontend V 0.1.0

- React 19.1.0 application
- Material-UI components
- Framer Motion animations
- Axios for API communication
- Environment-based configuration

#### Documentation V 0.1.0

- Initial README.md
- Setup instructions
- API endpoint documentation

---

## Version History Summary

- **v2.0.0** - Dynamic Metric Mapping System (Current)
- **v1.0.0** - User Management & Node Assignment
- **v0.1.0** - Initial Release

## Upgrade Notes

### Upgrading to 2.0.0

1. **Run Database Migration:**

   ```bash
   mysql -u user -p database < backend/database/migrations/003_create_metric_mappings.sql
   ```

2. **Configure Metric Mappings:**

   - Login as admin
   - Navigate to Visualization Settings
   - Configure metrics for each node/base station
   - Verify with `node verify-nodes.js`

3. **Breaking Change:**

   - Nodes without metric mappings will not display telemetry graphs
   - Configure all nodes before deploying to production

### Upgrading to 1.0.0

1. **Run Database Migrations:**

   ```bash
   mysql -u user -p database < backend/database/migrations/001_create_users_table.sql
   mysql -u user -p database < backend/database/migrations/002_create_user_node_assignments.sql
   ```

2. **Update Environment Variables:**

   - Add `JWT_SECRET` to `.env`
   - Add `SESSION_TIMEOUT_MINUTES` to `.env`

3. **Login with Default Admin:**

   - Username: BSI
   - Password: Reporting2026
   - Change password after first login

## Support

For questions or issues:

- Review documentation in `/docs` folder
- Check [GitHub Issues](https://github.com/OnsongoMabeya/Telemetry-Reporting/issues)
- Contact: <support@bsi.com>
