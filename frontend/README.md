# BSI Telemetry Reports - Frontend

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.1.0-0081CB?logo=mui)](https://mui.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2.15.3-FF6384?logo=recharts)](https://recharts.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.3-199900?logo=leaflet)](https://leafletjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![ESLint](https://img.shields.io/badge/ESLint-8.57-4B32C3?logo=eslint)](https://eslint.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

Modern React frontend for the BSI Telemetry Reports system, providing real-time monitoring, data visualization, and reporting capabilities for telemetry data across multiple base stations in Kenya. Built with cutting-edge web technologies for optimal performance and user experience.

## 🚀 Quick Start

### Prerequisites

- Node.js v22.x (LTS recommended)
- npm 10.x or yarn
- Backend API server (see [backend README](../backend/README.md))
- Modern web browser (Chrome, Firefox, Edge, or Safari)

### 🛠 Installation & Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
    cd Telemetry-Reporting/frontend
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
   # Update API endpoint and other settings
   ```

4. **Start development server**

   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Or for production build
   npm run build
   npm run preview
   ```

5. **Access the application**

   - Development: [http://localhost:3010](http://localhost:3010)
   - Production: Configured by your hosting provider

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```env
# Application
PORT=3010
REACT_APP_ENV=development
REACT_APP_NAME="BSI Telemetry"
REACT_APP_VERSION=1.0.0

# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_TIMEOUT=30000  # 30 seconds

# Feature Flags
REACT_APP_FEATURE_REPORTS=true
REACT_APP_FEATURE_ALERTS=true
REACT_APP_FEATURE_EXPORT=true

# Analytics (optional)
REACT_APP_GA_TRACKING_ID=UA-XXXXX-Y
```

## 🌐 Network & API Configuration

The frontend is designed for flexible deployment with automatic hostname detection:

### Development

- **Frontend**: `http://localhost:3010`
- **API**: `http://localhost:5000`

### Production

- **Frontend**: `https://your-domain.com`
- **API**: `https://api.your-domain.com` or relative path `/api`

### Key Features

- **Automatic API Detection**: Dynamically determines the correct API endpoint
- **Environment-based Configuration**: Different settings for dev/test/prod
- **CORS Ready**: Pre-configured for secure cross-origin requests

## ✨ Key Features

### 🗺️ Interactive Kenya Map

- Real-time base station monitoring
- Color-coded status indicators
- Interactive popups with detailed information
- Responsive design for all devices

### 📊 Data Visualization

- Real-time telemetry charts
- Multiple chart types (line, bar, gauge)
- Customizable time ranges
- Export functionality

### 📱 Responsive Design

- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly controls
- Offline capabilities

### 🛠 Developer Experience

- TypeScript support
- Component library with Storybook
- Comprehensive test coverage
- CI/CD ready

### 🗺️ Kenya Map

- **Interactive Kenya Map**: Real-time base station monitoring with Leaflet
  - OpenStreetMap tiles with zoom and pan controls
  - Color-coded markers for station status (online/offline/unknown)
  - Interactive popups with station details and coordinates
  - Auto-refresh every 5 minutes for real-time updates
  - Responsive design for mobile and desktop viewing
  - BSI-branded header with station counts and status
  - Map bounds auto-fit to show all stations clearly

### 📊 Dashboard

- **Responsive Layout**: Adapts to all screen sizes (mobile, tablet, desktop)
- **Real-time Monitoring**: Auto-refreshing data visualizations
- **Time Range Selection**:
  - Quick select: 5m, 15m, 30m, 1h, 6h, 12h, 1d, 7d, 30d
  - Custom date/time range picker
  - Smart data sampling for optimal performance
- **Interactive Features**:
  - Hover tooltips with detailed metrics
  - Clickable legends to toggle data series
  - Zoom and pan functionality
  - Export chart as image/PDF/CSV
- **Theme Support**:
  - Light/dark mode with system preference detection
  - High contrast mode for accessibility
  - Customizable color schemes

### 📈 Data Visualization

- **Chart Types**:
  - Line charts for time-series data
  - Bar/column charts for comparisons
  - Gauges for single metrics
  - Heatmaps for correlation analysis
- **Custom Components**:
  - Resizable and draggable charts
  - Custom tooltips and legends
  - Animated transitions

### 🔔 Alerts & Notifications

- **Real-time Alerts**: Visual and audio notifications
- **Alert Rules**: Customizable thresholds and conditions
- **Notification Center**: Centralized view of all alerts
- **Email Notifications**: Optional email alerts

### 📑 Reporting

- **Scheduled Reports**: Daily/weekly/monthly
- **Export Formats**: PDF, CSV, Excel
- **Custom Templates**: Branded report templates
- **Automated Delivery**: Email reports to stakeholders

### 📈 Data Visualizationn

#### Chart Types

- **Time Series Line Charts**: For trend analysis
- **Area Charts**: For cumulative metrics
- **Bar/Column Charts**: For comparison
- **Gauge Charts**: For threshold monitoring
- **Heatmaps**: For data density visualization

#### Interactive Features

- **Zoom & Pan**: Navigate through time-series data
- **Brush & Select**: Focus on specific time ranges
- **Crosshairs**: Precise data point inspection
- **Threshold Lines**: Visual indicators for critical values
- **Annotations**: Add context to important events

#### Performance Optimizations

- Virtualized rendering for large datasets
- Data sampling for improved performance
- Smooth animations (60fps)
- Memory-efficient data handling

### 📑 Reportingg

- Generate PDF reports with BSI branding
- Custom report templates
- Export data in multiple formats (CSV, JSON)
- Scheduled report generation

### 🔧 Technical Features

- Built with React 18 and Material-UI v5
- State management with React Context API
- Responsive design for all screen sizes
- Optimized performance with memoization
- Comprehensive error handling

## 🖨️ PDF Report Features

### Layout & Design

- Professional layout with BSI branding
- Responsive design for both screen and print
- Consistent color scheme and typography
- Custom header and footer

### Data Presentation

- Metric-by-metric analysis
- Clear, high-resolution data visualization
- Status indicators and warning badges
- Statistical summaries and key metrics

### Technical Implementation

- Automatic data sampling based on time range
- Optimized graph rendering for PDF export
- Support for multiple base stations in single report
- Color-coded metrics for easy identification
- Timestamped file names for organization

## 🏗️ Project Structure

```text
src/
├── assets/                  # Static assets (images, fonts)
├── components/              # Reusable components
│   ├── common/              # Shared components
│   ├── dashboard/           # Dashboard components
│   ├── reports/             # Report generation
│   │   ├── PDFReport.js     # PDF report generation
│   │   ├── ReportGenerator/ # Report generation components
│   │   └── templates/       # Report templates
│   └── ui/                  # UI components
├── config/                  # Configuration files
├── context/                 # React context providers
├── hooks/                   # Custom React hooks
│   ├── Dashboard.js         # Main dashboard
│   ├── Reports.js           # Reports page
│   └── Settings.js          # Application settings
├── services/                # API services
├── styles/                  # Global styles
├── utils/                   # Utility functions
{{ ... }}
### Available Scripts

- `npm start`: Start development server with hot-reload on port 3010
- `npm test`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report
- `npm run build`: Create production build
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npm run analyze`: Analyze bundle size
- `npm run eject`: Eject from create-react-app (one-way operation)

### Project Structure

```text
frontend/
├── public/                 # Static files
│   ├── index.html          # Main HTML template
│   ├── favicon.ico         # Favicon
│   └── assets/             # Images, fonts, etc.
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Common components (buttons, inputs, etc.)
│   │   ├── charts/         # Chart components
│   │   └── layout/         # Layout components
│   ├── config/             # App configuration
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── store/              # State management
│   ├── styles/             # Global styles and themes
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main App component
│   └── index.tsx           # Application entry point
├── .env.example            # Example environment variables
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies and scripts
```

### Code Style

- **ESLint**: Configured with React/TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict mode enabled
- **Imports**: Absolute imports with `@/` alias

### Testing

- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: Storybook + @storybook/testing-react
- **E2E Tests**: Cypress (optional)

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (if configured)
npm run test:e2e
```

## 🚀 Production Build

To create a production build:

```bash
npm run build
```

This will create an optimized production build in the `build` directory.

### Deployment

#### Static Hosting

1. Build the application:

   ```bash
   npm run build
   ```

2. Deploy the `build` directory to your static hosting provider (Netlify, Vercel, S3, etc.)

#### Docker

1. Build the Docker image:

   ```bash
   docker build -t bsi-telemetry-frontend .
   ```

2. Run the container:

   ```bash
   docker run -p 80:80 bsi-telemetry-frontend
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 📞 Support

For support, please contact:

- **Email**: [support@bsi.com](mailto:support@bsi.com)
- **Issues**: [GitHub Issues](https://github.com/OnsongoMabeya/Telemetry-Reporting/issues)
- **Documentation**: [GitHub Wiki](https://github.com/OnsongoMabeya/Telemetry-Reporting/wiki)

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - JavaScript library for building user interfaces
- [Material-UI](https://mui.com/) - React UI component library
- [Recharts](https://recharts.org/) - Charting library
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- Built with ❤️ by the BSI Engineering Team

Note: The development server runs on port 3010 to avoid conflicts with other services.

## Dependencies

### Core

- React 19.1.0
- React Router 7.6.0
- Material-UI 7.1.0
- Recharts 2.15.3
- Axios 1.9.0
- D3.js 7.9.0
- jsPDF 3.0.1
- html2canvas 1.4.1
- File Saver 2.0.5
- **Leaflet 1.9.4**: Interactive mapping library
- **React-Leaflet 4.2.1**: React integration for Leaflet

### Developmentt

- @testing-library/react (included with create-react-app)
- ESLint (included with create-react-app)
- Prettier (recommended)
- cross-env 7.0.3 (for cross-platform environment variables)

## Contributing

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

Ejects the create-react-app configuration for full control.

## Project Structure

```text
src/
├── assets/                  # Static assets (images, fonts)
├── components/              # Reusable components
│   ├── common/              # Shared components
│   ├── dashboard/           # Dashboard components
│   ├── reports/             # Report generation components
│   └── ui/                  # UI components
├── config/                  # Configuration files
├── context/                 # React context providers
├── hooks/                   # Custom React hooks
├── pages/                   # Page components
│   ├── Dashboard/           # Main dashboard
│   ├── Reports/             # Reports page
│   └── Settings/            # Application settings
├── services/                # API services
├── styles/                  # Global styles
└── utils/                   # Utility functions
```

## Features by Component

### Navbar

- Application header with navigation
- Responsive design

### KenyaMap

### 🗺️ Kenya Base Station Map Features

- **Interactive Leaflet Map**: High-performance visualization of all base stations across Kenya
- **Accurate Station Plotting**: Precise geographic coordinates for all stations
  - Verified GPS coordinates for each location
  - Special handling for co-located stations (e.g., LIMURU and LIMURU_NMG at 1.1085° S, 36.6421° E)
  - Automatic clustering of nearby stations

- **Real-time Data**:

  - 5-minute refresh intervals for up-to-date status
  - Color-coded markers based on real-time status (online/offline)
  - Smooth animations for status changes

- **Interactive Features**:
  - Clickable markers with detailed station information
  - Tooltips showing station name and status
  - Zoom and pan controls
  - Responsive design that works on all devices
  - BSI-branded map styling

- **Station Information**:
  - Station name and identifier
  - Current status (online/offline)
  - Last updated timestamp
  - Number of connected nodes (if applicable)
- Auto-fitting map bounds to show all stations
- **Node Filtering**: Accepts `selectedNode` prop to filter base stations by selected node
- **Dynamic Updates**: Re-fetches data when node selection changes

### NodeList

- Displays all available nodes
- Card-based layout
- Click-through navigation

### NodeDetail

- Tab-based navigation between base stations
- **Integrated Kenya Map**: Shows all base stations on left side of telemetry graphs
- Responsive 2x4 grid layout for metrics:

  - Forward Power (with threshold analysis)
  - Reflected Power (with safety checks)
  - VSWR (with trend analysis)
  - Return Loss (with performance insights)
  - Temperature (with thermal monitoring)
  - Voltage (with stability tracking)
  - Current (with load analysis)
  - Power (with efficiency metrics)

- Smart time range selection:
  - 5m-30m: Per-second granularity
  - 1h-6h: Minute-level data
  - 1d-2d: Hourly aggregation
  - 5d-1w: Daily summaries

- Intelligent analysis features:
  - Percentage change from average
  - Trend detection
  - Threshold violations
  - Performance recommendations

- Map Integration:
  - Kenya map displayed alongside telemetry graphs
  - Real-time station status indicators
  - Interactive station markers with details

## Developmennt

The application is built with modern React practices including:

- Functional components with hooks
- React Context API for state management
- Material UI components with custom theming
- Responsive design with CSS Grid and Flexbox
- Error boundaries and loading states
- Custom hooks for data fetching and state management

## API Integration

The frontend communicates with the backend through these endpoints:

- `GET /api/nodes` - Fetch all nodes
- `GET /api/basestations/:nodeName` - Fetch base stations for a node
- `GET /api/telemetry/:nodeName/:baseStation` - Fetch telemetry data
- `GET /api/basestations-map` - Fetch all base stations with coordinates for Kenya map
- `POST /api/reports/generate` - Generate PDF reports

## Environment Variabless

The following environment variables can be configured in `.env`:

```env
PORT=3010
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEFAULT_TIME_RANGE=1h
REACT_APP_THEME=light  # light or dark
REACT_APP_ANALYTICS=false  # Enable/disable analytics
```

## Contributingg

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
