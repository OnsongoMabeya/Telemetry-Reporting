# BSI Telemetry Reports - Backend

[![Node.js](https://img.shields.io/badge/Node.js-22.x-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/OnsongoMabeya/Telemetry-Reporting/ci.yml?branch=main)](https://github.com/OnsongoMabeya/Telemetry-Reporting/actions)
[![Coverage Status](https://coveralls.io/repos/github/OnsongoMabeya/Telemetry-Reporting/badge.svg?branch=main)](https://coveralls.io/github/OnsongoMabeya/Telemetry-Reporting?branch=main)

Node.js/Express backend server for the BSI Telemetry Reports application. This service handles all data processing, database operations, and provides a RESTful API for the frontend application. The backend now includes enhanced features like email report generation, improved error handling, and better data processing capabilities.

## 🌟 Features

- **RESTful API** with JWT authentication
- **Real-time data processing** with WebSocket support
- **Email report generation** with customizable templates
- **Caching** with node-cache for improved performance
- **Rate limiting** to prevent abuse
- **Comprehensive error handling** with custom error middleware
- **Request validation** using express-validator
- **Logging** with Winston
- **API documentation** with Swagger/OpenAPI
- **Unit and integration tests** with Jest
- **Docker support** for easy deployment
- **Environment-based configuration**
- **Database migrations** with Knex.js
- **Scheduled tasks** for report generation
- **Health check endpoints**
- **Request/Response logging**
- **Security headers** with Helmet
- **CORS** with dynamic origin configuration
- **Geographic mapping** with Kenya base station coordinates

## 🚀 Getting Started

### Prerequisites

- Node.js 22.x (LTS recommended)
- MySQL 8.0 or higher
- npm 10.x or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd Telemetry-Reporting/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**

   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

The server will be available at `http://localhost:5000` by default.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=horiserverdatalive

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
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

### Network & CORS Configuration

The backend is configured to handle requests from specific origins defined in the environment variables for security.

#### Setup

1. Copy `.env.example` to `.env` if you haven't already:

   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and update the `ALLOWED_ORIGINS` variable with your frontend URLs:

   ```plaintext
   # Example:
   ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000,http://your-ip:3010
   ```

#### CORS Configuration

- **Allowed Methods**:
  - GET, POST, PUT, DELETE, OPTIONS
  - PATCH for partial updates
- **Allowed Headers**:
  - Authorization
  - Content-Type
  - Accept
  - Cache-Control
  - Pragma
  - Expires
  - If-Modified-Since
  - X-HTTP-Method-Override
  - X-Requested-With
- **Credentials**: Enabled (cookies, HTTP authentication)
- **Preflight Cache**: 24 hours
- **Max Age**: 86400 seconds

## 📚 API Documentation

API documentation is available at `/api-docs` when running in development mode. The documentation is generated using Swagger/OpenAPI.

To view the API documentation:

1. Start the server in development mode:

   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:

   ```link
   http://localhost:5000/api-docs
   ```

## 🧪 Testing

Run tests with the following commands:

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

## 🐳 Docker

To run the application in a Docker container:

1. Build the Docker image:

   ```bash
   docker build -t bsi-telemetry-backend .
   ```

2. Run the container:

   ```bash
   docker run -p 5000:5000 --env-file .env bsi-telemetry-backend
   ```

## 🔄 Database Migrations

Database migrations are managed using Knex.js. To run migrations:

```bash
# Run pending migrations
npm run migrate:latest

# Rollback the latest migration
npm run migrate:rollback

# Create a new migration
npm run migrate:make migration_name
```

## 📦 Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run format` - Format the code
- `npm run migrate:*` - Database migration commands
- `npm run seed` - Seed the database with test data
- `npm run docs:generate` - Generate API documentation
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, please contact:

- **Email**: [support@bsi.com](mailto:support@bsi.com)
- **Issues**: [GitHub Issues](https://github.com/OnsongoMabeya/Telemetry-Reporting/issues)
- **Documentation**: [GitHub Wiki](https://github.com/OnsongoMabeya/Telemetry-Reporting/wiki)

## 🙏 Acknowledgments

- [Express](https://expressjs.com/) - Web framework for Node.js
- [Knex.js](https://knexjs.org/) - SQL query builder
- [Jest](https://jestjs.io/) - Testing framework
- [Docker](https://www.docker.com/) - Container platform
- [Swagger](https://swagger.io/) - API documentation
- Built with ❤️ by the BSI Engineering Team

## Development Tips

- For development, you can allow all origins by setting `ALLOWED_ORIGINS=*` in your `.env` file
- Always restart your server after changing environment variables
- Never commit your `.env` file to version control

### Core Functionality

- **RESTful API** - Comprehensive endpoints for all frontend data needs
  - Node management (CRUD operations)
  - Telemetry data retrieval with filtering
  - Report generation endpoints with email delivery
  - System health and status endpoints
  - Email report generation with customizable templates

- **Real-time Data Processing**
  - Efficient handling of high-frequency telemetry data
  - WebSocket support for real-time updates (coming soon)
  - Data validation and sanitization
  - Request rate limiting (100 requests/minute per IP)

- **Data Management**
  - Smart data sampling and aggregation
  - Historical data retention policies
  - Data export functionality (CSV/JSON)
  - Automatic data cleanup and optimization

### Performance & Reliability

- **Connection Pooling** - Efficient MySQL connection management with connection reuse
- **In-memory Caching** - Node-cache implementation for frequently accessed data with configurable TTL
- **Rate Limiting** - Protection against abuse (100 requests/minute per IP)
- **Request Validation** - Comprehensive input validation for all endpoints
- **Error Handling** - Enhanced error handling with detailed error messages and logging
- **Email Queue** - Background processing for email delivery to prevent blocking the main thread

### Developer Experience

- **Detailed Logging** - Configurable log levels and formats
- **Environment-based Config** - Easy configuration for different environments
- **API Documentation** - Comprehensive endpoint documentation
- **Error Handling** - Structured error responses and logging

### Data Management

- **Time-based Sampling** - Intelligent data sampling based on time range (5m to 30d)
- **Pagination** - Efficient handling of large datasets
- **Data Export** - Support for data export in multiple formats

## 🚀 Getting Startedd

### Prerequisitess

- Node.js 18.x or later
- MySQL 8.0 or later
- npm 9.x or later

### Installationn

1. **Clone the repository**

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd BSI-telemetry-reporting/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=dbuser
   DB_PASSWORD=securepass
   DB_NAME=horiserverlive
   
   # Cache Configuration
   CACHE_ENABLED=true
   CACHE_TTL=300  # 5 minutes
   
   # Rate Limiting
   RATE_LIMIT_ENABLED=true
   RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
   RATE_LIMIT_MAX=100
   
   # Logging
   LOG_LEVEL=info
   LOG_FORMAT=combined
   ```

### Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with hot-reload
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed the database with sample data
- `npm run send-test-email` - Send a test email (configure SMTP settings first)
- `npm run check-connections` - Check database and email server connections

## 📚 API Reference

### Base URL

All API endpoints are prefixed with `/api`

### Authentication

> **Note**: Currently, the API is open. For production, implement proper authentication middleware.

### Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP address
- **Response**: HTTP 429 (Too Many Requests) when limit is exceeded
- **Headers**:
  - `X-RateLimit-Limit`: Maximum number of requests allowed
  - `X-RateLimit-Remaining`: Remaining number of requests
  - `Retry-After`: Time in seconds until the rate limit resets

### Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "timestamp": "2023-11-15T12:00:00Z"
  }
}

The backend now supports generating and sending reports via email. The system uses Nodemailer for email delivery with support for both SMTP and other email services.

#### Configuration

Add these to your `.env` file:
```env
# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465, false for other ports
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
EMAIL_FROM="BSI Telemetry <noreply@bsitelemetry.com>"
EMAIL_REPLY_TO=support@bsitelemetry.com
```

#### API Endpoints

- `POST /api/reports/email` - Generate and email a report

```json
{
  "nodeId": "node-123",
  "timeRange": "24h",
  "format": "pdf",
  "recipients": ["user@example.com"],
  "subject": "Daily Telemetry Report",
  "message": "Please find attached the daily telemetry report.",
  "includeSummary": true,
  "includeCharts": true
}
```

#### Security Considerations

- All email endpoints require authentication
- Rate limiting is applied to prevent abuse
{{ ... }}
- Email addresses are validated before sending
- Sensitive data is never logged in email logs

### Endpoints

#### Nodes

##### Get All Nodes

```http
GET /api/nodes
```

**Description**: Retrieve a list of all nodes with their basic information.

**Query Parameters**:

- `limit` (number, optional): Maximum number of nodes to return (default: 100)
- `offset` (number, optional): Number of nodes to skip (for pagination, default: 0)
- `status` (string, optional): Filter by node status (online/offline)

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "nodeId": "node1",
      "name": "Main Server",
      "status": "online",
      "lastSeen": "2023-06-15T10:30:00Z",
      "location": "Nairobi"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

#### Node Metrics

##### Get Node Metrics

```http
GET /api/nodes/:nodeId/metrics
```

**Description**: Retrieve metrics for a specific node.

**Query Parameters**:

- `start` (string, required): Start time in ISO 8601 format
- `end` (string, required): End time in ISO 8601 format
- `interval` (string, optional): Data aggregation interval (e.g., '1h', '1d')
- `metrics` (string, optional): Comma-separated list of metrics to retrieve

**Response**:

```json
{
  "success": true,
  "data": {
    "nodeId": "node1",
    "metrics": {
      "cpu": [
        {
          "timestamp": "2023-06-15T10:00:00Z",
          "value": 45.2
        }
      ],
      "memory": [
        {
          "timestamp": "2023-06-15T10:00:00Z",
          "value": 67.8
        }
      ]
    }
  }
}
```

#### Nodes List Response

**Status:** 200 OK

```json
[
  "Node 1",
  "Node 2",
  "Node 3"
]
```

#### Get Base Stations with Coordinates

```http
GET /api/basestations-map?nodeName=Aviation%20FM
```

**Description**: Retrieve all base stations with their geographic coordinates and real-time status for Kenya map visualization. Supports optional node filtering to show only base stations belonging to a specific node.

**Parameters**:

- `nodeName` (optional, string): Filter base stations by node name

**Response**:

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

#### Get Base Stations for a Node

```http
GET /api/basestations/:nodeName
```

#### Parameters

- `nodeName` (string, required): Name of the node

#### Response

**Status:** 200 OK

```json
[
  "Base Station 1",
  "Base Station 2"
]
```

#### Base Stations Error Responses

- `404 Not Found`: If node doesn't exist
- `500 Internal Server Error`: For server-side errors

#### Get Telemetry Data

```http
GET /api/telemetry/:nodeName/:baseStation
```

#### Telemetry Parameters

- `nodeName` (string, required): Name of the node
- `baseStation` (string, required): Name of the base station
- `timeFilter` (string, optional): Time range filter (5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w, 2w, 30d)
- `startTime` (string, optional): Custom start time (ISO 8601 format)
- `endTime` (string, optional): Custom end time (ISO 8601 format)
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Items per page (default: 200, max: 1000)
- `metrics` (string, optional): Comma-separated list of metrics to return (e.g., "forwardPower,reflectedPower")

### Response (Telemetry Data)

```json
{
  "data": [
    {
      "sample_time": "2025-03-03T23:07:00.000Z",
      "forwardPower": 1033.00,
      "reflectedPower": 11.00,
      "vswr": 40.00,
      "returnLoss": 6.00,
      "temperature": 0.00,
      "voltage": 0.00,
      "current": 0.00,
      "power": 0.00
    }
  ],
  "total": 150,
  "page": 1,
  "pageSize": 200,
  "totalPages": 1
}
```

## 🔄 Data Sampling Strategy

The backend implements intelligent data sampling based on the requested time range to optimize performance and data relevance:

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

### Cache Strategy

- Data is cached based on the time range and query parameters
- Cache TTL increases with longer time ranges
- Cache is automatically invalidated when new data is received

## 🗃️ Database Schema

The application uses the following key tables:

### `node_status_table`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int | Primary key |
| `NodeName` | varchar(255) | Name of node |
| `NodeBaseStationName` | varchar(255) | Name of base station |
| `time` | datetime | Timestamp of reading |
| `Analog1Value` | float | Forward Power (W) |
| `Analog2Value` | float | Reflected Power (W) |
| `Analog3Value` | float | VSWR (Voltage Standing Wave Ratio) |
| `Analog4Value` | float | Return Loss (dB) |
| `Analog5Value` | float | Temperature (°C) |
| `Analog6Value` | float | Voltage (V) |
| `Analog7Value` | float | Current (A) |
| `Analog8Value` | float | Power (W) |

### Kenya Base Station Coordinates

The system includes accurate coordinates for major Kenya locations:

| Station | Latitude | Longitude | Status |
|---------|----------|-----------|--------|
| Nairobi | -1.2921 | 36.8219 | Online |
| Mombasa | -4.0435 | 39.6682 | Online |
| Kisumu | -0.0917 | 34.7679 | Online |
| Eldoret | 0.5143 | 35.2698 | Online |
| Nakuru | -0.3031 | 36.0695 | Online |
| Kitale | 1.0149 | 35.0013 | Online |
| Garissa | -0.4528 | 39.6460 | Offline |
| Kakamega | 0.2842 | 34.7519 | Online |
| Nyeri | -0.4243 | 36.9568 | Online |
| Meru | 0.0470 | 37.6555 | Online |
| Thika | -1.0361 | 37.0695 | Online |
| Malindi | -3.2192 | 40.1164 | Online |
| Limuru | -1.2634 | 36.8033 | Online |
| Webuye | 0.6069 | 34.7399 | Online |
| Mazeras | -3.6739 | 39.4927 | Online |

### Indexes

- Primary Key: `id`
- Composite Index: `(NodeName, NodeBaseStationName, time)` for fast time-series queries

### Performance Considerations

- Table is optimized for time-series data
- Data older than 90 days is automatically archived
- Regular maintenance jobs optimize table performance

## 🚦 Error Handling

The API returns appropriate HTTP status codes and error messages in JSON format:

```json
{
  "error": "Error message",
  "errorId": "err_abc123",
  "requestId": "req_xyz456",
  "timestamp": "2025-10-01T12:00:00.000Z"
}
```

## 📊 Performance Considerations

- **Caching**: Responses are cached based on the time range to improve performance
- **Query Optimization**: All database queries are optimized with proper indexing
- **Connection Pooling**: Database connections are pooled for better resource utilization
- **Data Sampling**: Large datasets are automatically sampled to maintain performance

## 🔒 Security

- Input validation on all API endpoints
- CORS configuration to restrict origins
- Rate limiting to prevent abuse
- Environment-based configuration for sensitive data

## 🧪 Testingg

Run tests with:

```bash
npm test
```

## 🚀 Deployment

For production deployment, consider:

1. Setting `NODE_ENV=production`
2. Configuring a reverse proxy (Nginx/Apache)
3. Setting up HTTPS with valid certificates
4. Implementing proper authentication/authorization
5. Configuring proper logging and monitoring

## 🤝 Contributingg

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Dependencies

- express: Web framework
- mysql2: MySQL client
- cors: Cross-origin resource sharing
- dotenv: Environment configuration

## Development

The server uses connection pooling for better performance and includes error handling for database operations. Each API endpoint is designed to be asynchronous and handle errors appropriately.
