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
- Responsive 2x4 grid layout for optimal viewing
- Time-range aware data sampling
- Multiple node and base station support
- Interactive graphs with tooltips
- Automatic threshold detection
- Mobile-friendly design
- Advanced PDF reporting:
  - Comprehensive multi-base station reports
  - Color-coded metric visualizations
  - Intelligent trend analysis and status tracking
  - Metric-specific recommendations and warnings
  - Detailed statistical analysis
  - Professional-grade formatting

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn
- Modern web browser with JavaScript enabled
- PDF viewer for report access

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

3. Configure the backend:
   - Create a `.env` file in the `/backend` directory
   - Add your MySQL configuration:

      ```env
         DB_HOST=localhost
         DB_USER=your_username
         DB_PASSWORD=your_password
         DB_NAME=horiserverlive
         DB_PORT=3306
         PORT=5000
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
