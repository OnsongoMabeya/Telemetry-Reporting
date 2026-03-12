# BSI Telemetry Reporting System

A comprehensive telemetry monitoring solution for tracking and analyzing node performance across multiple base stations. The system provides real-time data visualization, historical analysis, and automated reporting capabilities.

![BSI Telemetry Dashboard](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.1.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Key Features

### 🎨 Modern SaaS Dashboard UI (March 2026)

The system features a completely redesigned user interface with a professional SaaS dashboard layout:

#### Layout Structure

- **Fixed Left Sidebar** (220px width, 60px collapsed on mobile)
  - Dark navy theme (#163d90) with BSI branding
  - Role-based navigation (Dashboard, Visualization Settings, User Management, Alerts)
  - Dark mode toggle at bottom
  - Collapsible with smooth animations
  - Responsive behavior across all devices

- **Top Header Bar**
  - User profile menu with logout
  - Contextual dashboard controls (Node, Base Station, Time Range selectors)
  - Generate Report button
  - Clean white background with subtle elevation

- **Main Content Area**
  - CSS Grid layout with responsive columns (1→2→3→4 based on screen size)
  - Card-based design with 16px border radius
  - Light blue background (#f0f6fc) in light mode
  - Dark background (#0f172a) in dark mode

#### Dashboard Layout

- **2x2 Interactive Map Card**
  - Kenya map with base station markers
  - Fully interactive zoom and pan
  - Real-time base station status
  - 600px height on desktop, responsive on mobile

- **Dynamic Graph Cards** (1x1 each)
  - Auto-fit grid (minimum 300px width)
  - Prevents graph squeezing
  - Smooth animations and loading states
  - Theme-aware colors and styling

#### State Management

- **DashboardContext** - Centralized state management
  - Shared state between header controls and dashboard content
  - Manages nodes, base stations, filters, telemetry data
  - Loading states and error handling
  - Report modal state

#### Brand Colors

- Primary Blue: #30a1e4 (buttons, accents, graph lines)
- Dark Navy: #163d90 (sidebar, secondary elements)
- Light Background: #f0f6fc (page background)
- Card Border Radius: 16px with subtle shadows

### 📊 Dynamic Metric Mapping System (v2.1.0)

- **Grafana-Style Visualization Configuration**: Admins can dynamically map database columns to custom metric names per node/base station
- **Intelligent Column Analysis**: Real-time detection of which columns contain data for each node
  - Automatic analysis shows percentage of records with data
  - Statistical summaries (min, max, avg values)
  - "Has Data" / "No Data" badges in column selector
  - Disabled state for empty columns
- **48 Available Columns**: Map Analog1-16, Digital1-16, and Output1-16 values to meaningful metric names
- **Custom Metric Names**: Dashboard displays your exact metric names (e.g., "MILELE FM Forward Power")
- **Dynamic SQL Queries**: Backend automatically builds queries based on your configured mappings
- **Custom Units & Display Order**: Configure units (dBm, W, dB, etc.) and control graph display order
- **Enforcement Mode**: Only nodes with configured metric mappings display telemetry data
- **Role-Based Messaging**:
  - Admins see configuration prompts with direct links to settings
  - Managers/Viewers see informative messages about setup progress
- **Complete Audit Trail**: Track all metric mapping changes with user, timestamp, and IP logging
- **Verification Tools**: Built-in scripts to check mapping coverage across all nodes
- **Per-Node Configuration**: Each node/base station combination has independent metric mappings

### 🌐 Network Access

- **Flexible Deployment**: Access from multiple interfaces
  - Local Development: `http://localhost:3010`
  - Production (Nginx): `http://[YOUR_IP]:3010`
  - Backend API: `http://[YOUR_IP]:5000` (local network only)
- **Production Setup**: Nginx reverse proxy on port 3010
  - Serves optimized frontend build
  - Proxies `/api` requests to backend internally
  - Backend port 5000 stays secure on local network
- **Automatic Configuration**: Dynamic API endpoint detection
- **Cross-Origin Ready**: Pre-configured CORS settings

### 📊 Core Functionality

- **Real-time Monitoring**: Live telemetry data visualization with accurate base station mapping
- **Interactive Maps**: Kenya-wide base station monitoring with verified GPS coordinates
- **User Management**: Role-based access control with admin, manager, and viewer roles
- **Node Assignment**: Granular access control - assign specific nodes to users
- **Comprehensive Reporting**: Generate and export reports in multiple formats
- **Responsive Design**: Mobile-first design with comprehensive breakpoint support (see [Responsive Design](#-responsive-design) section)
- **Dark/Light Mode**: Optimized viewing in any lighting condition

### 🔐 Authentication & Security

The system implements comprehensive JWT-based authentication with role-based access control (RBAC):

- **Multi-User Support**: Database-driven user management with three role levels
- **Secure Login**: bcrypt password hashing (10 rounds) for all users
- **Session Management**: 30-minute JWT token expiry with automatic logout
- **Rate Limiting**: Protection against brute force attacks (5 login attempts per 15 minutes)
- **Protected Routes**: All API endpoints require valid authentication
- **Token Storage**: Secure localStorage implementation with automatic refresh
- **User Management**: Full CRUD operations for user accounts (admin only)
- **Activity Logging**: Comprehensive audit trail for all user actions

**User Roles:**

- **Admin**: Full system access, user management, activity logs
- **Manager**: View users and data, limited management capabilities
- **Viewer**: Read-only access to telemetry data

**Default Admin Credentials:**

- Username: `BSI`
- Password: `Reporting2026`
- Role: Administrator

**Security Features:**

- Password hashing with bcrypt (10 salt rounds)
- JWT tokens signed with secret key
- Automatic token expiration and validation
- Rate limiting on login and API endpoints
- CORS protection with configurable origins
- Input validation and sanitization
- Role-based access control middleware
- Activity logging for audit compliance
- Account status management (active/inactive)

## 🛠️ Technical Stack

### Frontend

- **Framework**: React 19.1.0
- **UI Library**: Material-UI 7.1.0
- **Data Visualization**: Recharts 2.15.3
- **Maps**: Leaflet 1.9.3 with React-Leaflet
- **State Management**: React Context API
- **Build Tool**: Vite

### Backend

- **Runtime**: Node.js 22.x
- **Framework**: Express 5.x
- **Database**: MySQL 8.0+
- **Authentication**: JWT
- **API Documentation**: Swagger/OpenAPI
- **Caching**: node-cache

## � Responsive Design

The application implements a comprehensive mobile-first responsive design system ensuring optimal user experience across all device sizes and aspect ratios.

### Responsive Breakpoints

The system uses 6 responsive breakpoints for precise control:

| Breakpoint        | Screen Size      | Target Devices         | Grid Columns |
| ----------------- | ---------------- | ---------------------- | ------------ |
| Mobile Portrait   | ≤480px           | Phones (portrait)      | 1 column     |
| Mobile Landscape  | 481px - 767px    | Phones (landscape)     | 1-2 columns  |
| Tablet            | 768px - 1023px   | Tablets, small laptops | 2-3 columns  |
| Desktop           | 1024px - 1439px  | Laptops, desktops      | 3-4 columns  |
| Large Desktop     | 1440px - 1919px  | Large monitors         | 4-5 columns  |
| Ultra-wide        | ≥1920px          | Ultra-wide displays    | 4-5 columns  |

### Key Responsive Features

**Fluid Typography:**

- Automatic font scaling using CSS `clamp()` function (14px - 18px)
- Smooth transitions between breakpoints
- Optimized readability on all screen sizes

**Adaptive Layouts:**

- **Dashboard Grids**: 1 → 2 → 3 → 4 columns based on screen size
- **Node List**: 1 → 2 → 3 → 4 → 5 columns for optimal card display
- **Map Heights**: 280px (mobile) → 400px (tablet) → 350px (desktop)
- **Container Constraints**: Max-width limits prevent over-stretching on ultra-wide displays

**Component-Specific Optimizations:**

- **Navbar**: Abbreviated branding on mobile ("BSI" vs "BSI Telemetry"), hidden subtitle, responsive logo sizing
- **Kenya Map**: Stacked info panel on mobile, adaptive popup content, touch-optimized controls
- **Report Modals**: Full-screen on mobile (<600px), stacked buttons, responsive padding
- **Cards & Papers**: Adaptive padding and spacing based on screen size

**Touch-Friendly:**

- Larger touch targets on mobile devices
- Full-width buttons on small screens
- Optimized spacing for finger navigation
- Improved mobile menu interactions

### Testing Recommendations

Test the application at these common breakpoints:

**Mobile:**

- 375px × 667px (iPhone SE, 8)
- 414px × 896px (iPhone 11, XR)
- 360px × 740px (Android phones)

**Tablet:**

- 768px × 1024px (iPad portrait)
- 1024px × 768px (iPad landscape)
- 820px × 1180px (iPad Air)

**Desktop:**

- 1366px × 768px (Laptop)
- 1440px × 900px (MacBook)
- 1920px × 1080px (Full HD)
- 2560px × 1440px (2K)
- 3440px × 1440px (Ultra-wide)

### Responsive Utilities

The `global.css` file includes utility classes for responsive development:

- **Container Classes**: `.container-responsive` with max-width constraints
- **Grid Classes**: `.grid-responsive` with adaptive columns
- **Flex Classes**: `.flex-responsive` with direction changes
- **Visibility Classes**: `.hide-mobile`, `.hide-tablet`, `.hide-desktop`, `.show-mobile-only`
- **Spacing Variables**: `--spacing-xs` through `--spacing-xl` for consistent spacing

## ��️ Geographic Visualization

### Interactive Kenya Map

- Real-time base station monitoring with Leaflet
  - OpenStreetMap tiles with zoom and pan controls
  - Color-coded markers for station status (online/offline/unknown)
  - Interactive popups with station details and coordinates
  - Auto-refresh every 5 minutes for real-time updates
  - Responsive design for mobile and desktop viewing
  - BSI-branded header with station counts and status
  - Map bounds auto-fit to show all stations clearly

### 📊 Real-time Monitoring

- Live telemetry data visualization with configurable auto-refresh intervals
- Interactive dashboards with multiple chart types using Recharts
- Real-time alerts and notifications for critical metrics
- Fully responsive design optimized for all devices (mobile, tablet, desktop)
- Smooth animations and transitions for better user experience
- Comprehensive accessibility improvements with proper ARIA labels, keyboard navigation, and screen reader support
- Enhanced error handling with user-friendly feedback and recovery options

### 🔍 Data Analysis

- Intelligent data sampling based on time range (5m to 30d)
- Automatic threshold detection with visual indicators
- Performance trend analysis with percentage changes
- Multi-metric correlation and comparison
- Historical data analysis with customizable time ranges
- Export functionality for further analysis
- Email report generation with customizable templates
- Support for multiple export formats (PDF, CSV, Excel)

### 📑 Reporting & Notifications

- Automated PDF report generation with BSI branding
- Customizable report templates with metric-specific insights
- Export functionality in multiple formats (PDF, CSV, JSON, Excel)
- Scheduled report delivery via email with customizable templates
- Multi-base station comparison reports
- Report scheduling and automation
- Email notifications for system events and alerts
- Success/error notifications for all user actions

### 🏗️ System Architecture

- **Frontend**: React 19.1.0 with Material-UI v7.1.0
  - State Management: React Context API with useReducer
  - Data Visualization: Recharts 2.15.3 with D3.js 7.9.0
  - PDF Generation: jsPDF 3.0.1 with html2canvas 1.4.1
  - HTTP Client: Axios 1.9.0 with interceptors for error handling
  - Routing: React Router 7.6.0 with lazy loading
  - Form Handling: React Hook Form with Yup validation
  - Notifications: Custom Snackbar implementation with Material-UI
  - Accessibility: ARIA attributes, keyboard navigation, and focus management
  - **Geographic Mapping**: Leaflet 1.9.4 with React-Leaflet 4.2.1
  - **Map Features**: OpenStreetMap tiles, custom markers, clustering support

- **Backend**: Node.js/Express 5.1.0
  - Database: MySQL 8.0+ with connection pooling
  - Caching: node-cache 5.1.2 with TTL-based invalidation
  - Rate Limiting: express-rate-limit 7.5.0 with Redis support (optional)
  - CORS: cors 2.8.5 with dynamic origin configuration
  - Email: Nodemailer 7.0.9 with SMTP support
  - Logging: Winston with file and console transports
  - Security: Helmet middleware, request validation, and input sanitization

- **Development Tools**:
  - Concurrent execution of frontend and backend
  - Environment configuration with dotenv
  - Cross-platform environment variable support

## 🗺️ Kenya Map Integration

The system includes an interactive map of Kenya showing all base stations with their real-time status:

### Map Features

- **Base Station Markers**: Color-coded by status
  - 🟢 Green: Online stations
  - 🔴 Red: Offline stations  
  - 🟠 Orange: Unknown status
- **Interactive Popups**: Click markers for station details
- **Real-time Updates**: Auto-refresh every 5 minutes
- **Responsive Layout**: Integrated with telemetry dashboard
- **Accurate Coordinates**: Proper geographic positioning across Kenya
- **Node Filtering**: Filter base stations by node name for focused visualization

### API Endpoint

```http
GET /api/basestations-map?nodeName=Aviation%20FM
```

**Description**: Retrieve all base stations with their geographic coordinates and real-time status for Kenya map visualization. Supports optional node filtering to show only base stations belonging to a specific node.

**Parameters**:

- `nodeName` (optional, string): Filter base stations by node name

**Response Format**:

```json
[
  {
    "id": "ELDORET",
    "name": "ELDORET",
    "lat": 0.5143,
    "lng": 35.2698,
    "status": "online"
  }
]
```

### Supported Stations

The map includes coordinates for major Kenya locations:

1. Nairobi, Mombasa, Kisumu, Nakuru, Eldoret
2. Kitale, Garissa, Kakamega, Nyeri, Meru, Thika
3. Malindi, Lamu, Busia, Machakos, Kericho, Narok
4. Bungoma, Moyale, Marsabit, Isiolo, Wajir, Mandera
5. And many more regional stations

## 📋 Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** 9.x or later
- **MySQL** 8.0+ or compatible database
- **Modern web browser** (Chrome, Firefox, Edge, or Safari)
- **Git** for version control
- **Internet connection** for map tiles and real-time data

## 🏗️ System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB+ (8GB recommended for production)
- **Disk Space**: 1GB+ (plus space for data storage)
- **OS**: Linux, Windows 10+, or macOS 10.15+

## 🛠️ Installation & Setup

### Quick Start

1. **Prerequisites**
   - Node.js 18.x (LTS)
   - MySQL 8.0+
   - npm 9.x or later

2. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd BSI-telemetry-reporting
   ```

3. **Install dependencies**

   ```bash
   # Install root dependencies (for running both frontend and backend)
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   cd ..
   ```

4. **Set up the database**

   **Option A: Automated Setup (Recommended)**

   ```bash
   cd backend
   node database/setup.js
   ```

   This automated script will:
   - Create all required database tables
   - Verify table structure
   - **Automatically import metric mappings** from `database/metric_mappings_export.sql` (if present)
   - Show a summary of the setup

   **Option B: Manual Setup**

   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE horiserverlive;"
   
   # Run user management migration
   mysql -u root -p horiserverlive < backend/database/migrations/001_create_users_table.sql
   
   # Run node assignment migration
   mysql -u root -p horiserverlive < backend/database/migrations/002_create_user_node_assignments.sql
   
   # Run metric mappings migration
   mysql -u root -p horiserverlive < backend/database/migrations/003_create_metric_mappings.sql
   ```

   This creates:
   - `users` table with role-based access control
   - `user_sessions` table for session tracking
   - `user_activity_log` table for audit trail
   - `user_node_assignments` table for node access control
   - `metric_mappings` table for dynamic visualization configuration
   - `metric_mapping_audit` table for complete audit trail
   - Default admin user (BSI/Reporting2026)

   📖 **For detailed setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md)**

5. **Configure Environment**

   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   
   # Edit the .env files with your configuration
   ```

6. **Environment Variables**

   **Important:** Each computer should have its own `.env` file with local MySQL credentials. The `.env` file is gitignored and won't be committed to version control.

### Backend (`.env`)

```env
# Database Configuration (use your local MySQL credentials)
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_secure_password
DB_NAME=horiserverlive
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development

# Caching
CACHE_TTL=300  # Default cache TTL in seconds

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX=100          # Max requests per window per IP

# Logging
LOG_LEVEL=info  # error, warn, info, debug
```

### Frontend (`.env`)

```env
   # Application
   PORT=3010
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_DEFAULT_TIME_RANGE=1h
   REACT_APP_THEME=light  # light or dark
   REACT_APP_ANALYTICS=false  # Enable/disable analytics

   # Feature Flags
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   
   # Install cross-env globally if not already installed
   npm install -g cross-env
   ```

1. **Set up environment variables**
   - Backend:

     ```bash
     cd backend
     copy .env.example .env
     # Edit .env with your database credentials
     ```

   - Frontend:

     ```bash
     cd frontend
     copy .env.example .env
     # Update API_URL if needed
     ```

2. **Start the application**

   ```bash
   # From the project root
   npm run dev
   
   # Or start services individually:
   # Backend:
   # cd backend && npm start
   
   # Frontend (in a new terminal):
   # cd frontend && npm start
   ```

3. **Access the application**

   - Frontend: [http://localhost:3010](http://localhost:3010)
   - Backend API: [http://localhost:5000](http://localhost:5000)

### Backend Configuration

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=horiserverlive

# Email Configuration (for report delivery)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465, false for other ports
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
```

### Frontend Configuration

```env
# Application
PORT=3010
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEFAULT_TIME_RANGE=1h
REACT_APP_THEME=light  # light or dark
REACT_APP_ANALYTICS=false  # Enable/disable analytics

# Feature Flags
REACT_APP_FEATURE_REPORTS=true
REACT_APP_FEATURE_ALERTS=true
REACT_APP_FEATURE_EMAIL=true
```

## 📊 Data Sampling Intervals

The system automatically adjusts data sampling based on the selected time range to optimize performance and user experience:

| Time Range | Sample Interval | Data Points | Cache TTL  | Best For              |
|------------|-----------------|-------------|------------|-----------------------|
| 5m         | 10 seconds      | 30          | 30s        | Real-time monitoring  |
| 10m        | 10 seconds      | 60          | 30s        | Short-term analysis   |
| 30m        | 30 seconds      | 60          | 2m         | Quick diagnostics     |
| 1h         | 1 minute        | 60          | 5m         | Hourly trends         |
| 2h         | 2 minutes       | 60          | 5m         | Multi-hour monitoring |
| 6h         | 5 minutes       | 72          | 10m        | Half-day analysis     |
| 1d         | 15 minutes      | 96          | 15m        | Daily overview        |
| 2d         | 30 minutes      | 96          | 30m        | Two-day trends        |
| 5d         | 1 hour          | 120         | 1h         | Weekly analysis       |
| 1w         | 2 hours         | 84          | 2h         | Weekly summary        |
| 2w         | 4 hours         | 84          | 4h         | Bi-weekly review      |
| 30d        | 1 day           | 30          | 12h        | Monthly reporting     |

## 🚀 Deploying to New Environments

### Migrating Metric Mappings Between Servers

When deploying to a new server or computer, you can migrate your existing metric mapping configurations automatically:

#### 1. Export from Development Environment

On your development/source computer:

```bash
cd backend
node database/migrate_mappings.js
```

This creates `database/metric_mappings_export.sql` containing all your configured metrics.

**Example Output:**

```text
✅ Found 21 metric mapping(s)

Configured nodes:
- Genset02/KISUMU: 5 metric(s)
- Kameme FM/LIMURU: 3 metric(s)
- MediaMax1/MERU: 7 metric(s)
- MediaMax1/Nairobi: 4 metric(s)
- MediaMax1/NYERI: 2 metric(s)
```

#### 2. Sync Code to Production

On the production/target computer:

```bash
git pull origin main
```

This ensures you have the latest code including the export file (if committed).

If you didn't commit the export file, manually copy it to `backend/database/metric_mappings_export.sql`.

#### 3. Run Automated Setup

On the production computer:

```bash
cd backend
node database/setup.js
```

The script will automatically:

- Create all required database tables
- Import your metric mappings from the export file
- Show a summary of imported configurations

**Expected Output:**

```text
✅ All tables verified successfully!

📦 Importing metric mappings...
✅ Imported 21 metric mapping(s)

📝 Default admin account:
   Username: BSI
   Password: Reporting2026
```

#### 4. Start the Application

```bash
# Start backend
npm start

# In another terminal, start frontend
cd ../frontend
npm start
```

Your metric mappings will be ready without manual reconfiguration!

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Workflow

1. **Before starting**
   - Ensure all tests pass
   - Update documentation if needed

2. **Coding standards**
   - Follow existing code style
   - Write meaningful commit messages
   - Add tests for new features

3. **Testing**

   ```bash
   # Run backend tests
   cd backend
   npm test
   
   # Run frontend tests
   cd ../frontend
   npm test
   ```

### Repository Structure

```text
bsi-telemetry/
├── backend/           # Backend server (Node.js/Express)
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── .env          # Environment variables
│   └── server.js     # Main server file
├── frontend/         # Frontend React application
│   ├── public/       # Static files
│   ├── src/          # React components and logic
│   └── .env          # Frontend environment variables
├── .gitignore        # Git ignore file
└── README.md         # This file
```

### Common Issues & Solutions

#### 1. React Scripts Not Found

If you encounter `'react-scripts' is not recognized`, try:

```bash
cd frontend
npm install react-scripts@latest
```

#### 2. Node.js Version Mismatch

This project requires Node.js v22.x. If you have multiple versions, use nvm (Node Version Manager) to switch:

```bash
nvm install 22
nvm use 22
```

#### 3. Database Connection Issues

- Verify MySQL is running
- Check `.env` database credentials
- Ensure the database exists and is accessible

#### 4. Authentication 401 Errors

If you encounter 401 Unauthorized errors after login:

1. **Clear browser localStorage** (this will remove the saved auth token):

   ```javascript
   // In browser console (F12)
   localStorage.clear()
   ```

2. **Hard refresh** the page (Cmd+Shift+R or Ctrl+Shift+R)

3. **Login again** with credentials:
   - Username: `BSI`
   - Password: `Reporting2026`

This clears any stale tokens from previous sessions.

## � User Management & Roles

The system supports multiple users with role-based access control (RBAC).

### User Roles

- **Admin**: Full system access, can create/edit/delete users, view all data and logs
- **Manager**: Can view users and all data, limited management capabilities
- **Viewer**: Read-only access to telemetry data and dashboards

### Features

- **User Creation**: Admins can create new users with specific roles
- **User Management**: View, edit, and delete users (admin only)
- **Node Assignment**: Assign specific nodes to users for granular access control
- **Profile Management**: Users can update their own profile information
- **Activity Logging**: Audit trail of all user actions (admin access)
- **Role-Based UI**: Interface adapts based on user permissions
- **Session Tracking**: Monitor active user sessions and last login times

### Setup

1. **Run Database Migrations**:

   ```bash
   # Create user management tables
   mysql -u your_user -p your_database < backend/database/migrations/001_create_users_table.sql
   
   # Create node assignment tables
   mysql -u your_user -p your_database < backend/database/migrations/002_create_user_node_assignments.sql
   ```

2. **Default Admin Account**:
   - Username: `BSI`
   - Password: `Reporting2026`
   - Role: Administrator

3. **Create Additional Users**:
   - Login as admin
   - Navigate to User Management (avatar menu → User Management)
   - Click "Add User" and fill in the details

### API Endpoints

**User Management:**

- `POST /api/users/signup` - Create new user (admin only)
- `GET /api/users` - List all users (admin/manager)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/activity/logs` - View activity logs (admin only)

**Node Assignment:**

- `GET /api/node-assignments/user/:userId` - Get user's node assignments
- `GET /api/node-assignments/available-nodes` - List all available nodes (admin)
- `POST /api/node-assignments` - Assign nodes to user (admin)
- `DELETE /api/node-assignments/:id` - Remove node assignment (admin)
- `PUT /api/node-assignments/user/:userId/access-all` - Toggle access to all nodes (admin)

**Metric Mappings (NEW):**

- `GET /api/metric-mappings/columns` - Get all 48 available database columns
- `GET /api/metric-mappings` - List all metric mappings with filters
- `GET /api/metric-mappings/nodes` - Get nodes with mapping status
- `GET /api/metric-mappings/unmapped` - Get unmapped nodes requiring configuration
- `POST /api/metric-mappings` - Create new metric mapping (admin only)
- `PUT /api/metric-mappings/:id` - Update metric mapping (admin only)
- `DELETE /api/metric-mappings/:id` - Soft delete metric mapping (admin only)
- `GET /api/metric-mappings/audit/:id` - Get audit trail for mapping
- `GET /api/telemetry-mappings/:nodeName/:baseStation` - Get mappings for telemetry display

### Security

- Passwords are hashed using bcrypt (10 salt rounds)
- Role-based middleware protects sensitive endpoints
- Activity logging for audit compliance
- Users cannot delete their own accounts
- Inactive users cannot login

## �📞 Support

For support, please contact:

- **Email**: [support@bsi.com](mailto:support@bsi.com)
- **Issues**: [GitHub Issues](https://github.com/OnsongoMabeya/Telemetry-Reporting/issues)
- **Documentation**: [GitHub Wiki](https://github.com/OnsongoMabeya/Telemetry-Reporting/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Material-UI](https://mui.com/) - React UI component library
- [Recharts](https://recharts.org/) - Charting library
- [Express](https://expressjs.com/) - Web framework for Node.js
- [MySQL](https://www.mysql.com/) - Database management system
- Built with ❤️ by the BSI Engineering Team
- Thanks to all contributors who have helped improve this project
- Icons by [Material-UI](https://mui.com/material-ui/material-icons/)

## 🚀 Development

### Running the Application

1. **Start the development servers**

   ```bash
   # Start both frontend and backend with hot-reload
   npm run dev
   ```

   This will start:

   - Frontend: [http://localhost:3010](http://localhost:3010)
   - Backend API: [http://localhost:5000](http://localhost:5000)
   - API Documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

2. **Run in production mode**

   ```bash
   # Build frontend
   cd frontend
   npm run build
   
   # Start production server
   cd ../backend
   npm start
   ```

### Available Scripts

#### Root Directory

- `npm run dev`: Start both frontend and backend in development mode
- `npm run build`: Build both frontend and backend for production
- `npm test`: Run all tests
- `npm run lint`: Lint all code
- `npm run format`: Format code using Prettier

#### Frontend (in `/frontend`)

- `npm start`: Start development server
- `npm build`: Create production build
- `npm test`: Run frontend tests
- `npm run eject`: Eject from create-react-app

#### Backend (in `/backend`)

- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon
- `npm test`: Run backend tests
- `npm run migrate`: Run database migrations

## 🎯 Metric Mapping System

### Overview

The Dynamic Metric Mapping System allows administrators to configure custom visualization metrics for each node/base station combination without code changes.

### Metric Mapping Features

- **48 Available Columns**: Analog1-16, Digital1-16, Output1-16 values from `node_status_table`
- **Custom Metric Names**: Map columns to meaningful names (e.g., "Forward Power", "VSWR")
- **Units Configuration**: Set appropriate units (dBm, W, dB, V, A, °C, etc.)
- **Display Order Control**: Define the order graphs appear on dashboard
- **Per-Node Configuration**: Each node/base station has independent mappings
- **Admin-Configured Graph Colors**: Admins can set an optional line color per metric (applies to all users)
- **Enforcement**: Telemetry graphs only display when mappings are configured
- **Audit Trail**: Complete history of all mapping changes

### Admin Workflow

1. **Login as Admin** (BSI/Reporting2026)
2. **Navigate to Visualization Settings** (User menu → Visualization Settings)
3. **View Statistics Dashboard**:
   - Total metric mappings configured
   - Configured vs unmapped nodes
   - Alert list of nodes needing configuration
4. **Configure Metrics per Node**:
   - Select node and base station
   - Click "Add Metric Mapping"
   - Choose database column (Analog1-16, Digital1-16, Output1-16)
   - Enter custom metric name
   - Set unit (optional)
   - Set display order
   - Set graph color (optional)
5. **Save and Verify**: Return to dashboard to see configured graphs

### Verification

Run the verification script to check mapping coverage:

```bash
cd backend
node verify-nodes.js
```

Output shows:

- Total unique node/base station combinations
- Mapping status for each node
- Coverage percentage
- List of unmapped nodes requiring configuration

### Database Schema

**metric_mappings table:**

- `id`: Primary key
- `node_name`: Node identifier
- `base_station_name`: Base station identifier
- `metric_name`: Custom display name
- `column_name`: Database column (Analog1Value, etc.)
- `unit`: Measurement unit (optional)
- `display_order`: Graph ordering
- `color`: Optional hex color for the graph line (e.g. `#114521`). When set, the area under the line is rendered as a lighter shade via opacity.
- `is_active`: Soft delete flag
- `created_by`: User who created mapping
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**Dashboard graph styling defaults:**

- **Default**: Black line with no fill under the line.
- **When `color` is configured**: Solid line in the configured color, with a lighter shaded fill under the line.

**metric_mapping_audit table:**

- Complete audit trail with action type, old/new values, user, IP, timestamp

## Project Directory Structure

```text
BSI-telemetry-reporting/
├── frontend/              # React frontend application
│   ├── public/            # Static files
│   ├── src/               # Source files
│   │   ├── assets/        # Images and other static assets
│   │   ├── components/    # React components
│   │   │   ├── reports/   # Report generation components
│   │   │   ├── VisualizationSettings.js  # Metric mapping UI
│   │   │   ├── NodeDetail.js             # Dashboard with conditional rendering
│   │   │   └── ...       # Other components
│   │   ├── config/        # Configuration files
│   │   ├── App.js         # Main application component
│   │   └── index.js       # Application entry point
│   ├── .env.example      # Example environment variables
│   ├── package.json      # Frontend dependencies
│   └── README.md         # Frontend documentation
│
├── backend/              # Node.js/Express backend server
│   ├── database/         # Database files
│   │   ├── migrations/   # SQL migration files
│   │   │   ├── 001_create_users_table.sql
│   │   │   ├── 002_create_user_node_assignments.sql
│   │   │   └── 003_create_metric_mappings.sql
│   │   │   └── 004_add_color_to_metric_mappings.sql
│   │   └── setup.js      # Database setup script
│   ├── routes/           # API routes
│   │   ├── metricMappings.js      # Metric mapping CRUD API
│   │   ├── telemetryMappings.js   # Telemetry display API
│   │   └── ...           # Other routes
│   ├── middleware/       # Express middleware
│   │   └── auth.js       # Authentication middleware
│   ├── verify-nodes.js   # Mapping verification script
│   ├── .env.example     # Example environment variables
│   ├── server.js        # Main server file
│   ├── package.json     # Backend dependencies
│   └── README.md        # Backend documentation
│
├── .gitignore           # Git ignore file
├── package.json         # Root package.json
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
