# BSI Telemetry Reporting - API Documentation

## Base URL

```text
http://localhost:5000/api
```

## Authentication

All endpoints require JWT authentication via Bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

## Metric Mappings API

### Get Available Database Columns

Retrieve all 48 available database columns that can be mapped to custom metrics.

**Endpoint:** `GET /metric-mappings/columns`

**Access:** Admin, Manager

**Response:**

```json
{
  "columns": [
    {
      "name": "Analog1Value",
      "category": "Analog",
      "description": "Analog input channel 1"
    },
    ...
  ]
}
```

---

### List All Metric Mappings

Get all metric mappings with optional filtering.

**Endpoint:** `GET /metric-mappings`

**Access:** Admin, Manager

**Query Parameters:**

- `nodeName` (optional): Filter by node name
- `baseStation` (optional): Filter by base station name
- `isActive` (optional): Filter by active status (true/false)

**Response:**

```json
{
  "mappings": [
    {
      "id": 1,
      "node_name": "MediaMax1",
      "base_station_name": "Nairobi",
      "metric_name": "Forward Power",
      "column_name": "Analog1Value",
      "unit": "dBm",
      "display_order": 1,
      "color": "#114521",
      "is_active": true,
      "created_by": 1,
      "created_at": "2026-02-13T09:00:00.000Z",
      "updated_at": "2026-02-13T09:00:00.000Z"
    }
  ]
}
```

---

### Get Nodes with Mapping Status

Retrieve all nodes and their metric mapping configuration status.

**Endpoint:** `GET /metric-mappings/nodes`

**Access:** Admin, Manager

**Response:**

```json
{
  "nodes": [
    {
      "node_name": "MediaMax1",
      "base_station_name": "Nairobi",
      "has_mappings": true,
      "mapping_count": 4
    },
    {
      "node_name": "Aviation FM",
      "base_station_name": "ELDORET",
      "has_mappings": false,
      "mapping_count": 0
    }
  ]
}
```

---

### Get Unmapped Nodes

Get list of nodes that don't have metric mappings configured.

**Endpoint:** `GET /metric-mappings/unmapped`

**Access:** Admin, Manager

**Response:**

```json
{
  "unmappedNodes": [
    {
      "node_name": "Aviation FM",
      "base_station_name": "ELDORET"
    },
    {
      "node_name": "Kameme FM",
      "base_station_name": "LIMURU"
    }
  ],
  "count": 2
}
```

---

### Create Metric Mapping

Create a new metric mapping for a node/base station.

**Endpoint:** `POST /metric-mappings`

**Access:** Admin only

**Request Body:**

```json
{
  "node_name": "MediaMax1",
  "base_station_name": "Nairobi",
  "metric_name": "Forward Power",
  "column_name": "Analog1Value",
  "unit": "dBm",
  "display_order": 1,
  "color": "#114521"
}
```

**Response:**

```json
{
  "message": "Metric mapping created successfully",
  "mappingId": 1
}
```

**Error Responses:**

- `400`: Invalid input or duplicate mapping
- `403`: Insufficient permissions
- `500`: Server error

---

### Update Metric Mapping

Update an existing metric mapping.

**Endpoint:** `PUT /metric-mappings/:id`

**Access:** Admin only

**Request Body:**

```json
{
  "metric_name": "Forward Power (Updated)",
  "unit": "W",
  "display_order": 2,
  "color": "#114521"
}
```

**Response:**

```json
{
  "message": "Metric mapping updated successfully"
}
```

---

### Delete Metric Mapping

Soft delete a metric mapping (sets is_active to false).

**Endpoint:** `DELETE /metric-mappings/:id`

**Access:** Admin only

**Response:**

```json
{
  "message": "Metric mapping deleted successfully"
}
```

---

### Get Audit Trail

Retrieve complete audit history for a specific metric mapping.

**Endpoint:** `GET /metric-mappings/audit/:id`

