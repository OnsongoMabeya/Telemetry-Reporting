# BSI Telemetry Reports - Frontend

React frontend application for the BSI Telemetry Reports project. Built with Material UI and Recharts for data visualization.

## Features

- Modern, responsive Material UI design
- Interactive data visualization with Recharts
- Real-time data updates
- Dynamic routing with React Router
- Automatic data analysis and recommendations
- Mobile-friendly interface

## Component Structure

```tree
    src/
    ├── components/
    │   ├── Navbar.js          # Application header
    │   ├── NodeList.js        # Home page with list of nodes
    │   └── NodeDetail.js      # Detailed view with graphs
    ├── App.js                 # Main application component
    └── index.js              # Application entry point
```

## Available Scripts

### `npm start`

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Key Technologies

- React
- Material UI
- Recharts
- React Router
- Axios

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
- 8 different metric graphs per base station:

  - Forward Power
  - Reflected Power
  - VSWR
  - Return Loss
  - Temperature
  - Voltage
  - Current
  - Power

- Real-time data updates
- Automatic analysis generation
- Recommendations based on data patterns

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
