# BSI Telemetry Reports - Backend

Node.js/Express backend server for the BSI Telemetry Reports application. Handles database operations and provides REST API endpoints for the frontend.

## Features

- RESTful API endpoints
- MySQL database integration
- Connection pooling for better performance
- Environment-based configuration
- Error handling and logging

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
   Response: Array of telemetry data including:
   - Forward Power
   - Reflected Power
   - VSWR
   - Return Loss
   - Temperature
   - Voltage
   - Current
   - Power
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