**Access:** Admin only

**Response:**

```json
{
  "audit": [
    {
      "id": 1,
      "mapping_id": 1,
      "action": "CREATE",
      "old_value": null,
      "new_value": "{\"metric_name\":\"Forward Power\",\"column_name\":\"Analog1Value\"}",
      "changed_by": 1,
      "changed_at": "2026-02-13T09:00:00.000Z",
      "ip_address": "127.0.0.1"
    }
  ]
}
```

---

## Telemetry Mappings API

### Get Mappings for Telemetry Display

Retrieve metric mappings for a specific node/base station combination. Used by the dashboard to determine which graphs to display.

**Endpoint:** `GET /telemetry-mappings/:nodeName/:baseStation`

**Access:** All authenticated users

**Response (with mappings):**

```json
{
  "hasMappings": true,
  "mappings": [
    {
      "id": 1,
      "metric_name": "Forward Power",
      "column_name": "Analog1Value",
      "unit": "dBm",
      "display_order": 1,
      "color": "#114521"
    },
    {
      "id": 2,
      "metric_name": "VSWR",
      "column_name": "Analog3Value",
      "unit": "",
      "display_order": 2,
      "color": null
    }
  ],
  "message": "Custom metric mappings loaded successfully."
}
```

**Response (without mappings):**

```json
{
  "hasMappings": false,
  "mappings": [],
  "message": "No metric mappings configured for this node/base station. Please configure in Visualization Settings."
}
```

---

## User Management API

### Create User

**Endpoint:** `POST /users/signup`

**Access:** Admin only

**Request Body:**

```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "viewer"
}
```

---

### List Users

**Endpoint:** `GET /users`

**Access:** Admin, Manager

**Response:**

```json
{
  "users": [
    {
      "id": 1,
      "username": "BSI",
      "email": "admin@bsi.com",
      "role": "admin",
      "first_name": "BSI",
      "last_name": "Administrator",
      "is_active": true,
      "last_login": "2026-02-13T09:00:00.000Z"
    }
  ]
}
```

---

## Node Assignment API

### Get User Node Assignments

**Endpoint:** `GET /node-assignments/user/:userId`

**Access:** Admin, Manager, or the user themselves

**Response:**

```json
{
  "assignments": [
    {
      "id": 1,
      "node_name": "MediaMax1",
      "assigned_at": "2026-02-13T09:00:00.000Z"
    }
  ],
  "accessAllNodes": false
}
```

---

### Assign Nodes to User

**Endpoint:** `POST /node-assignments`

**Access:** Admin only

**Request Body:**

```json
{
  "userId": 2,
  "nodeNames": ["MediaMax1", "Aviation FM"]
}
```

---

## My Sites API

The My Sites feature provides a hierarchical service management system with user-client assignments.

### Architecture

- Users are assigned to **clients** (not individual services)
- Each client can have multiple **services**
- Each service can have multiple **metric assignments**
- Users access all services belonging to their assigned clients

### Client Management

#### List All Clients

**Endpoint:** `GET /clients`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Radio Africa Group",
      "description": "Media company",
      "is_active": true,
      "created_at": "2026-03-25T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Create Client

**Endpoint:** `POST /clients`

**Access:** Admin, Manager

**Request Body:**

```json
{
  "name": "Radio Africa Group",
  "description": "Media company"
}
```

#### Get Client Services

**Endpoint:** `GET /clients/:id/services`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Kameme FM",
      "description": "Radio service"
    }
  ]
}
```

#### Assign Service to Client

**Endpoint:** `POST /clients/:id/services`

**Access:** Admin, Manager

**Request Body:**

```json
{
  "serviceId": 1
}
```

---

### Service Management

#### List All Services

**Endpoint:** `GET /services`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Kameme FM",
      "description": "Radio service",
      "metric_count": 3,
      "client_count": 1
    }
  ]
}
```

