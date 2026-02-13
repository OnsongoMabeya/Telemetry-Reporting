# Metric Mapping System Guide

## Overview

The Dynamic Metric Mapping System allows administrators to configure custom visualization metrics for each node/base station combination without code changes. This Grafana-style configuration system provides flexibility in mapping database columns to meaningful metric names with custom units and display order.

## Quick Start

### 1. Access Visualization Settings

1. Login as an admin user (BSI/Reporting2026)
2. Click your user avatar in the navbar
3. Select **"Visualization Settings"**

### 2. View Dashboard Statistics

The main dashboard shows:

- **Total Metric Mappings**: Number of configured metrics across all nodes
- **Configured Nodes**: Nodes with at least one metric mapping
- **Unmapped Nodes**: Nodes requiring configuration (shown in alert list)
- **Coverage Percentage**: Percentage of nodes with mappings

### 3. Configure Metrics for a Node

1. Click **"Add Metric Mapping"** button
2. Fill in the configuration form:
   - **Node Name**: Select from dropdown (e.g., MediaMax1)
   - **Base Station**: Select from dropdown (e.g., NYERI)
   - **Database Column**: Choose from 48 available columns
   - **Metric Name**: Enter custom display name (e.g., "Forward Power")
   - **Unit**: Optional unit (e.g., dBm, W, dB, V, A, °C, %)
   - **Display Order**: Number to control graph ordering (1, 2, 3...)
3. Click **"Save"**

### 4. Verify Configuration

1. Navigate to the main dashboard
2. Select the configured node and base station
3. You should see:
   - Kenya Map (always visible)
   - Only the graphs you configured (in display order)

## Available Database Columns

The system provides 48 database columns for mapping:

### Analog Channels (16 columns)

- `Analog1Value` through `Analog16Value`
- Typically used for: Power measurements, VSWR, Return Loss, Temperature, Voltage, Current

### Digital Channels (16 columns)

- `Digital1Value` through `Digital16Value`
- Typically used for: Status flags, binary indicators, alarm states

### Output Channels (16 columns)

- `Output1Value` through `Output16Value`
- Typically used for: Control outputs, calculated values, derived metrics

## Common Metric Configurations

### RF Transmitter Monitoring

| Metric Name     | Column       | Unit | Display Order |
| --------------- | ------------ | ---- | ------------- |
| Forward Power   | Analog1Value | dBm  | 1             |
| Reflected Power | Analog2Value | dBm  | 2             |
| VSWR            | Analog3Value |      | 3             |
| Return Loss     | Analog4Value | dB   | 4             |

### Environmental Monitoring

| Metric Name | Column       | Unit | Display Order |
| ----------- | ------------ | ---- | ------------- |
| Temperature | Analog5Value | °C   | 1             |
| Humidity    | Analog6Value | %    | 2             |
| Voltage     | Analog7Value | V    | 3             |
| Current     | Analog8Value | A    | 4             |

### Custom Configuration

You can map any column to any metric name based on your specific hardware configuration and requirements.

## Features

### Per-Node Configuration

- Each node/base station combination has independent metric mappings
- Different nodes can use the same column for different purposes
- Example: Analog1Value could be "Forward Power" for one node and "Temperature" for another

### Display Order Control

- Graphs appear in ascending order based on `display_order` value
- Lower numbers appear first (left to right, top to bottom)
- Allows logical grouping of related metrics

### Custom Units

- Support for standard units: dBm, W, dB, V, A, °C, %, Hz, kHz, MHz
- Custom units can be entered as needed
- Units appear on graph axes and tooltips

### Enforcement Mode

- **Unmapped nodes show no telemetry graphs**
- Admin users see configuration prompts with direct links
- Manager/Viewer users see informative messages
- Ensures deliberate, documented metric assignments

### Complete Audit Trail

- All mapping changes are logged
- Tracks: CREATE, UPDATE, DELETE actions
- Stores: User ID, timestamp, IP address, old/new values
- View audit history via API: `GET /api/metric-mappings/audit/:id`

## Verification Tools

### Verify Node Coverage

Run the verification script to check mapping status:

```bash
cd backend
node verify-nodes.js
```

**Output Example:**

```text
=== Node/Base Station Metric Mapping Status ===

Total unique node/base station combinations: 13

Checking mapping status for each node...

✓ MediaMax1 / NYERI - HAS MAPPINGS (4 metrics configured)
✗ Aviation FM / ELDORET - NO MAPPINGS
✗ Kameme FM / LIMURU - NO MAPPINGS
✓ Classic FM / Nairobi - HAS MAPPINGS (2 metrics configured)

Summary:
- Nodes with mappings: 2 (15.38%)
- Nodes without mappings: 11 (84.62%)
```

### Check Specific Node

