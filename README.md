# BSI Telemetry Reports

A full-stack web application for visualizing and analyzing telemetry data from various nodes and base stations. Features intelligent data analysis, responsive grid layouts, and real-time monitoring capabilities.

## Project Structure

The project is organized into three main directories:

- `/frontend`: React application with Material UI for the user interface
- `/backend`: Node.js/Express server handling database operations and API endpoints
- `/`: Root directory containing project-wide configuration and scripts

## Features

- Real-time telemetry data visualization with auto-refresh
- Intelligent data analysis and recommendations
- Responsive grid layout for optimal viewing
- Time-range aware data sampling and visualization
- Multiple node and base station support
- Interactive graphs with tooltips
- Automatic threshold detection
- Mobile-friendly design
- PDF Report Features:
  - Professional layout with company branding
  - Comprehensive metric analysis
  - Clear data visualization with graphs
  - Status indicators and warnings
  - Time-stamped data points
  - Automatic data sampling based on time range
  - Multi-base station support

## Prerequisites

- Node.js (v19.x or higher recommended)
- MySQL Server
- npm
- Modern web browser with JavaScript enabled
- PDF viewer for report access

### Node.js Version Note

The project uses the `cross-env` package to handle Node.js v22+ compatibility with the `--openssl-legacy-provider` flag. This is already configured in the project.

## Quick Start

1. Clone the repository:

   ```bash
      git clone git@github.com:OnsongoMabeya/Telemetry-Reporting.git
      cd BSI-telemetry-reporting
   ```

2. Install dependencies:

   ```bash
      # Install root dependencies
      npm install

      # Install frontend dependencies
      cd frontend
      npm install

      # Install backend dependencies
      cd ../backend
      npm install
   ```

3. Configure environment variables:

   Copy the example environment files and update them with your settings:

   ```bash
   # For backend
   cp backend/.env.example backend/.env
   # For frontend
   cp frontend/.env.example frontend/.env
   ```

   Backend `.env` example:

   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=horiserverlive
   DB_PORT=3306
   PORT=5000
   ```

   Frontend `.env` example:

   ```env
   PORT=3010
   REACT_APP_API_URL=http://localhost:5000
   ```

4. Start the application:

   ```bash
      # From the root directory
      npm run dev
   ```

The application will be available at:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)

## Available Scripts

- `npm run dev`: Start both frontend and backend servers
- `npm run start-frontend`: Start only the frontend server
- `npm run start-backend`: Start only the backend server

## Repository Structure

```tree
   BSI-telemetry-reporting/
   ├── frontend/          # React frontend application
   ├── backend/           # Node.js backend server
   ├── package.json       # Root package.json for running both servers
   └── README.md          # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