#### Get Service Metrics

**Endpoint:** `GET /services/:id/metrics`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "metric_name": "Forward Power",
      "node_name": "Aviation FM",
      "base_station_name": "ELDORET",
      "unit": "W"
    }
  ]
}
```

#### Assign Metric to Service

**Endpoint:** `POST /services/:id/metrics`

**Access:** Admin, Manager

**Request Body:**

```json
{
  "metricMappingId": 1
}
```

---

### User-Client Assignments

#### List User-Client Assignments

**Endpoint:** `GET /user-client-assignments`

**Access:** Admin, Manager

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "client_id": 1,
      "username": "john.doe",
      "client_name": "Radio Africa Group",
      "assigned_at": "2026-03-25T10:00:00.000Z"
    }
  ]
}
```

#### Assign Client to User

**Endpoint:** `POST /user-client-assignments`

**Access:** Admin, Manager

**Request Body:**

```json
{
  "userId": 2,
  "clientId": 1
}
```

#### Remove Client from User

**Endpoint:** `DELETE /user-client-assignments/:userId/:clientId`

**Access:** Admin, Manager

---

### My Sites User Access

#### Get User's Assigned Clients

**Endpoint:** `GET /my-sites/clients`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Radio Africa Group",
      "description": "Media company"
    }
  ]
}
```

#### Get Client Services (User Access)

**Endpoint:** `GET /my-sites/clients/:clientId/services`

**Access:** User must be assigned to the client

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Kameme FM",
      "description": "Radio service"
    }
  ]
}
```

#### Get Service Details with Metrics

**Endpoint:** `GET /my-sites/clients/:clientId/services/:serviceId`

**Access:** User must be assigned to the client

**Response:**

```json
{
  "success": true,
  "data": {
    "service": {
      "id": 1,
      "name": "Kameme FM"
    },
    "metrics": [
      {
        "id": 1,
        "metric_name": "Forward Power",
        "node_name": "Aviation FM",
        "base_station_name": "ELDORET"
      }
    ]
  }
}
```

#### Get Telemetry Data for Metric

**Endpoint:** `GET /my-sites/clients/:clientId/services/:serviceId/metrics/:metricId/telemetry`

**Access:** User must be assigned to the client

**Query Parameters:**

- `timeFilter` (optional): Time range (5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w, 2w, 30d)

**Features:**

- Smart date range logic (fetches latest available data, not NOW())
- Time bucketing for performance optimization
- Adaptive sampling based on time filter
- Timezone handling (EAT +03:00)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "sample_time": "2025-03-03 23:07:00",
      "Aviation FM Forward Power": "1033.00"
    },
    {
      "sample_time": "2025-03-03 23:08:00",
      "Aviation FM Forward Power": "1045.00"
    }
  ],
  "count": 60
}
```

---

## Error Codes

| Code | Description                              |
|------|------------------------------------------|
| 200  | Success                                  |
| 201  | Created                                  |
| 400  | Bad Request - Invalid input              |
| 401  | Unauthorized - Missing or invalid token  |
| 403  | Forbidden - Insufficient permissions     |
| 404  | Not Found - Resource doesn't exist       |
| 409  | Conflict - Duplicate resource            |
| 500  | Internal Server Error                    |

---

## Rate Limiting

- Login endpoint: 5 attempts per 15 minutes per IP
- General API: 100 requests per minute per IP

---

## Pagination

List endpoints support pagination via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

Example:

```http
GET /api/metric-mappings?page=2&limit=25
```

---

## Filtering & Sorting

Most list endpoints support:

- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc`
- Field-specific filters (see individual endpoint docs)

Example:

```http
GET /api/metric-mappings?nodeName=MediaMax1&sortBy=display_order&sortOrder=asc
```

---

## Keep-Alive API

### Session Keep-Alive (with Token Refresh)

