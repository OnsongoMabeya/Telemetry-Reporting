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
  "nodeName": "MediaMax1",
  "baseStationName": "Nairobi",
  "metricName": "Forward Power",
  "columnName": "Analog1Value",
  "unit": "dBm",
  "displayOrder": 1
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
  "metricName": "Forward Power (Updated)",
  "unit": "W",
  "displayOrder": 2
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
      "metric_name": "Forward Power",
      "column_name": "Analog1Value",
      "unit": "dBm",
      "display_order": 1
    },
    {
      "metric_name": "VSWR",
      "column_name": "Analog3Value",
      "unit": "",
      "display_order": 2
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

## Versioning

Current API version: v1

Version is included in the base URL for future compatibility.

---

## Support

For API support, contact: <support@bsi.com>
