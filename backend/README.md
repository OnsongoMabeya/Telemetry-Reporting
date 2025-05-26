# BSI Telemetry Reports - Backend

Node.js/Express backend server for the BSI Telemetry Reports application. Handles database operations and provides REST API endpoints for the frontend.

## Features

- RESTful API endpoints with rate limiting
- Smart data sampling based on time range
- Optimized MySQL queries with connection pooling
- Efficient data aggregation for different time ranges
- Robust error handling and logging
- Environment-based configuration
- Cross-origin resource sharing (CORS) support

## API Endpoints

### Get All Nodes

```http
   GET /api/nodes
   Response: Array of node names
```

### Get Base Stations for a Node

```http
   GET /api/basestations/:nodeName
   Response: Array of base station names for the specified node
```

### Get Telemetry Data

```http
   GET /api/telemetry/:nodeName/:baseStation
   Query parameters:
   - timeFilter: Time range (5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w)
   - startTime: Optional custom start time
   - endTime: Optional custom end time

   Response: Array of telemetry data including:
   - Forward Power
   - Reflected Power
   - VSWR
   - Return Loss
   - Temperature
   - Voltage
   - Current
   - Power

   Data sampling intervals:
   - 5m-10m: 10-second samples
   - 30m: 30-second samples
   - 1h: 1-minute samples
   - 2h: 2-minute samples
   - 6h: 5-minute samples
   - 1d: 15-minute samples
   - 2d: 30-minute samples
   - 5d: 1-hour samples
   - 1w: 2-hour samples
```

## Database Schema

The application uses the `node_status_table` with the following key columns:

- NodeName
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
