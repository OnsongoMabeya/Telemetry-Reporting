# BSI Telemetry Reports - Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Node.js/Express backend server for the BSI Telemetry Reports application. This service handles all data processing, database operations, and provides a RESTful API for the frontend application.

## 🌟 Features

### Core Functionality

- **RESTful API** - Comprehensive endpoints for all frontend data needs
- **Real-time Data Processing** - Efficient handling of telemetry data streams
- **Data Aggregation** - Smart data sampling and aggregation for optimal performance

### Performance & Reliability

- **Connection Pooling** - Efficient MySQL connection management
- **In-memory Caching** - Node-cache implementation for frequently accessed data
- **Rate Limiting** - Protection against abuse (100 requests/minute per IP)
- **Request Validation** - Comprehensive input validation for all endpoints

### Developer Experience

- **Detailed Logging** - Configurable log levels and formats
- **Environment-based Config** - Easy configuration for different environments
- **API Documentation** - Comprehensive endpoint documentation
- **Error Handling** - Structured error responses and logging

### Data Management

- **Time-based Sampling** - Intelligent data sampling based on time range (5m to 30d)
- **Pagination** - Efficient handling of large datasets
- **Data Export** - Support for data export in multiple formats

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- MySQL 8.0 or later
- npm 9.x or later

### Installation

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
    "details": {}
  }
}
```

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
| `NodeName` | varchar(255) | Name of the node |
| `NodeBaseStationName` | varchar(255) | Name of the base station |
| `time` | datetime | Timestamp of the reading |
| `Analog1Value` | float | Forward Power (W) |
| `Analog2Value` | float | Reflected Power (W) |
| `Analog3Value` | float | VSWR (Voltage Standing Wave Ratio) |
| `Analog4Value` | float | Return Loss (dB) |
| `Analog5Value` | float | Temperature (°C) |
| `Analog6Value` | float | Voltage (V) |
| `Analog7Value` | float | Current (A) |
| `Analog8Value` | float | Power (W) |

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

## 🧪 Testing

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

## 🤝 Contributing

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