Query the API to see mappings for a specific node:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/telemetry-mappings/MediaMax1/NYERI
```

## Manager/Viewer Access

### Manager Role

- **Can view** all metric mappings
- **Can see** unmapped nodes list
- **Cannot create/edit/delete** mappings
- **Read-only access** to Visualization Settings

### Viewer Role

- **No access** to Visualization Settings
- **Sees informative message** when viewing unmapped nodes
- **Can view** configured graphs for mapped nodes

## API Reference

### Get All Available Columns

```http
GET /api/metric-mappings/columns
Authorization: Bearer <token>
```

Returns all 48 database columns with categories.

### List All Metric Mappings

```http
GET /api/metric-mappings?nodeName=MediaMax1&baseStation=NYERI
Authorization: Bearer <token>
```

Optional filters: `nodeName`, `baseStation`, `isActive`

### Get Nodes with Mapping Status

```http
GET /api/metric-mappings/nodes
Authorization: Bearer <token>
```

Returns all nodes with their mapping status and count.

### Get Unmapped Nodes

```http
GET /api/metric-mappings/unmapped
Authorization: Bearer <token>
```

Returns list of nodes requiring configuration.

### Create Metric Mapping (Admin Only)

```http
POST /api/metric-mappings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "nodeName": "MediaMax1",
  "baseStationName": "NYERI",
  "metricName": "Forward Power",
  "columnName": "Analog1Value",
  "unit": "dBm",
  "displayOrder": 1
}
```

### Update Metric Mapping (Admin Only)

```http
PUT /api/metric-mappings/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "metricName": "Forward Power (Updated)",
  "unit": "W",
  "displayOrder": 2
}
```

### Delete Metric Mapping (Admin Only)

```http
DELETE /api/metric-mappings/:id
Authorization: Bearer <admin_token>
```

Soft delete - sets `is_active = false`.

### Get Audit Trail (Admin Only)

```http
GET /api/metric-mappings/audit/:id
Authorization: Bearer <admin_token>
```

Returns complete history of changes for a specific mapping.

## Database Schema

### metric_mappings Table

```sql
CREATE TABLE metric_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(50) NOT NULL,
  unit VARCHAR(20),
  display_order INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_node_column (node_name, base_station_name, column_name, is_active),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### metric_mapping_audit Table

```sql
CREATE TABLE metric_mapping_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mapping_id INT,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (mapping_id) REFERENCES metric_mappings(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

## Best Practices

### 1. Consistent Naming

- Use descriptive metric names: "Forward Power" not "FP"
- Be consistent across similar nodes
- Include context when needed: "Transmitter Temperature" vs "Temperature"

### 2. Logical Display Order

- Group related metrics together
- Power metrics first (1-4)
- Environmental metrics next (5-8)
- Status/diagnostic metrics last (9+)

### 3. Appropriate Units

- Use standard engineering units
- Be consistent: all power in dBm or all in W, not mixed
- Include units even if obvious (helps new users)

### 4. Documentation

- Use the notes field when assigning nodes
- Document special configurations in your team wiki
- Keep a mapping reference sheet for your organization

### 5. Regular Audits

- Run `verify-nodes.js` monthly
- Review unmapped nodes
- Update mappings as hardware changes

## Troubleshooting

### Graphs Not Appearing After Configuration

**Symptoms:**

- Configured metrics but dashboard shows no graphs
- Only map is visible

**Solutions:**

1. **Refresh the page** - Browser cache may be stale
2. **Check mapping status** - Run `verify-nodes.js`
3. **Verify API response**:

   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/telemetry-mappings/NODE/BASESTATION
   ```

4. **Check browser console** for errors
5. **Verify telemetry data exists** for that node/base station

### Wrong Graphs Showing

**Symptoms:**

- Seeing graphs you didn't configure
- Old hardcoded graphs still appearing

**Solutions:**

1. **Clear browser cache** completely
2. **Check for multiple mappings** - May have duplicates
3. **Verify column mapping** - Ensure correct column selected
4. **Check display order** - Graphs may be out of expected order

### Cannot Create Mapping

**Error:** "Duplicate mapping exists"

**Solution:**

- Each column can only be mapped once per node/base station
- Delete or update the existing mapping
- Or choose a different column

**Error:** "Unauthorized"

**Solution:**

- Only admins can create mappings
- Verify you're logged in as admin
- Check token hasn't expired

### Audit Trail Not Showing

**Symptoms:**

- Empty audit history for a mapping

**Causes:**

- Mapping was created before audit system was implemented
- Database migration not run
- Audit triggers not functioning

**Solutions:**

1. Run migration 003 if not already done
2. Check `metric_mapping_audit` table exists
3. Verify triggers are active in database

## Migration Guide

### From Hardcoded Graphs to Dynamic Mappings

If you're upgrading from a version with hardcoded graphs:

1. **Identify current graph mappings** in your code
2. **Run the migration**:

   ```bash
   mysql -u user -p database < backend/database/migrations/003_create_metric_mappings.sql
   ```

3. **Configure mappings** for each node via UI
4. **Test thoroughly** before removing old code
5. **Update documentation** for your team

### Sample Migration Data

The migration includes sample mappings for MediaMax1/Nairobi:

- Forward Power (Analog1Value, dBm, order 1)
- Reflected Power (Analog2Value, dBm, order 2)
- VSWR (Analog3Value, order 3)
- Return Loss (Analog4Value, dB, order 4)

Use these as templates for other nodes.

## Support

For issues or questions:

- Check this guide first
- Review [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)
- Run diagnostic scripts (`verify-nodes.js`)
- Contact: <support@bsi.com>

## Related Documentation

- [README.md](README.md) - Main project overview
- [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - Complete API reference
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration
- [USER_MANAGEMENT_GUIDE.md](USER_MANAGEMENT_GUIDE.md) - User roles and permissions
