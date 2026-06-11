# BSI Telemetry Reporting - Detailed Guide

Complete installation, configuration, and deployment documentation.

## Table of Contents

- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Features](#features)
  - [Metric Mapping System](#metric-mapping-system)
  - [My Sites Dashboard](#my-sites-dashboard)
  - [User Management](#user-management)
  - [Reporting](#reporting)
  - [WhatsApp Alerts](#whatsapp-alerts)
  - [Power Drop Alerts](#power-drop-alerts)
- [API Reference](#api-reference)
- [Production Deployment](#production-deployment)
- [SSL/TLS Setup](#ssltls-setup)
- [Troubleshooting](#troubleshooting)

---

## Overview

BSI Telemetry Reporting System is a comprehensive monitoring solution for tracking node performance across multiple base stations. It provides real-time data visualization, historical analysis, automated reporting, and alerting capabilities.

### Key Features

- **Real-time Telemetry Dashboard**: Interactive charts with Kenya map visualization
- **Dynamic Metric Mapping**: Configure custom metrics without code changes
- **Multi-tenant Architecture**: Role-based access (Admin, Manager, Viewer)
- **Automated Reports**: Scheduled PDF reports with visualizations
- **WhatsApp Alerts**: Offline/recovery notifications via Meta Business API
- **Responsive Design**: Works on desktop, tablet, and mobile

---

## System Requirements

### Prerequisites

- **Node.js**: 22.x (LTS recommended)
- **MySQL**: 8.0+
- **npm**: 10.x or yarn
- **Git**

### Optional for Production

- **Nginx**: Reverse proxy (Windows/Linux)
- **SSL Certificate**: Let's Encrypt or commercial
- **Meta Business Account**: For WhatsApp alerts

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
cd Telemetry-Reporting
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Database Setup

### Automated Setup (Recommended)

Configure `.env` file in `backend/` folder first (see [Configuration](#configuration)), then:

```bash
cd backend
npm run db:setup
```

This creates all required tables and the default admin account (BSI/Reporting2026).

### Manual Setup

```bash
cd backend

# Run migrations in order
mysql -u username -p database_name < database/migrations/001_create_users_table.sql
mysql -u username -p database_name < database/migrations/002_create_user_node_assignments.sql
mysql -u username -p database_name < database/migrations/003_create_metric_mappings.sql
mysql -u username -p database_name < database/migrations/004_add_color_to_metric_mappings.sql
mysql -u username -p database_name < database/migrations/005_create_user_activity_log.sql
mysql -u username -p database_name < database/migrations/006_enhance_activity_log.sql
```

### Database Tables

| Table                   | Purpose                     |
|-------------------------|-----------------------------|
| `users`                 | User accounts with roles    |
| `user_node_assignments` | Node access control         |
| `metric_mappings`       | Visualization configuration |
| `metric_mapping_audit`  | Change audit trail          |
| `user_activity_log`     | Structured logging          |
| `site_alert_state`      | Offline alerting state      |

---

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=horiserverlive

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=24h

# Email (SMTP)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
SMTP_FROM=your-email@domain.com
SMTP_FROM_NAME=BSI Telemetry

# WhatsApp (Meta API)
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WABA_ID=your_waba_id

# Logging
LOG_TO_CONSOLE=true

# CORS
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
REACT_APP_API_BASE_URL=http://localhost:5000
```

For production:

```env
REACT_APP_API_BASE_URL=.
```

---

## Running the Application

### Development Mode

Start both frontend and backend:

```bash
# From project root
npm run dev
```

Or separately:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

Access the application at `http://localhost:3010`

### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm start
```

---

## Features

### Metric Mapping System

Configure custom visualizations per node/base station without code changes.

#### Quick Setup

1. Login as admin (BSI/Reporting2026)
2. Click user avatar → **Visualization Settings**
3. Click **Add Metric Mapping**
4. Configure:
   - **Node**: Select from dropdown
   - **Base Station**: Select location
   - **Database Column**: Choose from 48 available columns (Analog1-16, Digital1-16, Output1-16)
   - **Metric Name**: Custom display name (e.g., "Forward Power")
   - **Unit**: Optional (dBm, W, V, etc.)
   - **Display Order**: Number for sorting (1, 2, 3...)
   - **Color**: Optional hex color for graph line

#### View Types

- **Line Graph**: Traditional time-series visualization
- **Dial/Gauge**: Current value display with thresholds

#### Merge Groups

Combine related metrics into single multi-line graphs:

1. Select multiple metrics
2. Click **Create Merge Group**
3. Name the group (e.g., "Power Metrics")
4. Metrics display together in one card

### My Sites Dashboard

Client-specific dashboard showing only assigned services.

#### My Sites Features

- **Interactive Map**: Kenya map with base station markers
- **Service Cards**: 5-column grid layout with dense packing
- **Slideshow Mode**: Auto-rotate through services in fullscreen
- **Real-time Data**: Live telemetry with configurable time ranges

#### Controls

- **Client Selector**: Filter by assigned client
- **Service Selector**: Choose specific service
- **Time Filter**: 5min to 30 days (Last 5m, 1h, 1d, etc.)
- **Play Button**: Start fullscreen slideshow
- **Slideshow Speed**: 10s to 5min per service

### User Management

Role-based access control with three levels:

| Role        | Permissions                                                          |
|-------------|----------------------------------------------------------------------|
| **Admin**   | Full access, Dashboard, user management, metric configuration        |
| **Manager** | Dashboard access, view all data, manage assignments, reports         |
| **Viewer**  | My Sites only, view assigned nodes, generate personal reports        |

**Note:** The Dashboard (`/`) is restricted to **Admin** and **Manager** roles. Viewer users are automatically redirected to My Sites (`/my-sites`).

#### User Profile

- Update name, email, phone number
- Phone required for WhatsApp alerts
- Change password
- View login history

### Reporting

#### Scheduled Reports

Create automated PDF reports:

1. Go to **Reports** → **Scheduled Reports**
2. Click **Add Schedule**
3. Configure:
   - **Name**: Report title
   - **Frequency**: Daily, Weekly, Monthly
   - **Time**: When to generate
   - **Recipients**: Email addresses
   - **Services**: Which services to include

#### On-Demand Reports

Generate instant PDF from any dashboard:

1. Configure time range and filters
2. Click **Generate Report** button
3. PDF includes all visible graphs

### WhatsApp Alerts

Real-time offline/recovery notifications via WhatsApp Business API.

#### Setup

1. Create Meta Business account: <https://business.facebook.com>
2. Add phone number and verify
3. Create message templates:
   - `bsi_site_offline_alert`
   - `bsi_site_recovery_alert`
4. Add payment method (first 1,000 conversations/month free)
5. Configure environment variables in `.env`

#### Alert Flow

1. System detects site offline (no data for threshold period)
2. Sends WhatsApp alert to configured phone numbers
3. Tracks alert state to prevent spam
4. Sends recovery alert when site comes back online

### Power Drop Alerts

Monitor sudden drops in critical metrics like Forward Power with instant notifications and automatic recovery detection.

#### Feature Overview

Power Drop Alerts detect rapid decreases in metric values within configurable time windows, providing immediate notification when equipment performance degrades.

#### Power Drop Alert Features

- **Real-time Monitoring**: Polls metrics every 5 seconds for immediate detection
- **Configurable Thresholds**: Set drop percentage (default 80%) and time windows
- **Smart Notifications**: Email and WhatsApp alerts with detailed context
- **Repeat Logic**: Initial alert + one repeat after 10 minutes (prevents spam)
- **Auto-Recovery**: Automatic recovery notifications when power returns to normal
- **Cascading Selection**: Node → Base Station → Metric dropdowns for easy configuration
- **Role-based Access**: Admin and Manager roles only

#### Alert Detection Logic

1. **Detection**: System monitors selected metric every 5 seconds
2. **Threshold Check**: Compares current value against previous reading within time window
3. **Drop Calculation**: `(previous_value - current_value) / previous_value * 100`
4. **Alert Trigger**: Sends notification if drop percentage exceeds threshold
5. **Repeat Logic**: Sends one repeat alert after 10 minutes if still down
6. **Recovery Detection**: Sends recovery alert when power returns to normal

#### Alert Configuration

1. Go to **Alerts** → **Power Drops** tab
2. Click **New Power Drop Alert**
3. Configure settings:
   - **Alert Name**: Descriptive name for identification
   - **Node**: Select from available nodes (cascading dropdown)
   - **Base Station**: Auto-populated based on selected node
   - **Metric to Monitor**: Auto-populated based on node/base station
   - **Drop Threshold**: Percentage drop to trigger alert (1-100%)
   - **Time Window**: Time period for comparison (1-300 seconds)
   - **Check Interval**: How often to check (1-300 seconds)
   - **Recipients**: Users, emails, and WhatsApp numbers
   - **Notification Methods**: Email and/or WhatsApp
   - **Active Status**: Enable/disable monitoring

#### Recipient Management

- **Users**: Select from system users (inherits their contact info)
- **External Emails**: Add any email addresses (free-form input)
- **WhatsApp Numbers**: Add phone numbers in international format (+254712345678)

#### Notification Content

**Drop Alert Email/WhatsApp:**

```text
⚠️ POWER DROP ALERT

[Alert Name] has dropped by [X]% at [Node/Base Station]

Previous: [Previous Value]
Current: [Current Value]
Time: [Timestamp]

Please check transmission status.
```

**Recovery Alert Email/WhatsApp:**

```text
✅ POWER RECOVERY

[Alert Name] has returned to normal at [Node/Base Station]

Current Value: [Current Value]
Downtime: [X] minutes
Time: [Timestamp]

Transmission is now stable.
```

#### Logging and Monitoring

All Power Drop Alert operations are logged with detailed context:

- **Alert Creation/Updates**: CRUD operations with user attribution
- **Detection Events**: Every check with metric values and calculations
- **Notification Attempts**: Success/failure status with error details
- **State Changes**: Alert triggered, repeated, recovered events
- **Performance Metrics**: Processing times and system health

**Log Location**: `backend/logs/logs_YYYY-MM-DD.jsonl`

**Log Categories**:

- `PowerDropAlerts`: Alert-specific operations
- `CRUD`: Configuration changes
- `API`: HTTP request/response tracking

#### WhatsApp Template Setup

Required WhatsApp Business message templates:

1. **bsi_power_drop_alert** (UTILITY category)

   ```text
   ⚠️ POWER DROP ALERT
   
   {{1}} has dropped by {{2}}% at {{3}}
   
   Previous: {{4}}
   Current: {{5}}
   Time: {{6}}
   
   Please check transmission status.
   ```

2. **bsi_power_recovery_alert** (UTILITY category)

   ```text
   ✅ POWER RECOVERY
   
   {{1}} has returned to normal at {{2}}
   
   Current Value: {{3}}
   Downtime: {{4}} minutes
   Time: {{5}}
   
   Transmission is now stable.
   ```

#### Database Schema

- **power_drop_alert_configs**: Alert configurations and settings
- **power_drop_alert_state**: Current status and alert counts per station
- **power_drop_alert_history**: Complete audit log of all alert events

#### Performance Considerations

- **Polling Overhead**: Minimal impact with 5-second intervals
- **Database Load**: Optimized queries with proper indexing
- **Notification Rate**: Limited to prevent spam (max 2 alerts per incident)
- **Memory Usage**: Efficient state management with automatic cleanup

#### Power Drop Alert Troubleshooting

**Common Issues:**

1. **No Base Stations in Dropdown**
   - Ensure metric mappings exist for selected node
   - Check node has active configurations in Visualization Settings

2. **No Metrics in Dropdown**
   - Verify base station has mapped metrics
   - Check metric mappings are active

3. **Alerts Not Triggering**
   - Confirm alert is active and enabled
   - Check metric data is being received
   - Verify drop threshold is appropriate
   - Review logs for detection events

4. **Notifications Not Sending**
   - Check email/WhatsApp configuration
   - Verify recipient contact information
   - Review notification logs for errors

**Log Analysis:**

```bash
# View recent Power Drop Alert logs
tail -f backend/logs/logs_$(date +%Y-%m-%d).jsonl | grep PowerDropAlerts

# Search for specific alert events
grep "PowerDropAlerts" backend/logs/logs_*.jsonl | jq '.'
```

---

## API Reference

Base URL: `http://localhost:5000/api`

Authentication: Bearer token in header

```http
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

| Method | Endpoint        | Description            |
|--------|-----------------|------------------------|
| POST   | `/auth/login`   | Login with credentials |
| POST   | `/auth/logout`  | Logout user            |
| GET    | `/auth/verify`  | Verify token validity  |
| POST   | `/auth/refresh` | Refresh JWT token      |

### Metric Mapping Endpoints

| Method | Endpoint                    | Access         | Description                   |
|--------|-----------------------------|----------------|-------------------------------|
| GET    | `/metric-mappings/columns`  | Admin, Manager | Get available DB columns      |
| GET    | `/metric-mappings`          | Admin, Manager | List all mappings             |
| GET    | `/metric-mappings/nodes`    | Admin, Manager | Get nodes with mapping status |
| GET    | `/metric-mappings/unmapped` | Admin, Manager | Get unmapped nodes            |
| POST   | `/metric-mappings`          | Admin          | Create new mapping            |
| PUT    | `/metric-mappings/:id`      | Admin          | Update mapping                |
| DELETE | `/metric-mappings/:id`      | Admin          | Delete mapping                |

### My Sites Endpoints

| Method | Endpoint                                                     | Description          |
|--------|--------------------------------------------------------------|----------------------|
| GET    | `/my-sites/clients`                                          | Get assigned clients |
| GET    | `/my-sites/clients/:id/services`                             | Get client services  |
| GET    | `/my-sites/clients/:id/services/:sid`                        | Get service details  |
| GET    | `/my-sites/clients/:id/services/:sid/metrics/:mid/telemetry` | Get metric data      |

### Site Alerts Endpoints

| Method | Endpoint                     | Description           |
|--------|------------------------------|-----------------------|
| GET    | `/site-alerts/base-stations` | Get offline status    |
| POST   | `/site-alerts/run-check`     | Trigger manual check  |
| POST   | `/site-alerts/test-whatsapp` | Test WhatsApp message |

### Power Drop Alert Endpoints

| Method | Endpoint                              | Access         | Description                     |
|--------|---------------------------------------|----------------|---------------------------------|
| GET    | `/power-drop-alerts`                  | Admin, Manager | List all alert configurations   |
| POST   | `/power-drop-alerts`                  | Admin, Manager | Create new alert configuration  |
| GET    | `/power-drop-alerts/:id`              | Admin, Manager | Get specific alert configuration|
| PUT    | `/power-drop-alerts/:id`              | Admin, Manager | Update alert configuration      |
| DELETE | `/power-drop-alerts/:id`              | Admin, Manager | Delete alert configuration      |
| GET    | `/power-drop-alerts/state`            | Admin, Manager | Get current alert states        |
| GET    | `/power-drop-alerts/status`           | Admin, Manager | Get overall system status       |

### Request/Response Examples

#### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"BSI","password":"Reporting2026"}'
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "BSI",
    "role": "admin"
  }
}
```

#### Create Metric Mapping

```bash
curl -X POST http://localhost:5000/api/metric-mappings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "node_name": "MediaMax1",
    "base_station_name": "Nairobi",
    "column_name": "Analog1Value",
    "metric_name": "Forward Power",
    "unit": "dBm",
    "display_order": 1
  }'
```

#### Create Power Drop Alert

```bash
curl -X POST http://localhost:5000/api/power-drop-alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aviation FM Forward Power Monitor",
    "node_name": "Aviation FM",
    "base_station_name": "ELDORET",
    "metric_mapping_id": 178,
    "drop_percentage": 80,
    "time_window_seconds": 5,
    "check_interval_seconds": 5,
    "recipient_users": [1, 2],
    "recipient_emails": ["admin@example.com"],
    "recipient_phones": ["+254712345678"],
    "notify_email": true,
    "notify_whatsapp": true,
    "is_active": true
  }'
```

Response:

```json
{
  "success": true,
  "message": "Power drop alert configuration created successfully",
  "id": 4
}
```

#### Get Power Drop Alert States

```bash
curl -X GET http://localhost:5000/api/power-drop-alerts/state \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "config_id": 4,
      "node_name": "Aviation FM",
      "base_station_name": "ELDORET",
      "is_power_down": false,
      "alert_count": 0,
      "last_triggered_at": null,
      "recovered_at": null,
      "last_checked_at": "2026-06-11T06:45:00.000Z"
    }
  ]
}
```

---

## Production Deployment

### Nginx Reverse Proxy Setup

Architecture:

```text
External Users → nginx:3010 → Frontend (static)
                    ↓
              Backend:5000 (internal)
```

### Windows Deployment

1. **Install Nginx**:

   ```powershell
   # Download from nginx.org, extract to C:\nginx
   # Or use Chocolatey:
   choco install nginx
   ```

2. **Configure Nginx**:

   Copy `nginx/nginx-windows.conf` to `C:\nginx\conf\nginx.conf`

   Update paths in configuration:

   - `root` path to your frontend build folder
   - `proxy_pass` to your backend IP

3. **Build Frontend**:

   ```powershell
   cd frontend
   npm install
   npm run build
   ```

4. **Test Configuration**:

   ```powershell
   cd C:\nginx
   nginx -t
   ```

5. **Start Nginx**:

   ```powershell
   start nginx
   ```

6. **Configure Port Forwarding**:

   On your router, forward port 3010 to your server's internal IP.

### Linux Deployment

1. **Install Nginx**:

   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Copy Configuration**:

   ```bash
   sudo cp nginx/nginx.conf /etc/nginx/sites-available/bsi-telemetry
   sudo ln -s /etc/nginx/sites-available/bsi-telemetry /etc/nginx/sites-enabled/
   ```

3. **Build and Deploy**:

   ```bash
   cd frontend
   npm run build
   sudo cp -r build/* /var/www/bsi-telemetry/
   ```

4. **Restart Nginx**:

   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### PM2 Process Management (Linux)

```bash
# Install PM2
sudo npm install -g pm2

# Start backend
cd backend
pm2 start server.js --name bsi-backend

# Save PM2 config
pm2 save
pm2 startup
```

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

Prerequisites:

- Domain name pointing to your server
- Port 80 accessible

**Windows**:

```powershell
# Install Certbot
choco install certbot

# Stop nginx
nginx -s stop

# Obtain certificate
certbot certonly --standalone -d telemetry.yourdomain.com

# Copy certificates
copy C:\Certbot\live\telemetry.yourdomain.com\fullchain.pem C:\nginx\ssl\
copy C:\Certbot\live\telemetry.yourdomain.com\privkey.pem C:\nginx\ssl\

# Start nginx
nginx

# Setup auto-renewal
schtasks /create /tn "Certbot Renewal" /tr "certbot renew --quiet" /sc daily /st 03:00
```

**Linux**:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d telemetry.yourdomain.com
```

### Option 2: Self-Signed Certificate

```bash
# Generate private key
openssl genrsa -out server.key 2048

# Generate certificate
openssl req -new -x509 -sha256 -key server.key -out server.crt -days 365
```

### Option 3: Commercial Certificate

1. Purchase certificate from provider (DigiCert, GlobalSign, etc.)
2. Generate CSR:

   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout server.key \
     -out server.csr \
     -subj "/C=KE/ST=Nairobi/L=Nairobi/O=BSI/CN=yourdomain.com"
   ```

3. Submit CSR to CA
4. Install provided certificate files

---

## Troubleshooting

### Backend Won't Start

| Issue                     | Solution                                         |
|---------------------------|--------------------------------------------------|
| `package.json not found`  | Run `npm install` in correct directory           |
| Database connection error | Check `.env` credentials, ensure MySQL running   |
| Port already in use       | Kill process on port 5000 or change PORT in .env |

### Frontend Build Issues

| Issue               | Solution                                |
|---------------------|-----------------------------------------|
| `npm install` fails | Clear cache: `npm cache clean --force`  |
| Build fails         | Check for syntax errors in code         |
| Blank page          | Verify `REACT_APP_API_BASE_URL` in .env |

### Database Issues

| Issue               | Solution                          |
|---------------------|-----------------------------------|
| Migration fails     | Run migrations in correct order   |
| Table doesn't exist | Check `show tables` in MySQL      |
| Data not showing    | Verify metric mappings configured |

### WhatsApp Alerts Not Sending

1. Check `.env` has all three variables set
2. Verify phone number format: `+254725108178`
3. Ensure templates approved in Meta Business Manager
4. Check payment method added (required even for free tier)
5. Test with service window: Send message TO business number first

### Nginx Issues

| Issue                    | Solution                               |
|--------------------------|----------------------------------------|
| Configuration test fails | Check nginx.conf syntax                |
| 502 Bad Gateway          | Ensure backend running on correct port |
| Static files not loading | Verify root path in nginx.conf         |

### Getting Help

- Check logs: `backend/logs/logs_YYYY-MM-DD.jsonl`
- Review browser console for frontend errors
- Test API endpoints with curl/Postman
- Verify all environment variables set correctly

---

## License

MIT License - See LICENSE file for details.

---

**Document Version**: 2.1.0  
**Last Updated**: June 2026
