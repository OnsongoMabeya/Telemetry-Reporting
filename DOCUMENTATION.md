# BSI Telemetry Reporting System - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [User Guide](#user-guide)
4. [API Reference](#api-reference)
5. [Deployment Guide](#deployment-guide)
6. [Testing & Performance](#testing--performance)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Overview

The BSI Telemetry Reporting System is a comprehensive monitoring solution for power infrastructure that provides real-time data visualization, automated reporting, and instant alerts via WhatsApp.

### Key Features

- **📊 Real-time Dashboard**: Interactive Kenya map with telemetry graphs
- **⚙️ Dynamic Metric Mapping**: Configure custom metrics without code changes
- **👥 Multi-tenant Access**: Role-based permissions (Admin, Manager, Viewer)
- **📄 Automated Reports**: Scheduled PDF reports with visualizations
- **📱 WhatsApp Alerts**: Offline/recovery notifications via Meta Business API
- **⚡ Power Drop Alerts**: Monitor sudden drops in metrics with instant notifications
- **🌓 Dark Mode**: Full dark theme support
- **📱 Responsive**: Works on desktop, tablet, and mobile

### System Architecture

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│  App Server 1   │    │   Database      │
│   (Nginx/HAProxy)│    │   (Node.js)     │────│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  App Server 2   │
                       │   (Node.js)     │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Session)     │
                       └─────────────────┘
```

---

## Installation & Setup

### System Requirements

**Minimum Hardware:**
- **Application Server**: 4 CPU cores, 8GB RAM, 100GB SSD
- **Database Server**: 8 CPU cores, 16GB RAM, 500GB SSD
- **Load Balancer**: 2 CPU cores, 4GB RAM
- **Redis Cache**: 2 CPU cores, 4GB RAM

**Software Requirements:**
- **Operating System**: Ubuntu 20.04 LTS or CentOS 8
- **Node.js**: 18.x LTS
- **MySQL**: 8.0 or higher
- **Redis**: 6.0 or higher
- **Nginx**: 1.18 or higher

### Quick Installation

```bash
# Clone repository
git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
cd Telemetry-Reporting

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Database setup
mysql -u root -p < database/schema.sql
npm run migrate

# Start application
npm start
```

### Database Setup

```sql
-- Create database
CREATE DATABASE telemetry_reporting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'telemetry_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON telemetry_reporting.* TO 'telemetry_user'@'localhost';
FLUSH PRIVILEGES;
```

### WhatsApp Setup

**Phase 1 - Meta Setup:**

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → select your existing BSI app (or create new Business app)
3. Add **WhatsApp** product
4. Connect WhatsApp Business Account (WABA)
5. Add phone number: `+254 700 111 222`
6. Verify via SMS/Voice call
7. Copy **Phone Number ID**

**Phase 2 - Template Registration:**

```javascript
// WhatsApp template configuration
const templates = [
  {
    name: "power_drop_alert",
    category: "UTILITY",
    language: "en",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "⚠️ Power Drop Alert"
      },
      {
        type: "BODY",
        text: "Power drop detected at {{1}}:\n\nNode: {{2}}\nBase Station: {{3}}\nMetric: {{4}}\nValue: {{5}}V\nThreshold: {{6}}V\nDuration: {{7}}s\n\nTime: {{8}}"
      }
    ]
  }
];
```

**Phase 3 - Application Configuration:**

```javascript
// WhatsApp configuration in .env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

---

## User Guide

### Getting Started

**Prerequisites:**
- Active BSI Telemetry account with admin privileges
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection

