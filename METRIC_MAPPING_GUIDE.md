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
   - **Base Station**: Select from dropdown (e.g., MERU)
   - **Database Column**: Choose from 48 available columns with data indicators
     - Columns with data show: **"Has Data"** badge with percentage and record count
     - Columns without data show: **"No Data"** badge and are disabled
     - The system automatically analyzes which columns have non-null/non-zero values
   - **Metric Name**: Enter custom display name (e.g., "MILELE FM Forward Power")
   - **Unit**: Optional unit (e.g., dBm, W, dB, V, A, °C, %)
   - **Display Order**: Number to control graph ordering (1, 2, 3...)
   - **Graph Color (Optional)**: Hex color for the graph line (e.g. `#114521`)
3. Click **"Save"**

**Note**: The column dropdown automatically loads data indicators when you select a node/base station, showing you which columns actually contain data for that specific location.

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

### Admin-Configured Graph Colors

- Graph colors are configured **only by Admin users** inside **Visualization Settings**.
- Colors are stored in the database on `metric_mappings.color` and apply to **all users**.
- Dashboard defaults:
  - If `color` is **not set**: black line with no fill under the line.
  - If `color` **is set**: solid line in that color with a lighter shaded fill under the line.

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
GET /api/metric-mappings/columns?nodeName=MediaMax1&baseStation=MERU
Authorization: Bearer <token>
```

Returns all 48 database columns with categories and data indicators.

**Query Parameters:**

- `nodeName` (optional): Filter analysis to specific node
- `baseStation` (optional): Filter analysis to specific base station

**Response includes:**

- Column name and category (analog/digital/output)
- `hasData`: Boolean indicating if column has non-null/non-zero values
- `recordCount`: Number of records with data
- `percentage`: Percentage of total records with data
- `minValue`, `maxValue`, `avgValue`: Statistical summary of values

**Example Response:**

```json
{
  "analog": [
    {
      "name": "Analog1Value",
      "hasData": true,
      "recordCount": 31323,
      "percentage": 100.0,
      "minValue": 161,
      "maxValue": 1119,
      "avgValue": 875.90
    }
  ],
  "totalRows": 31323,
  "summary": {
    "analogWithData": 5,
    "digitalWithData": 0,
    "outputWithData": 0
  }
}
```

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
- Generic metric names (e.g., "forward power", "vswr") instead of your custom names
- Dashboard shows metrics like "temperature", "return loss" that you didn't assign

**Root Cause:**

The system previously used hardcoded metric mappings. This has been replaced with a fully dynamic system that uses only your configured metric_mappings.

**Solutions:**

1. **Restart backend server** - Ensure latest code is running
2. **Clear browser cache** and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. **Verify your mappings** in Visualization Settings
4. **Check backend logs** - Should see "Found metric mappings: [...]" when loading dashboard
5. **Verify telemetry API** returns your custom metric names:

   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/telemetry/MediaMax1/MERU?timeFilter=1h
   ```

   Response should contain your metric names as keys (e.g., "MILELE FM Forward Power")

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

### Migrating Configurations Between Environments

When deploying to a new server or computer, you can migrate your existing metric mappings automatically:

#### Step 1: Export from Source Environment

On your development/source computer:

```bash
cd backend
node database/migrate_mappings.js
```

This creates `backend/database/metric_mappings_export.sql` containing all your active metric mappings.

**Export Summary Example:**

```text
✅ Found 21 metric mapping(s)

Configured nodes:
- Genset02/KISUMU: 5 metric(s)
- Kameme FM/LIMURU: 3 metric(s)
- MediaMax1/MERU: 7 metric(s)
- MediaMax1/Nairobi: 4 metric(s)
- MediaMax1/NYERI: 2 metric(s)
```

#### Step 2: Sync Code to Target Environment

On the target computer:

```bash
git pull origin main
```

This ensures you have:

- Latest `setup.js` with auto-import feature
- The `metric_mappings_export.sql` file (if committed to Git)

If you didn't commit the export file, manually copy it to:

```text
backend/database/metric_mappings_export.sql
```

#### Step 3: Run Database Setup

On the target computer:

```bash
cd backend
node database/setup.js
```

The setup script will:

1. ✅ Create all required database tables
2. ✅ Verify tables exist
3. ✅ **Automatically import metric mappings** from the export file
4. ✅ Show import summary

