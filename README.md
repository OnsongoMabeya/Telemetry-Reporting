# BSI Telemetry Reporting System

A comprehensive telemetry monitoring solution for tracking and analyzing node performance across multiple base stations. The system provides real-time data visualization, historical analysis, and automated reporting capabilities.

## 🚀 Key Features

### Real-time Monitoring

- Live telemetry data visualization with auto-refresh
- Interactive dashboards with multiple chart types
- Real-time alerts and notifications

### Data Analysis

- Intelligent data sampling based on time range
- Automatic threshold detection and alerts
- Performance trend analysis
- Multi-metric correlation

### Reporting

- Automated PDF report generation
- Customizable report templates
- Export functionality for data analysis
- Scheduled report delivery

### System Architecture

- **Frontend**: React with Material-UI
- **Backend**: Node.js/Express with MySQL
- **Data Processing**: Optimized SQL queries with time-based sampling
- **Caching**: In-memory caching for improved performance

## 📋 Prerequisites

- Node.js v18+ (LTS recommended)
- MySQL 8.0+
- npm 9.x or later
- Modern web browser (Chrome, Firefox, Edge, or Safari)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd BSI-telemetry-reporting
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../backend
   npm install
   cd ..
   ```

3. **Configure environment**

   ```bash
   # Copy and configure backend environment
   cp backend/.env.example backend/.env
   
   # Copy and configure frontend environment
   cp frontend/.env.example frontend/.env
   ```

4. **Environment Variables**

   `backend/.env`:

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
   CACHE_TTL=300  # 5 minutes cache TTL
   ```

   `frontend/.env`:

   ```env
   PORT=3010
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_DEFAULT_TIME_RANGE=1h
   ```

## 🚦 Running the Application

1. **Start the backend server**

   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend development server**

   ```bash
   cd frontend
   npm start
   ```

3. **Access the application**
   - Frontend: [http://localhost:3010](http://localhost:3010)
   - API Documentation: [http://localhost:5000/api-docs](http://localhost:5000/api-docs) (if Swagger is configured)

## 📊 Data Sampling Intervals

The system automatically adjusts data sampling based on the selected time range:

| Time Range | Sample Interval | Data Points | Best For |
|------------|-----------------|-------------|----------|
| 5m - 10m   | 10 seconds      | 30-60       | Real-time monitoring |
| 30m        | 30 seconds      | 60          | Short-term analysis |
| 1h         | 1 minute        | 60          | Hourly trends |
| 2h         | 2 minutes       | 60          | Multi-hour monitoring |
| 6h         | 5 minutes       | 72          | Half-day analysis |
| 1d         | 15 minutes      | 96          | Daily overview |
| 2d         | 30 minutes      | 96          | Two-day trends |
| 5d         | 1 hour          | 120         | Weekly analysis |
| 1w         | 2 hours         | 84          | Weekly summary |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

For questions or support, please contact the development team at [your-email@example.com](mailto:your-email@example.com)

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
