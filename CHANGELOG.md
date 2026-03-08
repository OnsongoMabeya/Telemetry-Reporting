# Changelog

All notable changes to the BSI Telemetry Reporting System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Comprehensive Responsive Design System** - Mobile-first implementation
  - 6 responsive breakpoints (480px, 768px, 1024px, 1440px, 1920px)
  - Fluid typography using CSS `clamp()` function (14px - 18px)
  - Responsive spacing variables (`--spacing-xs` through `--spacing-xl`)
  - Utility classes for containers, grids, flex layouts, and visibility
  - Adaptive grid layouts: 1 → 2 → 3 → 4 → 5 columns based on screen size
  - Touch-optimized mobile interface with larger targets
  - Full-screen modals on mobile devices (<600px)
- Admin-configurable graph colors stored in `metric_mappings.color`.
- Database migration `004_add_color_to_metric_mappings.sql`.
- `export_metrics.js` script to export metric mappings with color column for deployment.
- Trust proxy configuration for nginx reverse proxy compatibility.
- Rate limiter configuration optimized for proxy environments.
- Nginx configuration for port 3010 to support multi-tenant server deployments.

### Changed

- **NodeDetail.js** - Enhanced dashboard grid layout
  - Adaptive columns: 1 (mobile) → 2 (tablet) → 3 (desktop) → 4 (large desktop)
  - Responsive map heights: 280px (mobile) → 400px (tablet) → 350px (desktop)
  - Improved container constraints with responsive max-width
  - Mobile-optimized padding and spacing
- **KenyaMap.js** - Responsive map component
  - Adaptive info panel positioning and padding
  - Mobile-optimized header that stacks on small screens
  - Smaller popup content on mobile devices
  - Better touch targets for mobile interaction
- **NodeList.js** - Responsive grid layout
  - Enhanced grid: 1 → 2 → 3 → 4 → 5 columns across breakpoints
  - Responsive card padding: 2 (mobile) → 2.5 (tablet) → 3 (desktop)
  - Adaptive spacing between cards
- **Navbar.js** - Mobile-first navigation
  - Responsive logo sizing: 28px (mobile) → 40px (desktop)
  - Adaptive branding: "BSI" on mobile, "BSI Telemetry" on desktop
  - Hidden subtitle on mobile for cleaner appearance
- **ReportConfigModal.js** - Responsive modal design
  - Full-screen modal on mobile (<600px)
  - Stacked buttons on mobile (full width)
  - Side-by-side buttons on desktop
  - Responsive typography and padding
- Dashboard graphs now use the database-configured metric color for all users.
- Default graph styling is now black line with no fill when `color` is not set.
- `/api/telemetry-mappings/:nodeName/:baseStation` now returns `color` in mappings.
- `setup.js` now preserves existing metric mappings when no export file is present.
- Backend `server.js` enables `trust proxy` for proper IP detection behind nginx.
- Rate limiter disables `trustProxy` validation to prevent errors with nginx proxy.
- **Nginx now listens on port 3010** instead of port 80 for multi-tenant server compatibility.
- Updated all deployment documentation to reflect port 3010 configuration.

### Fixed

- Fixed `setup.js` deleting existing metric mappings on servers without export file.
- Fixed express-rate-limit `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` error with nginx.
- Fixed express-rate-limit `ERR_ERL_PERMISSIVE_TRUST_PROXY` validation error.

## [2.1.1] - 2026-02-23

### Added - Metric Mappings Migration Tools

#### Backend Tools V 2.1.1

- `migrate_mappings.js` - Export metric mappings from development to production
- Automated export of all active metric mappings to SQL file
- Export summary showing configured nodes and metric counts
- `setup.js` enhanced with automatic metric mappings import
- Detects and imports `metric_mappings_export.sql` during database setup
- Shows import summary with count of imported mappings

#### Deployment V 2.1.1

- Simplified deployment workflow for new environments
- One-command database setup with automatic configuration import
- Consistent metric mappings across development, staging, and production
- Version-controlled metric configurations (optional)

#### Documentation V 2.1.1

- Updated `METRIC_MAPPING_GUIDE.md` with migration workflow
- Added "Migrating Configurations Between Environments" section
- Updated `backend/README.md` with deployment instructions
- Updated main `README.md` with "Deploying to New Environments" section
- Step-by-step migration guide with example outputs

### Changed V 2.1.1

- Database setup now automatically imports metric mappings if export file exists
- `setup.js` provides clear feedback on import status
- Deployment process streamlined from manual SQL to automated script

### Benefits V 2.1.1

- No manual reconfiguration when deploying to new servers
- Consistent metric configurations across all environments
- Faster deployment with fewer manual steps
- Reduced risk of configuration errors

## [2.1.0] - 2026-02-19

### Added - Intelligent Column Data Analysis

#### Backend API V 2.1.0

- Node-specific column data analysis in `/api/metric-mappings/columns`
- Query parameters: `nodeName` and `baseStation` for filtered analysis
- Statistical analysis: `hasData`, `recordCount`, `percentage`, `minValue`, `maxValue`, `avgValue`
- Automatic detection of columns with non-null/non-zero values
- Dynamic SQL query building based on user-configured metric mappings
- Telemetry API now returns data with custom metric names as keys

#### Frontend V 2.1.0

- Real-time column data indicators in metric mapping dialog
- "Has Data" badges showing percentage and record count
- "No Data" badges with disabled state for empty columns
- Loading indicators during column analysis
- Dynamic data parsing to handle custom metric names
- Removed hardcoded metric name mappings

### Fixed V 2.1.0

- MySQL AVG() string-to-number conversion bug causing "No Data" display
- Hardcoded metric mappings preventing custom metric names from displaying
- Dashboard now shows only user-configured metrics instead of generic defaults
- Column analysis now properly converts aggregate values before calling toFixed()

### Changed V 2.1.0

- Dashboard graphs now use custom metric names directly (e.g., "MILELE FM Forward Power")
- Backend dynamically builds SQL queries based on active metric_mappings
- Frontend parses telemetry data dynamically instead of using fixed schema
- Empty mappings return empty telemetry data instead of hardcoded defaults

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

### Changed V 2.0.0

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

### Fixed V 2.0.0

- Compilation errors in NodeDetail.js (unused imports, JSX structure)
- Runtime errors with Leaflet map when conditionally rendered
- ESLint warnings for unused variables and functions
- Markdown linting issues in documentation files

### Security V 2.0.0

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
