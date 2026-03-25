# Changelog

All notable changes to the BSI Telemetry Reporting System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - My Sites Enhancements & Smart Telemetry (March 25, 2026)

#### My Sites Feature

- **User-Client Assignment Model**
  - Changed from user-service to user-client assignments
  - Users can have one or more clients
  - Access all services belonging to assigned clients
  - Simplified management and improved scalability

- **Navbar-Integrated Filters**
  - Moved client and service selectors to top navigation bar
  - Created `MySitesContext` for shared state management
  - Created `MySitesControls` component for navbar filters
  - Cleaner UI with filters always accessible

- **Smart Telemetry Endpoint**
  - Implemented Dashboard's smart date range logic
  - Fetches latest available data instead of using NOW()
  - Time bucketing for performance optimization (1min to 6hr intervals)
  - Adaptive sampling based on time filter selection
  - Proper timezone handling (EAT +03:00)
  - Supports all time ranges: 5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w, 2w, 30d

- **Database Schema Updates**
  - Dropped `user_service_assignments` table
  - Created `user_client_assignments` table with audit fields
  - Updated views to reflect new assignment model
  - Migration: `008_rename_user_service_to_user_client.sql`

#### API Improvements

- **Metric Mappings Endpoint**
  - Made `/api/metric-mappings` accessible to all authenticated users
  - Standardized response format: `{ success, data, count }`
  - Fixed permissions for metric assignment functionality

- **Frontend Compatibility**
  - Updated `VisualizationSettings` to handle new response format
  - Backward compatible data extraction with fallbacks

#### Bug Fixes (March 25,2025)

- Fixed React Hooks violations in `TopHeader` component
- Fixed ESLint warnings in `MySites` component
- Removed unused `theme` variable
- Added missing `useEffect` dependencies

### Added - UI Refinements & Responsive Improvements (March 13, 2026)

#### Dashboard Enhancements

