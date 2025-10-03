# BSI Telemetry Reports - Backend

Node.js/Express backend server for the BSI Telemetry Reports application. Handles database operations, data processing, and provides REST API endpoints for the frontend.

## 🚀 Features

- **RESTful API** with comprehensive endpoint documentation
- **Smart Data Sampling** based on time range for optimal performance (5m to 30d)
- **MySQL Integration** with connection pooling and query optimization
- **In-memory Caching** with node-cache for improved response times
- **Robust Error Handling** with detailed logging and error boundaries
- **Environment-based Configuration** for different deployment scenarios
- **CORS Support** with configurable origins
- **Request Validation** for all API endpoints
- **Rate Limiting** to prevent abuse (100 requests per minute per IP)
- **Request Logging** with configurable log levels
- **Pagination Support** for large datasets
- **Time-based Data Aggregation** for efficient data retrieval

## 🛠️ Setup & Installation

1. **Clone the repository** (if not already done)

   ```bash
   git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
   cd BSI-telemetry-reporting/backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

4. **Update environment variables** in `.env`:

   ```env
   # Database Configuration
   DB_HOST=localhost          # Database host (local or remote IP)
   DB_USER=dbuser            # Database username
   DB_PASSWORD=securepass     # Database password
   DB_NAME=horiserverlive    # Database name
   DB_PORT=3306              # MySQL port
   
   # Server Configuration
   PORT=5000                 # Backend API port
   NODE_ENV=development      # Environment (development/production)
   CACHE_TTL=300             # Cache time-to-live in seconds
   
   # Logging
   LOG_LEVEL=info            # Log level (error, warn, info, debug)
   
   # Security
   RATE_LIMIT_WINDOW=15      # Rate limit window in minutes
   RATE_LIMIT_MAX=100        # Max requests per window per IP
   ```

5. **Start the server**

   ```bash
   # Development mode with hot-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL

All API endpoints are prefixed with `/api`

### Authentication

Currently, the API is open. For production, implement authentication middleware.

### Rate Limiting

- 100 requests per minute per IP address
- Returns HTTP 429 (Too Many Requests) when limit is exceeded
- Includes `Retry-After` header indicating when to retry

### Endpoints

#### Get All Nodes

```http
GET /api/nodes
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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

- NodeBaseStationName
- time
- Analog1Value through Analog8Value (representing different metrics)

## Setup

1. Install dependencies:

   ```bash
      npm install
   ```

2. Configure environment variables:
   Create a `.env` file with:

   ```env
      DB_HOST=localhost
      DB_USER=your_username
      DB_PASSWORD=your_password
      DB_NAME=horiserverlive
      DB_PORT=3306
      PORT=5000
   ```

3. Start the server:

   ```bash
      npm start
   ```

## Dependencies

- express: Web framework
- mysql2: MySQL client
- cors: Cross-origin resource sharing
- dotenv: Environment configuration

## Development

The server uses connection pooling for better performance and includes error handling for database operations. Each API endpoint is designed to be asynchronous and handle errors appropriately.
