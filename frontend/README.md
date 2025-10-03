# BSI Telemetry Reports - Frontend

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Material-UI](https://img.shields.io/badge/Material--UI-5.x-0081CB?logo=mui)
![Recharts](https://img.shields.io/badge/Recharts-2.x-FF6384?logo=recharts)
![License](https://img.shields.io/badge/License-MIT-green)

React frontend application for the BSI Telemetry Reports project. Built with Material UI and Recharts for data visualization. This application provides real-time monitoring, data analysis, and reporting capabilities for telemetry data across multiple base stations.

## ✨ Features

### 📊 Dashboard

- Modern, responsive Material UI design with 2x4 grid layout
- Real-time data visualization with auto-refresh
- Time-range selection (5m to 30d) with smart data sampling
- Interactive tooltips and legends
- Dark/light theme support

### 📈 Data Visualization

- Line charts for time-series data
- Custom tooltips with detailed metrics
- Zoom and pan functionality
- Multi-metric comparison
- Threshold indicators and alerts

### 📑 Reporting

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

- `npm start`: Start development server with hot-reload
- `npm test`: Run tests in watch mode
- `npm run build`: Create production build
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npm run analyze`: Analyze bundle size

## Dependencies

### Core
- React 18
- React Router 6
- Material-UI 5
- Recharts 2.7
- Axios
- date-fns

### Development
- ESLint
- Prettier
- Jest
- React Testing Library

## Contributing

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

Ejects the create-react-app configuration for full control.

## Key Technologies

- React 19.1.0
- Material UI 7.1.0
- Recharts 2.15.3
- React Router 7.6.0
- Axios 1.9.0
- jsPDF 3.0.1
- D3.js 7.9.0
- html2canvas 1.4.1
- File Saver 2.0.5

## Features by Component

### Navbar

- Application header with navigation
- Responsive design

### NodeList

- Displays all available nodes
- Card-based layout
- Click-through navigation

### NodeDetail

- Tab-based navigation between base stations
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

## Development

The application is built with modern React practices including:

- Functional components
- React Hooks
- Context API (where needed)
- Responsive design principles
- Error handling
- Loading states

## API Integration

The frontend communicates with the backend through these endpoints:

- `GET /api/nodes` - Fetch all nodes
- `GET /api/basestations/:nodeName` - Fetch base stations for a node
- `GET /api/telemetry/:nodeName/:baseStation` - Fetch telemetry data
