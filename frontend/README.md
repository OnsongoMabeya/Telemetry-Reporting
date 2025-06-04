# BSI Telemetry Reports - Frontend

React frontend application for the BSI Telemetry Reports project. Built with Material UI and Recharts for data visualization.

## Features

- Modern, responsive Material UI design with 2x4 grid layout
- Smart data analysis with percentage changes and trends
- Time-range aware data visualization
- Interactive graphs with tooltips
- Automatic threshold detection
- Dynamic data sampling based on time range
- Real-time updates with auto-refresh
- Mobile-first responsive design

## PDF Report Features

- Professional layout with BSI branding
- Metric-by-metric analysis
- Clear data visualization
- Status indicators for issues
- Automatic data sampling
- Multi-base station support
  - Color-coded metric graphs
  - Detailed trend analysis
  - Status indicators and warnings
  - Metric-specific recommendations
  - Statistical summaries
  - Timestamped file names for better organization
  - Grid layout for HTML reports
  - Optimized graph rendering for both formats

## Component Structure

```tree
    src/
    ├── components/
    │   ├── Navbar.js          # Application header
    │   ├── NodeList.js        # Home page with list of nodes
    │   ├── NodeDetail.js      # Detailed view with graphs
    │   └── reports/
    │       ├── PDFReport.js   # PDF report generation
    │       ├── HTMLReport.js  # HTML report generation
    │       └── PDFReport.css  # PDF styling
    ├── App.js                 # Main application component
    └── index.js               # Application entry point
```

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your settings:

   ```env
   PORT=3010                       # Frontend port (default: 3010)
   REACT_APP_API_URL=http://localhost:5000  # Backend API URL
   ```

## Node.js Version Note

If using Node.js v22+, you'll need to set the `NODE_OPTIONS=--openssl-legacy-provider`. You can:

- Install cross-env: `npm install --save-dev cross-env`
- Or run directly: `$env:NODE_OPTIONS="--openssl-legacy-provider" ; npm start`

## Available Scripts

### `npm start`

Runs the app in development mode at [http://localhost:3010](http://localhost:3010).

### `npm run start`

Runs the app in development mode at [http://localhost:3010](http://localhost:3010).

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run dev`

Runs the app in development mode with hot reloading.

## Key Technologies

- React
- Material UI
- Recharts
- React Router
- Axios
- jsPDF
- D3.js
- html2canvas

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
