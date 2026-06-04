# API Documentation

Complete API reference is available in the **[Detailed Guide](../DETAILED_GUIDE.md#api-reference)**.

## Quick Reference

### Base URL

```text
http://localhost:5000/api
```

### Authentication

```http
Authorization: Bearer <jwt_token>
```

### Key Endpoints

| Endpoint                 | Method   | Description            |
|--------------------------|----------|------------------------|
| `/auth/login`            | POST     | User login             |
| `/auth/verify`           | GET      | Verify token           |
| `/metric-mappings`       | GET/POST | Metric configuration   |
| `/my-sites/clients`      | GET      | Assigned clients       |
| `/site-alerts/run-check` | POST     | Trigger alert check    |

### Example Request

```bash
curl -X GET http://localhost:5000/api/metric-mappings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

For full endpoint documentation, request/response schemas, and examples, see the **[Detailed Guide](../DETAILED_GUIDE.md#api-reference)**.
