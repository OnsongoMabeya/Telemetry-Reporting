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

| Role        | Permissions                                         |
|-------------|-----------------------------------------------------|
| **Admin**   | Full access, user management, metric configuration  |
| **Manager** | View all data, manage assignments, create reports   |
| **Viewer**  | View assigned nodes only, generate personal reports |

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