- **Graph Improvements**
  - Y-axis now always starts from 0 for consistent data visualization
  - Dynamic graph colors from `metric_mappings` database table
  - **Conditional area fill**: Only displays when database color is specified
    - Graphs with custom colors: colored line + 30% opacity colored fill
    - Graphs with default colors: line only, no area fill
  - Direct fill rendering with `fillOpacity` for reliable color display
  - Fallback to default blue (#30a1e4) when no color specified

- **Layout Refinements**
  - Removed gap between sidebar and main content for edge-to-edge layout
  - Fixed TopHeader positioning to appear correctly to the right of sidebar
  - Removed duplicate "Generate Report" button (kept functional purple button)
  - Cleaner, more professional appearance

#### Responsive Mobile/Tablet Features

- **Adaptive Sidebar**
  - Auto-collapses to 60px icon-only view on tablet and phone (< 960px)
  - Full 220px width with labels on desktop (≥ 960px)
  - Smooth transitions between states
  - Tooltips show labels on hover in collapsed state
  - Collapse button hidden on mobile (auto-collapse only)

- **Bottom Sheet Filters**
  - Floating Action Button (FAB) on tablet/phone triggers filter drawer
  - Bottom sheet contains all dashboard controls (Node, Base Station, Time Range)
  - Rounded top corners with smooth slide-up animation
  - Touch-optimized spacing and controls
  - Inline filters remain on desktop for quick access

- **Responsive Map Sizing**
  - 2x2 grid card (600px height) on desktop (≥ 960px)
  - 1x1 grid card (300px height) on tablet/phone (< 960px)
  - Maintains full interactivity at all sizes
  - Auto-adjusts for optimal viewing

#### Backend Updates

- Added `color` field to metric_mappings query for dynamic graph styling
- Enhanced telemetry data response with color information

#### Bug Fixes

- Fixed compilation errors in ReportGenerator.js (removed unused imports, fixed undefined variables)
- Removed unused variables in NodeDetail.js and Sidebar.js
- Fixed theme hook usage in TelemetryGraph component
- Resolved ESLint warnings for cleaner codebase

### Added - Modern SaaS Dashboard UI Redesign

#### Layout Components (March 2026)

- **Fixed Left Sidebar** - Professional navigation structure
  - Dark navy theme (#163d90) with 220px width (60px collapsed on mobile)
  - Role-based navigation items (Dashboard, Visualization Settings, User Management, Alerts)
  - BSI logo integration at top
  - Dark mode toggle at bottom
  - Collapsible with smooth transitions
  - Responsive behavior for mobile/tablet/desktop
- **Top Header Bar** - Contextual controls and user menu
  - User profile menu with logout functionality
  - Conditional rendering of dashboard controls on dashboard route
  - Node, Base Station, and Time Range selectors in header
  - Generate Report button in header
  - Clean white background with subtle shadow
- **DashboardLayout Wrapper** - Unified layout system
  - Integrates sidebar, header, and main content area
  - Provides DashboardContext to all child components
  - Responsive padding and spacing
  - Theme-aware background colors
- **DashboardContext** - Centralized state management
  - Global state for nodes, base stations, filters, telemetry data
  - Shared state between header controls and dashboard content
  - Loading states and error handling
  - Report modal state management
- **CSS Grid Dashboard Layout** - Modern card-based design
  - 2x2 interactive map card (600px height, fully functional)
  - Auto-fit grid for graph cards (minimum 300px width)
  - Responsive columns: 1 (mobile) → 2 (tablet) → 3 (desktop) → 4 (large screens)
  - 300px row height for consistent card sizing
  - 24px gap between cards
  - White rounded cards (16px border radius) with subtle shadows
- **Alerts Page** - Placeholder for future alerts functionality
- **Empty State Messaging** - User-friendly configuration prompts
  - Professional message card when no metrics configured
  - Actionable "Configure Metrics" button for admins
  - Displays alongside map instead of blocking entire view

#### Component Structure (March 2026)

- `components/layout/Sidebar.js` - Navigation sidebar component
- `components/layout/TopHeader.js` - Header with user menu and controls
- `components/layout/DashboardLayout.js` - Main layout wrapper
- `components/dashboard/DashboardControls.js` - Filter controls component
- `components/dashboard/GenerateReportButton.js` - Report generation component
- `context/DashboardContext.js` - Dashboard state management
- `pages/Alerts.js` - Alerts page placeholder

#### Brand Colors (March 2026)

- Primary Blue: #30a1e4 (buttons, accents, graph lines)
- Dark Navy: #163d90 (sidebar, secondary elements)
- Light Background: #f0f6fc (page background in light mode)
- Dark Background: #0f172a (page background in dark mode)
- Card Background: white (light mode), #1e293b (dark mode)
- Card Border Radius: 16px with subtle shadows

### Changed - UI/UX Overhaul (March 2026)

- **App.js** - Integrated new layout system
  - Replaced Navbar with DashboardLayout wrapper
  - Updated theme colors to brand palette
  - Added Alerts route
  - Removed old Navbar component
- **NodeDetail.js** - Complete redesign with card grid
  - Removed header section (moved to TopHeader)
  - Removed controls section (moved to DashboardControls in header)
  - Removed report button (moved to GenerateReportButton in header)
  - Implemented CSS Grid layout with 2x2 map and 1x1 graph cards
  - Data transformation: `sample_time` → `timestamp` for graph compatibility
  - Dynamic graph rendering based on metric mappings
  - Empty state card instead of full-page blocking message
  - Maintains all existing functionality and interactivity
- **Backend server.js** - Enhanced telemetry API response
  - Added `metricMappings` to telemetry endpoint response
  - Frontend can now dynamically render graphs based on mappings
  - Fixes issue where mappings were fetched but not returned

### Fixed - Data Flow and Display (March 2026)

- **Metric Mappings Not Displaying** - Backend was fetching but not returning mappings
  - `getTelemetryData()` now includes `metricMappings` in return object
  - Frontend receives mappings array in API response
  - Graphs render dynamically based on received mappings
- **Timestamp Format Mismatch** - API returns `sample_time`, graphs expect `timestamp`
  - Added data transformation in NodeDetail to convert `sample_time` to Unix timestamp
  - Graphs now render correctly with proper time axis
- **Empty State Blocking Dashboard** - Full-page message prevented map viewing
  - Changed to inline card message that displays alongside map
  - Users can still interact with map while metrics are being configured

### Removed (March 2026)

- **Navbar.js** - Replaced by Sidebar and TopHeader components
- **Inline Dashboard Controls** - Moved to TopHeader for cleaner layout
- **Inline Report Button** - Moved to TopHeader for consistency

### Technical Details (March 2026)

- **Responsive Breakpoints:**
  - Mobile: < 600px (1 column, collapsed sidebar)
  - Tablet: 600-960px (2 columns)
  - Desktop: 960-1280px (3 columns)
  - Large: > 1280px (4 columns)
- **Grid Configuration:**
  - `display: grid`
  - `gridTemplateColumns: repeat(auto-fit, minmax(300px, 1fr))`
  - `gridAutoRows: 300px`
  - `gap: 24px`
- **Map Card Spanning:**
  - `gridColumn: span 2` (takes 2 columns)
  - `gridRow: span 2` (takes 2 rows)
  - Results in 2x2 card (600x600px on desktop)
- **Dark Mode Compatibility:**
  - All new components fully support dark mode
  - Theme-aware colors throughout
  - Proper contrast ratios maintained

### Migration Notes (March 2026)

- **No Breaking Changes** - All existing functionality preserved
- **Backward Compatible** - Existing data and configurations work as-is
- **Visual Changes Only** - No database schema changes required
- **Backup Available** - Original NodeDetail.js saved as NodeDetail.backup.js

### Added

- **Dark Mode Support** - Fully functional theme switching
  - ThemeContext for global theme state management
  - Toggle between light and dark modes via Navbar button
  - localStorage persistence for user theme preference
  - Dynamic color palettes optimized for both modes
  - Smooth transitions between themes
  - Accessible tooltips for theme toggle button
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

- **App.js** - Dynamic theme system
  - Replaced static theme with dynamic `getTheme(mode)` function
  - Integrated ThemeModeProvider for app-wide theme management
  - Theme now responds to user preference in real-time
- **Navbar.js** - Functional dark mode toggle
  - Connected toggle button to ThemeContext
  - Added tooltip for better UX
  - Removed non-functional local state
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

- **Dark Mode White Space Issue** - Fixed pages with less content showing white background
  - Removed hardcoded light background gradient from `global.css` body
  - Updated `RootElement` to apply theme background to html, body, and root elements
  - Added full-height wrapper Box with theme-aware background
  - Ensured proper background coverage across all viewport sizes
- **Dark Mode Component Backgrounds** - Fixed hardcoded white backgrounds
  - `NodeDetail.js`: Updated all Paper components to use `bgcolor: 'background.paper'`
  - `NodeDetail.js`: Made graph tooltips and containers theme-aware
  - `NodeDetail.js`: Updated InputLabel backgrounds to use theme colors
  - `KenyaMap.js`: Converted Paper components to use theme backgrounds
  - `Navbar.js`: Updated AppBar background to adapt to dark/light mode
  - All components now properly respect theme mode
- **Dark Mode Graph Legibility** - Fixed unreadable graph text and plot lines in dark mode
  - XAxis and YAxis: Brighter colors in dark mode (`#cbd5e1` for ticks, `#94a3b8` for axis)
  - CartesianGrid: Increased opacity (0.5) and brightness (`rgba(255, 255, 255, 0.2)`) in dark mode
  - Plot lines: Default bright blue (`#60a5fa`) with thicker stroke (3px) in dark mode
  - Active dots: Dark background stroke (`#1e293b`) for better contrast
  - Legend text color uses `theme.palette.text.primary`
  - Graph titles and subtitles use theme-aware text colors
  - All graph elements now highly visible and readable in both light and dark modes
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