Endpoint for preventing session timeout during slideshow mode. Issues a fresh JWT with a new expiry (sliding token refresh), ensuring the session remains active as long as the slideshow is running.

**Endpoint:** `GET /api/keep-alive`

**Access:** All authenticated users

**Response:**

```json
{
  "success": true,
  "timestamp": 1712991234567,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Fields:**

- `success` — Always `true` for valid tokens
- `timestamp` — Current server timestamp (milliseconds)
- `token` — Fresh JWT with renewed expiry (same user payload, new `expiresIn`). The frontend should store this token and use it for subsequent requests.

**Usage:** Called every 25 minutes during My Sites slideshow. The frontend stores the returned token in `localStorage` and updates the axios `Authorization` header, preventing the 30-minute session timeout as long as the slideshow is active.

---

## My Sites API - continuation

### Get Assigned Clients

Retrieve clients assigned to the authenticated user.

**Endpoint:** `GET /my-sites/clients`

**Access:** All authenticated users

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Radio Africa Group"
    }
  ]
}
```

---

### Get Services for Client

Retrieve services belonging to a specific client.

**Endpoint:** `GET /my-sites/clients/:clientId/services`

**Access:** All authenticated users (must be assigned to the client)

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Kameme FM"
    }
  ]
}
```

---

### Get Service Details

Retrieve service details including assigned metrics.

**Endpoint:** `GET /my-sites/clients/:clientId/services/:serviceId`

**Access:** All authenticated users (must be assigned to the client)

**Response:**

```json
{
  "data": {
    "id": 1,
    "name": "Kameme FM",
    "description": "Kameme FM Service",
    "metrics": [
      {
        "id": 1,
        "metric_name": "Aviation FM Forward Power",
        "display_name": "Forward Power",
        "node_name": "Aviation FM",
        "base_station_name": "ELDORET",
        "unit": "W",
        "color": "#114521"
      }
    ]
  }
}
```

---

### Get Metric Telemetry

Retrieve telemetry data for a specific metric within a service.

**Endpoint:** `GET /my-sites/clients/:clientId/services/:serviceId/metrics/:metricId/telemetry?timeFilter=1h`

**Access:** All authenticated users (must be assigned to the client)

**Parameters:**

- `timeFilter` (required): Time range filter (5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w, 2w, 30d)

**Response:**

```json
{
  "data": [
    {
      "sample_time": "2025-03-03 23:07:00",
      "Aviation FM Forward Power": "1033.00"
    }
  ]
}
```

---

## My Sites Map API

### Get Base Stations for Client Map

Retrieve base stations with GPS coordinates for a specific client (optionally filtered by service).

**Endpoint:** `GET /my-sites/clients/:clientId/map-stations`

**Access:** Authenticated users with client assignment

**Path Parameters:**

- `clientId` (required): Client ID to fetch stations for

**Query Parameters:**

- `serviceId` (optional): Filter to stations belonging to specific service only
  - When omitted: Returns all stations across all client services (client-level view)
  - When provided: Returns only stations for that service (service-level view)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "NAIROBI",
      "name": "NAIROBI",
      "lat": -1.286389,
      "lng": 36.817223,
      "status": "online",
      "statusTier": "good",
      "statusValue": 4,
      "statusColor": "#1FC700",
      "lastStatusUpdate": "2026-05-04T09:23:00.000Z",
      "hasLiveData": true
    },
    {
      "id": "MOMBASA",
      "name": "MOMBASA",
      "lat": -4.043477,
      "lng": 39.668205,
      "status": "offline",
      "statusTier": "warning",
      "statusValue": 15,
      "statusColor": "#CF8700",
      "lastStatusUpdate": "2026-05-04T06:15:00.000Z",
      "hasLiveData": true
    }
  ],
  "count": 2,
  "viewType": "client"
}
```

**Response Fields:**