**Expected Output:**

```text
✅ All tables verified successfully!

📦 Importing metric mappings...
✅ Imported 21 metric mapping(s)

📝 Default admin account:
   Username: BSI
   Password: Reporting2026
```

#### Step 4: Verify Import

1. Start the backend server
2. Login to the dashboard
3. Go to Visualization Settings
4. Verify all your metric mappings are present

**Benefits:**

- ✅ No manual reconfiguration needed
- ✅ Consistent metrics across all environments
- ✅ Version-controlled configurations (if export file is committed)
- ✅ Fast deployment to multiple servers

#### Manual Import (Alternative)

If you prefer to import manually:

```bash
mysql -u username -p database_name < backend/database/metric_mappings_export.sql
```

**Note:** The automated `setup.js` approach is recommended as it handles table creation and import in one step.

## Support

For issues or questions:

- Check this guide first
- Review [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)
- Run diagnostic scripts (`verify-nodes.js`)
- Contact: <support@bsi.com>

## Metric View Settings

The Metric View Settings feature allows administrators to customize how metrics are displayed in the Dashboard and My Sites tabs.

### Features - Metrics

#### View Type Selection

Each metric can be displayed in two formats:

- **Line Graph** (default): Time-series visualization showing historical data trends
  - Multiple data points over time
  - Y-axis with configurable units
  - Hover tooltips with exact values
  
- **Dial/Gauge**: Current value display with color-coded zones
  - Shows latest metric value prominently
  - Visual needle pointing to value on scale
  - Color zones (green/yellow/red) based on value ranges
  - Animated transitions on value changes

#### Merge Groups

Combine multiple related metrics into a single multi-line graph:

**Use Cases:**

- Group all power metrics (Forward Power, Reflected Power, VSWR)
- Group environmental metrics (Temperature, Humidity)
- Group status indicators

**Benefits:**

- Reduced dashboard clutter
- Easy visual correlation between related metrics
- Shared X-axis for synchronized time comparison

### Configuration

#### Accessing Settings

1. Login as admin user
2. Click user avatar → **"Metric View Settings"**

#### Changing View Types

##### Method 1: Individual Toggle

1. Find the metric in the list
2. Click the view type dropdown (Line/Dial)
3. Change takes effect immediately

##### Method 2: Inline Toggle (on Dashboard/My Sites)

1. Hover over any metric card
2. Click the view type indicator
3. Select new view type

#### Creating Merge Groups

1. Select multiple metrics using checkboxes
2. Click **"Create Merge Group"**
3. Enter group name (e.g., "Power Metrics")
4. Metrics now appear in shared card

#### Ungrouping Metrics

1. Click **"Ungroup"** on any merge group card
2. Or click **"Ungroup All"** to separate all groups
3. Metrics return to individual cards

### API Reference - Metrics

#### Get All View Settings

```http
GET /api/metric-view-settings
Authorization: Bearer <token>
```

Returns all configured view settings grouped by individual metrics and merge groups.

#### Update View Type

```http
POST /api/metric-view-settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "metric_mapping_id": 5,
  "view_type": "dial"
}
```

#### Create Merge Group

```http
POST /api/metric-view-settings/merge
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "metric_mapping_ids": [5, 6, 7],
  "merge_group_name": "Power Metrics",
  "view_type": "line"
}
```

#### Ungroup Metrics

```http
POST /api/metric-view-settings/ungroup/:groupId
Authorization: Bearer <admin_token>
```

### Metric View Settings Schema

View settings are stored in the `metric_view_settings` table:

```sql
CREATE TABLE metric_view_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_mapping_id INT NOT NULL,
  view_type ENUM('line', 'dial') DEFAULT 'line',
  merge_group_id VARCHAR(36) DEFAULT NULL,
  merge_group_name VARCHAR(100) DEFAULT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (metric_mapping_id) REFERENCES metric_mappings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Migration

The `metric_view_settings` table is created by migration 009:

```bash
cd backend
node database/setup.js
```

The setup script automatically detects and creates this table if missing.

## Related Documentation

- [README.md](README.md) - Main project overview
- [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - Complete API reference
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database configuration
- [USER_MANAGEMENT_GUIDE.md](USER_MANAGEMENT_GUIDE.md) - User roles and permissions
