# BSI Telemetry Reporting System

A comprehensive telemetry monitoring solution for tracking and analyzing node performance across multiple base stations. The system provides real-time data visualization, historical analysis, and automated reporting capabilities.

![BSI Telemetry Dashboard](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)

## 🌐 Network Access

The application is designed for flexible deployment and can be accessed from multiple interfaces:

- **Local Development**: `http://localhost:3010`
- **Network Access**: `http://[YOUR_IP_ADDRESS]:3010` (works with any network-accessible IP)
- **Backend API**: `http://[YOUR_IP_ADDRESS]:5000` (automatically configured)

The frontend automatically detects the hostname and configures API endpoints accordingly. This means you can access the application from any device on the same network without manual configuration changes.

- Dynamic API endpoint configuration based on hostname
- Seamless switching between localhost and network access
- CORS pre-configured for common development scenarios

## 🌟 Features

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

## 📋 Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** 9.x or later
- **MySQL** 8.0+ or compatible database
- **Modern web browser** (Chrome, Firefox, Edge, or Safari)
- **Git** for version control

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
   - Create a new MySQL database
   - Import the database schema (check `backend/database/` for SQL files)
   - Update database credentials in the backend `.env` file

5. **Configure Environment**

   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   
   # Edit the .env files with your configuration
   ```

6. **Environment Variables**

### Backend (`.env`)

```env
# Database Configuration
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
REACT_APP_FEATURE_REPORTS=true
REACT_APP_FEATURE_ALERTS=true
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x (LTS) or later
- MySQL 8.0+ server
- SMTP server (for email functionality)

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd BSI-telemetry-reporting
   ```

2. **Install dependencies**

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

3. **Set up environment variables**

   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit the .env files with your configuration
   # See the Configuration section below for details
   ```

4. **Start the backend server**

   ```bash
   cd backend
   npm start
   ```

5. **Start the frontend development server** (in a new terminal)

   ```bash
   cd frontend
   npm start
   ```

6. **Access the application**
   - Frontend: [http://localhost:3010](http://localhost:3010)
   - Backend API: [http://localhost:5000](http://localhost:5000)
   - API Documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

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

| Time Range | Sample Interval | Data Points | Cache TTL  | Best For |
|------------|-----------------|-------------|------------|----------|
| 5m         | 10 seconds      | 30          | 30s        | Real-time monitoring |
| 10m        | 10 seconds      | 60          | 30s        | Short-term analysis |
| 30m        | 30 seconds      | 60          | 2m         | Quick diagnostics |
| 1h         | 1 minute        | 60          | 5m         | Hourly trends |
| 2h         | 2 minutes       | 60          | 5m         | Multi-hour monitoring |
| 6h         | 5 minutes       | 72          | 10m        | Half-day analysis |
| 1d         | 15 minutes      | 96          | 15m        | Daily overview |
| 2d         | 30 minutes      | 96          | 30m        | Two-day trends |
| 5d         | 1 hour          | 120         | 1h         | Weekly analysis |
| 1w         | 2 hours         | 84          | 2h         | Weekly summary |
| 2w         | 4 hours         | 84          | 4h         | Bi-weekly review |
| 30d        | 1 day           | 30          | 12h        | Monthly reporting |

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Workflow

1. **Frontend Development**

   ```bash
   cd frontend
   npm start  # Runs on http://localhost:3010
   ```

2. **Backend Development**

   ```bash
   cd backend
   npm start  # Runs on http://localhost:5000
   ```

3. **Running Both** (from project root)

   ```bash
   npm run dev  # Runs both frontend and backend concurrently
   ```

### Testing

- Run frontend tests:

  ```bash
  cd frontend
  npm test
  ```

- Run backend tests:

  ```bash
  cd backend
  npm test
  ```

### Code Style

- We use ESLint and Prettier for code formatting
- Follow the existing code style
- Write meaningful commit messages
- Include tests for new features

## 📞 Support

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

   - Frontend: [http://localhost:3000](http://localhost:3000)
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

## Repository Structure

```text
BSI-telemetry-reporting/
├── frontend/              # React frontend application
│   ├── public/            # Static files
│   ├── src/               # Source files
│   │   ├── assets/        # Images and other static assets
│   │   ├── components/    # React components
│   │   │   ├── reports/   # Report generation components
│   │   │   └── ...       # Other components
│   │   ├── config/        # Configuration files
│   │   ├── App.js         # Main application component
│   │   └── index.js       # Application entry point
│   ├── .env.example      # Example environment variables
│   ├── package.json      # Frontend dependencies
│   └── README.md         # Frontend documentation
│
├── backend/              # Node.js/Express backend server
│   ├── middleware/       # Express middleware
│   │   └── auth.js       # Authentication middleware
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