| Field              | Type    | Description                                          |
|--------------------|---------|------------------------------------------------------|
| `id`               | string  | Station identifier (uppercase)                       |
| `name`             | string  | Base station name                                    |
| `lat`              | number  | Latitude coordinate                                  |
| `lng`              | number  | Longitude coordinate                                 |
| `status`           | string  | online / offline                                     |
| `statusTier`       | string  | good/warning/critical based on status value          |
| `statusValue`      | number  | BaseStationStatus counter value                      |
| `statusColor`      | string  | Hex color for marker (#1FC700/#CF8700/#D92A00)       |
| `lastStatusUpdate` | string  | ISO timestamp of latest node_status_table entry      |
| `hasLiveData`      | boolean | True if coordinates from mapviewtable                |
| `viewType`         | string  | "client" or "service" based on query                 |

**Data Sources:**

1. **Base Station Discovery**: Queries `metric_mappings` joined with `service_metric_assignments` to find all unique `base_station_name`s for the client/service
2. **Coordinates**: Latest entry from `mapviewtable` per station (or fallback coordinates)
3. **Status Counter**: `BaseStationStatus` from `mapviewtable`
4. **Online Detection**: `MAX(time)` from `node_status_table` within last 3 hours

**Error Responses:**

- `403`: Access denied (user not assigned to client)
- `404`: Client not found or no stations available
- `500`: Database error

---

## Base Station Map API

### Get Base Stations for Map

Retrieve all base stations with GPS coordinates and status for map visualization.

**Endpoint:** `GET /basestations-map`

**Access:** All authenticated users

**Query Parameters:**

- `nodeName` (optional): Filter to stations belonging to specific node
  - Example: `?nodeName=Aviation%20FM`

**Response:**

```json
[
  {
    "id": "KITUI",
    "name": "KITUI",
    "lat": -1.27639,
    "lng": 38.0325,
    "status": "online",
    "statusTier": "good",
    "statusValue": 4,
    "statusColor": "#1FC700",
    "lastStatusUpdate": "2026-05-04T09:23:00.000Z"
  },
  {
    "id": "KAKAMEGA",
    "name": "KAKAMEGA",
    "lat": 0.28273,
    "lng": 34.751,
    "status": "online",
    "statusTier": "warning",
    "statusValue": 15,
    "statusColor": "#CF8700",
    "lastStatusUpdate": "2026-05-04T09:20:00.000Z"
  }
]
```

**Response Fields:**

| Field              | Type   | Description                         |
|--------------------|--------|-------------------------------------|
| `id`               | string | Station identifier (same as name)   |
| `name`             | string | Base station name                   |
| `lat`              | number | Latitude coordinate                 |
| `lng`              | number | Longitude coordinate                |
| `status`           | string | Online/offline status               |
| `statusTier`       | string | good / warning / critical           |
| `statusValue`      | number | BaseStationStatus counter (1-50)    |
| `statusColor`      | string | Hex color code for marker           |
| `lastStatusUpdate` | string | ISO timestamp of last status        |

**Status Color Mapping:**

| Status Value Range | Color             | Tier     |
|--------------------|-------------------|----------|
| 1-10               | #1FC700 (Green)   | good     |
| 11-30              | #CF8700 (Orange)  | warning  |
| 31-50              | #D92A00 (Red)     | critical |

**Online/Offline Logic:**

- **Online**: Station has reported to `node_status_table` within last 3 hours
- **Offline**: No report in last 3 hours

**Data Sources:**

1. **Coordinates**: Latest entry from `mapviewtable` per station
2. **Status Counter**: `BaseStationStatus` from same `mapviewtable` entry
3. **Online Detection**: `MAX(time)` from `node_status_table` per station

**Error Responses:**

- `401`: Unauthorized (missing/invalid token)
- `500`: Server error (database query failed)

---

## Versioning

Current API version: v1

Version is included in the base URL for future compatibility.

---

## Support

For API support, contact: <support@bsi.com>