**First Login:**
1. Navigate to [https://telemetry.bsi.com](https://telemetry.bsi.com)
2. Enter your credentials
3. Complete two-factor authentication if enabled
4. You will be redirected to the main dashboard

### Dashboard Overview

The main dashboard provides:
- **System Status**: Overall system health and performance metrics
- **Recent Alerts**: Latest power drop alerts and notifications
- **Quick Actions**: Fast access to common tasks
- **Performance Summary**: Key performance indicators and statistics

### Power Drop Alerts

#### Setting Up Power Drop Alerts

**Step 1: Navigate to Power Drops Tab**
1. Click on **Alerts** in the main navigation
2. Select the **Power Drops** tab

**Step 2: Create New Alert Configuration**
1. Click the **+ Add Configuration** button
2. Fill in the required information:

**Basic Configuration:**
- **Node**: Select the monitoring node from dropdown
- **Base Station**: Choose the specific base station
- **Metric**: Select the metric to monitor (voltage, current, power, etc.)
- **Threshold Value**: Set the minimum acceptable value
- **Drop Duration**: Minimum duration (in seconds) before triggering alert

**Advanced Options:**
- **Notification Channels**: Choose WhatsApp, email, or both
- **Alert Severity**: Set priority level (low, medium, high, critical)
- **Recovery Notification**: Enable/disable recovery alerts
- **Testing**: Always test new configurations before activation

#### Managing Alert Configurations

**Viewing Active Alerts:**
- Active configurations are shown in a table format
- Status indicators show if monitoring is active
- Last check time and recent activity are displayed

**Editing Configurations:**
1. Click the **Edit** button next to any configuration
2. Modify settings as needed
3. Click **Save Changes** to update

**Pausing/Resuming Alerts:**
1. Use the toggle switch to temporarily pause monitoring
2. Click **Resume** to restart monitoring
3. Paused configurations retain their settings

### Manual Reports

The manual report generation follows a 6-step workflow:

#### Step 1: Report Type Selection

Choose between:

- **Service Reports**: Individual service performance analysis
- **Client Reports**: Consolidated reports for all services under a client

#### Step 2: Target Selection

**For Service Reports:**

- Use search bar to find specific services
- Apply filters by client, status, or performance metrics
- Use bulk selection for multiple services

**For Client Reports:**

- Select from active client list
- Automatically includes all associated services
- Option to exclude specific services if needed

#### Step 3: Date Range Selection

- **Predefined Ranges**: Last 7 days, 30 days, 90 days
- **Custom Range**: Select specific start and end dates
- **Date Validation**: Ensures data availability for selected range

#### Step 4: Delivery Configuration
Choose delivery method:

- **Download**: Immediate download to local device
- **Email**: Send to specified recipients
- **Both**: Download and email delivery

**Email Configuration:**

- Add multiple recipients
- Custom subject and message
- Attachment size limits

#### Step 5: Report Preview
- **Sample Data**: Preview of actual report content
- **Quality Assessment**: Data completeness and accuracy indicators
- **Size Estimates**: Expected file size and generation time

#### Step 6: Generation and Download
- **Progress Tracking**: Real-time generation progress
- **Estimated Time**: Dynamic time estimates based on data volume
- **Download Options**: Multiple format options (PDF, Excel)

### Performance Monitoring

#### System Health Dashboard

Access performance monitoring via:
1. **Admin Panel** → **Performance** → **System Health**
2. Direct URL: `/performance/health`

**Health Indicators:**
- **Overall Status**: Healthy, Degraded, or Unhealthy
- **Component Status**: Individual service health
- **Resource Usage**: Memory, CPU, and disk utilization

#### Real-time Metrics
- **API Response Times**: Average and percentile metrics
- **Database Performance**: Query execution times and efficiency
- **Cache Performance**: Hit rates and storage utilization

#### Optimization Tools

**Database Optimization:**
1. Navigate to **Performance** → **Optimization**
2. Choose optimization type:
   - **Table Optimization**: Rebuild and optimize tables
   - **Query Analysis**: Analyze slow queries
   - **Cache Optimization**: Optimize query cache
   - **Full Optimization**: Complete system optimization

**Cache Management:**
- **Cache Statistics**: View current cache performance
- **Cache Cleanup**: Remove expired or invalid entries
- **Cache Tuning**: Adjust cache size and expiration settings

---

## API Reference

### Base URL

```text
https://api.bsi-telemetry.com/api
```

### Authentication

All API endpoints require JWT authentication and admin privileges. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Power Drop Alerts API

#### Get All Power Drop Alert Configurations

```http
GET /api/power-drop-alerts/configs
```

**Response:**
```json
{
  "success": true,
  "configs": [
    {
      "id": 1,
      "node_id": "NODE_001",
      "base_station_id": "BS_001",
      "metric_name": "voltage",
      "threshold_value": 220.0,
      "drop_duration_seconds": 60,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Power Drop Alert Configuration

```http
POST /api/power-drop-alerts/configs
```

**Request Body:**
```json
{
  "node_id": "NODE_001",
  "base_station_id": "BS_001",
  "metric_name": "voltage",
  "threshold_value": 220.0,
  "drop_duration_seconds": 60
}
```

#### Update Power Drop Alert Configuration

```http
PUT /api/power-drop-alerts/configs/:id
```

#### Delete Power Drop Alert Configuration

```http
DELETE /api/power-drop-alerts/configs/:id
```

#### Get Power Drop Alert History

```http
GET /api/power-drop-alerts/history?node_id=NODE_001&start_date=2024-01-01&end_date=2024-01-31
```

### Manual Reports API

#### Generate Manual Report

```http
POST /api/manual-reports/generate
```

**Request Body:**
```json
{
  "reportType": "service",
  "targetIds": [1, 2, 3],
  "dateRangeStart": "2024-01-01T00:00:00Z",
  "dateRangeEnd": "2024-01-31T23:59:59Z",
  "deliveryMethod": "download",
  "recipients": ["admin@example.com"]
}
```

**Response:**
```json
{
  "success": true,
  "reportId": 123,
  "status": "generating",
  "message": "Report generation started",
  "estimatedTime": 30000
}
```

#### Get Report Status

```http
GET /api/manual-reports/status/:id
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": 123,
    "status": "completed",
    "progress": 100,
    "pdf_size_bytes": 2048576,
    "download_url": "/api/manual-reports/download/123"
  }
}
```

#### Download Report

```http
GET /api/manual-reports/download/:id
```

#### Get Report History

```http
GET /api/manual-reports/history?page=1&limit=20&status=completed
```

**Response:**
```json
{
  "success": true,
  "reports": [
    {
      "id": 123,
      "report_type": "service",
      "target_ids": [1, 2, 3],
      "date_range_start": "2024-01-01T00:00:00Z",
      "date_range_end": "2024-01-31T23:59:59Z",
      "status": "completed",
      "generation_time_ms": 15000,
      "pdf_size_bytes": 2048576,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Generate Report Preview

```http
POST /api/manual-reports/preview
```

**Request Body:**
```json
{
  "reportType": "service",
  "targetIds": [1, 2, 3],
  "dateRangeStart": "2024-01-01T00:00:00Z",
  "dateRangeEnd": "2024-01-31T23:59:59Z"
}
```

### Cache Management

#### Get Cache Statistics

```http
GET /api/manual-reports/cache-stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_entries": 150,
    "cache_size_mb": 245.6,
    "hit_rate": 0.85,
    "miss_rate": 0.15,
    "evictions": 12,
    "ttl_configured": 3600
  }
}
```

#### Clear Cache

```http
POST /api/manual-reports/cache/clear
```

**Request Body (Optional):**
```json
{
  "reportType": "service",
  "targetIds": [1, 2, 3]
}
```

### Performance Monitoring API

#### Get Performance Metrics

```http
GET /api/manual-reports/performance?type=api&timeRange=60
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "api_response_time": {
      "avg": 850,
      "p95": 1200,
      "p99": 1800
    },
    "database_performance": {
      "query_time_avg": 45,
      "connections_active": 25,
      "cache_hit_rate": 0.92
    },
    "system_resources": {
      "cpu_usage": 45.2,
      "memory_usage": 68.5,
      "disk_usage": 32.1
    }
  }
}
```

#### Optimize Database

```http
POST /api/manual-reports/performance/optimize
```

**Request Body:**
```json
{
  "operation": "all" // "all", "optimize", "analyze", "cache"
}
```

#### Get System Health

```http
GET /api/manual-reports/performance/health
```

**Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "checks": {
      "database": "healthy",
      "redis": "healthy",
      "disk_space": "healthy",
      "memory": "healthy"
    },
    "uptime": 86400,
    "version": "2.1.0"
  }
}
```

### Error Handling

#### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `206` - Partial Content (degraded performance)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

#### Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Daily Limit**: 10 requests per user
- **Hourly Limit**: 5 requests per user

Rate limit headers are included in responses:

```text
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642694400
```

### SDK Examples

#### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'https://api.bsi-telemetry.com/api';

// Login and get token
const login = async (username, password) => {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    username,
    password
  });
  return response.data.token;
};

// Generate report
const generateReport = async (token, reportConfig) => {
  const response = await axios.post(`${API_BASE}/manual-reports/generate`, reportConfig, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Check report status
const getReportStatus = async (token, reportId) => {
  const response = await axios.get(`${API_BASE}/manual-reports/status/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

#### Python

```python
import requests

headers = {'Authorization': f'Bearer {token}'}

# Generate report
response = requests.post(
  'https://api.bsi-telemetry.com/api/manual-reports/generate',
  json={
    'reportType': 'service',
    'targetIds': [1, 2, 3],
    'dateRangeStart': '2024-01-01T00:00:00Z',
    'dateRangeEnd': '2024-01-31T23:59:59Z'
  },
  headers=headers
)

# Check status
status = requests.get(
  f'https://api.bsi-telemetry.com/api/manual-reports/status/{response.json()["reportId"]}',
  headers=headers
)
```

---

## Deployment Guide

### Production Deployment

#### Environment Setup

**Create Deployment User:**
```bash
# Create deployment user
sudo useradd -m -s /bin/bash telemetry
sudo usermod -aG sudo telemetry

# Switch to deployment user
sudo su - telemetry
```

**Install Node.js:**
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Install MySQL:**
```bash
# Install MySQL 8.0
sudo apt update
sudo apt install mysql-server mysql-client

# Secure installation
sudo mysql_secure_installation

# Create database and user
mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE telemetry_reporting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'telemetry_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON telemetry_reporting.* TO 'telemetry_user'@'localhost';
FLUSH PRIVILEGES;
```

**Install Redis:**
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Application Deployment

**Clone Repository:**
```bash
# Clone application
cd /var/www
git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
cd Telemetry-Reporting

# Set ownership
sudo chown -R telemetry:telemetry /var/www/telemetry-reporting
```

**Install Dependencies:**
```bash
# Install Node.js dependencies
npm ci --production

# Install global dependencies
sudo npm install -g pm2
```

**Environment Configuration:**
```bash
# Create production environment file
cp .env.example .env.production

# Edit production settings
nano .env.production
```

```bash
# Production environment variables
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=telemetry_reporting
DB_USER=telemetry_user
DB_PASSWORD=secure_password
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key
```

#### Database Migration

```bash
# Run database migrations
npm run migrate:prod

# Seed initial data if needed
npm run seed:prod
```

#### Process Management

**PM2 Configuration:**
```bash
# Create PM2 configuration file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'telemetry-api',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/telemetry/error.log',
    out_file: '/var/log/telemetry/out.log',
    log_file: '/var/log/telemetry/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

**Start Application:**
```bash
# Create log directory
sudo mkdir -p /var/log/telemetry
sudo chown telemetry:telemetry /var/log/telemetry

# Start application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Web Server Configuration

**Nginx Configuration:**
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/telemetry.bsi.com
```

```nginx
server {
    listen 80;
    server_name telemetry.bsi.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name telemetry.bsi.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/telemetry.bsi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/telemetry.bsi.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend
    location / {
        root /var/www/telemetry-reporting/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable Site:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/telemetry.bsi.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### SSL Certificate Setup

**Let's Encrypt Certificate:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d telemetry.bsi.com

# Setup auto-renewal
sudo crontab -e
```

```bash
# Add to crontab
0 12 * * * /usr/bin/certbot renew --quiet
```

#### Monitoring and Logging

**Log Rotation:**
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/telemetry

/var/log/telemetry/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 telemetry telemetry
    postrotate
        pm2 reloadLogs
    endscript
}
```

**System Monitoring:**
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor application logs
pm2 logs telemetry-api

# Monitor system resources
htop
```

### Scaling and High Availability

#### Horizontal Scaling

```bash
# Deploy additional app servers
# Repeat deployment steps on additional servers

# Configure load balancer
upstream telemetry_backend {
    least_conn;
    server 10.0.1.10:5000;
    server 10.0.1.11:5000;
    server 10.0.1.12:5000;
}
```

#### Database Replication

```sql
-- Master server configuration
SET GLOBAL server_id = 1;
SET GLOBAL log_bin = 'mysql-bin';
CREATE USER 'replication_user'@'%' IDENTIFIED BY 'replication_password';
GRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'%';

-- Slave server configuration
SET GLOBAL server_id = 2;
CHANGE MASTER TO
    MASTER_HOST='master-server-ip',
    MASTER_USER='replication_user',
    MASTER_PASSWORD='replication_password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=154;

START SLAVE;
```

#### Redis Cluster

```bash
# Redis cluster configuration
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 --cluster-replicas 1
```

---

## Testing & Performance

### Load Testing

#### Testing Objectives

**Performance Goals:**
- **API Response Time**: < 2 seconds for 95% of requests
- **Concurrent Users**: Support 500+ concurrent users
- **Throughput**: Handle 1000+ requests per minute
- **Error Rate**: < 0.1% error rate under normal load
- **System Resource Usage**: < 80% CPU, < 70% memory utilization

**Testing Scenarios:**
1. **Normal Load**: Typical daily usage patterns
2. **Peak Load**: High-traffic periods (end of month reporting)
3. **Stress Testing**: Maximum system capacity
4. **Endurance Testing**: Sustained load over extended periods
5. **Spike Testing**: Sudden traffic increases

#### Testing Tools

**Required Tools:**
- **Artillery.js**: Load testing framework
- **K6**: Modern load testing tool
- **Apache JMeter**: Comprehensive testing suite
- **Gatling**: High-performance testing tool
- **Docker**: Containerized testing environments

**Installation:**
```bash
# Install Artillery
npm install -g artillery

# Install K6
sudo gpg -k /usr/share/keyrings/k6-archive-keyring.gpg https://dl.k6.io/key.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Install JMeter
sudo apt install default-jre
wget https://downloads.apache.org//jmeter/binaries/apache-jmeter-5.5.tgz
tar -xzf apache-jmeter-5.5.tgz
sudo mv apache-jmeter-5.5 /opt/jmeter
```

#### Test Scenarios

**Normal Load Testing - Artillery Configuration:**
```yaml
# artillery-config-normal.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 20
      name: "Normal load"
    - duration: 60
      arrivalRate: 5
      name: "Cool down"
  payload:
    path: "test-data.csv"
    fields:
      - "username"
      - "password"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Login and browse"
    weight: 40
    flow:
      - post:
          url: "/api/auth/login"
          capture:
            - json: "$.token"
              as: "authToken"
          json:
            username: "{{ username }}"
            password: "{{ password }}"
      - get:
          url: "/api/manual-reports/history"
          headers:
            Authorization: "Bearer {{ authToken }}"
      - get:
          url: "/api/power-drop-alerts/configs"
          headers:
            Authorization: "Bearer {{ authToken }}"
```

**Peak Load Testing - K6 Configuration:**
```javascript
// k6-peak-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  const response = http.get('http://localhost:5000/api/manual-reports/history');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**Stress Testing - K6 Configuration:**
```javascript
// k6-stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.5'],
    errors: ['rate<0.5'],
  },
};

const BASE_URL = 'http://localhost:5000';

export default function() {
  // Concurrent login attempts
  const loginPromises = Array(5).fill().map(() => 
    http.post(`${BASE_URL}/api/auth/login`, {
      username: `testuser${Math.floor(Math.random() * 100) + 1}`,
      password: 'test123'
    })
  );

  const loginResults = Promise.all(loginPromises);
  
  loginResults.forEach(res => {
    check(res, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  // Heavy API usage
  const token = loginResults[0].json('token');
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  // Multiple concurrent requests
  const requests = [
    http.get(`${BASE_URL}/api/manual-reports/history`, params),
    http.get(`${BASE_URL}/api/manual-reports/performance`, params),
    http.get(`${BASE_URL}/api/power-drop-alerts/configs`, params),
    http.post(`${BASE_URL}/api/manual-reports/preview`, {
      reportType: "service",
      targetIds: [1, 2, 3],
      dateRangeStart: "2024-01-01T00:00:00Z",
      dateRangeEnd: "2024-01-31T23:59:59Z"
    }, params)
  ];

  requests.forEach(res => {
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
    });
  });

  sleep(1);
}
```

#### Test Execution

**Running Tests:**
```bash
# Run normal load test
artillery run artillery-config-normal.yml

# Run peak load test
artillery run artillery-config-peak.yml

# Run with custom output
artillery run artillery-config-normal.yml --output results-normal.json

# Generate HTML report
artillery report results-normal.json --output report-normal.html

# Run K6 tests
k6 run k6-normal-load.js
k6 run --vus 100 --duration 10m k6-stress-test.js
```

#### Performance Analysis

**Key Metrics:**
- **Average Response Time**: Overall API performance
- **95th Percentile**: Worst-case scenario performance
- **99th Percentile**: Extreme case performance
- **Time to First Byte**: Server processing time
- **Requests per Second**: System capacity
- **Concurrent Users**: Active user capacity
- **Error Rate**: System reliability

**Optimization Recommendations:**
- **Database Optimization**: Add indexes, optimize queries
- **Application Caching**: Implement Redis caching strategies
- **Load Balancing**: Distribute traffic across multiple servers
- **Resource Scaling**: Increase CPU/memory as needed

---

## Troubleshooting

### Common Issues

#### Power Drop Alert Issues

##### Issue: Not receiving alerts

- Check alert configuration status
- Verify notification channel settings
- Review recent alert history
- Test notification delivery

##### Issue: Too many false alerts
- Adjust threshold values
- Increase drop duration requirements
- Review metric selection
- Analyze historical data patterns

#### Manual Report Issues

##### Issue: Report generation fails

- Check target data availability
- Verify date range validity
- Review system performance status
- Check available disk space

##### Issue: Slow report generation
- Check system performance metrics
- Review cache effectiveness
- Consider reducing report scope
- Schedule during off-peak hours

#### Performance Issues

##### Issue: Slow API responses

- Check performance monitoring dashboard
- Review database optimization status
- Clear query cache if needed
- Contact support for persistent issues

#### Database Connection Issues

##### Issue: Cannot connect to database
- Verify database server is running
- Check connection credentials
- Review firewall settings
- Test network connectivity

### Error Messages

#### Common Error Codes

- **400 Bad Request**: Invalid input parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: System maintenance

#### Resolution Steps

1. **Check Error Details**: Review specific error message
2. **Verify Permissions**: Ensure appropriate access rights
3. **Check System Status**: Verify system health
4. **Review Configuration**: Check settings and parameters
5. **Contact Support**: Reach out for assistance if needed

### Support Resources

#### Self-Service Resources

- **Knowledge Base**: Comprehensive documentation and tutorials
- **Video Tutorials**: Step-by-step video guides
- **FAQ Section**: Answers to common questions
- **Community Forum**: User discussions and solutions

#### Contact Support

- **Email Support**: [support@bsi-telemetry.com](mailto:support@bsi-telemetry.com)
- **Phone Support**: +1-555-TELEMETRY
- **Chat Support**: Available during business hours
- **Emergency Support**: 24/7 for critical issues

---

## FAQ

### General Questions

#### Q: What browsers are supported?
A: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

#### Q: Is there a mobile app?
A: Yes, mobile apps are available for iOS and Android

#### Q: How often is data updated?
A: Real-time data is updated every 5 seconds

### Power Drop Alert FAQs

#### Q: Can I set different thresholds for different times of day?
A: Yes, advanced configurations support time-based thresholds

#### Q: How do I prevent alert fatigue?
A: Use the smart alert features that learn from your response patterns

#### Q: Can alerts be escalated automatically?
A: Yes, configure escalation rules in the alert settings

### Manual Report FAQs

#### Q: What's the maximum report size?
A: Reports are limited to 100MB for email delivery, unlimited for download

#### Q: Can I save report templates?
A: Yes, create and save custom templates for repeated use

#### Q: How long are reports stored?
A: Reports are stored for 90 days by default, configurable up to 1 year

### Performance FAQs

#### Q: How can I improve report generation speed?
A: Use the preview feature, select appropriate date ranges, and leverage caching

#### Q: What affects system performance?
A: Concurrent report generation, data volume, and system resources

#### Q: How often should I optimize the database?
A: Weekly optimization is recommended for high-usage systems

---

## Additional Resources

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Installation Guide](./DETAILED_GUIDE.md)
- [Security Guide](./SECURITY.md)
- [Developer Documentation](./DEVELOPER.md)

For additional support, contact our team at [support@bsi-telemetry.com](mailto:support@bsi-telemetry.com)
