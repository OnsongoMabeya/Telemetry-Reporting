# BSI Telemetry Reporting System

A comprehensive telemetry monitoring solution for tracking and analyzing node performance across multiple base stations. Real-time data visualization, historical analysis, automated reporting, and instant alerts via WhatsApp.

![Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.1.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Key Features

- **📊 Real-time Dashboard**: Interactive Kenya map with telemetry graphs
- **⚙️ Dynamic Metric Mapping**: Configure custom metrics without code changes
- **👥 Multi-tenant Access**: Role-based permissions (Admin, Manager, Viewer) with Dashboard restricted to Admin/Manager
- **📄 Automated Reports**: Scheduled PDF reports with visualizations
- **📱 WhatsApp Alerts**: Offline/recovery notifications via Meta Business API
- **⚡ Power Drop Alerts**: Monitor sudden drops in metrics like Forward Power with instant notifications
- **🌓 Dark Mode**: Full dark theme support
- **📱 Responsive**: Works on desktop, tablet, and mobile
- **⚡ Optimized Performance**: 75% faster map loading with caching and lazy loading

## 📋 Quick Start

### Prerequisites

- **Node.js** 18.x LTS or higher
- **MySQL** 8.0 or higher
- **Git**

### Installation

```bash
# 1. Clone repository
git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
cd Telemetry-Reporting

# 2. Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# 4. Setup database
cd backend && npm run db:setup && cd ..

# 5. Run development server
npm run dev
```

### Access

- **URL**: `http://localhost:3010`
- **Default Login**: `BSI` / `Reporting2026`

### Environment Configuration

Edit `backend/.env`:

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=telemetry_reporting
DB_USER=telemetry_user
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# WhatsApp (Optional)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token

# Performance Optimization (Optional)
DB_POOL_LIMIT=100
DB_QUEUE_LIMIT=200
```

### WhatsApp Setup (Optional)

1. Go to [Meta Developers](https://developers.facebook.com)
2. Create Business App → Add WhatsApp product
3. Add phone number and verify
4. Configure templates in `.env`

## 📖 Documentation

- **[API Documentation](backend/API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Backend README](backend/README.md)** - Backend setup and configuration
- **[Frontend README](frontend/README.md)** - Frontend development guide
- **[Deployment Guide](nginx/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[SSL Setup Guide](nginx/SSL_SETUP_GUIDE.md)** - HTTPS configuration

## 🏗️ System Architecture

```text
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │ ←──→ │   Node.js   │ ←──→ │    MySQL    │
│  Frontend   │      │   Backend   │      │   Database  │
│   :3010     │      │    :5000    │      │   :3306     │
└─────────────┘      └─────────────┘      └─────────────┘
                              ↓
                       WhatsApp (Meta API)
                       Email (SMTP)
```

## 🎯 Use Cases

- **Broadcast Stations**: Monitor FM transmitters across multiple sites
- **Telecom Infrastructure**: Track equipment health and performance
- **Industrial IoT**: Real-time sensor data visualization
- **Multi-site Operations**: Centralized monitoring with per-site access control

## 🔐 User Roles

| Role        | Access Level                                                  |
|-------------|---------------------------------------------------------------|
| **Admin**   | Full system access, Dashboard, user management, configuration |
| **Manager** | Dashboard access, view all data, create reports               |
| **Viewer**  | My Sites only (no Dashboard access), view assigned nodes      |

**Note:** Dashboard (`/`) is restricted to Admin and Manager roles. Viewers are automatically redirected to My Sites (`/my-sites`).

## 🛠️ Tech Stack

| Layer       | Technology                      |
|-------------|---------------------------------|
| Frontend    | React 19, Material-UI, Recharts |
| Backend     | Node.js 22, Express 5           |
| Database    | MySQL 8.0                       |
| Auth        | JWT with bcrypt                 |
| Maps        | Leaflet                         |
| PDF         | Puppeteer                       |
| Caching     | In-memory with auto-cleanup     |
| Compression | Gzip                            |

## ⚡ Performance Optimization

### Map Loading Optimization (Completed Aug 2026)

The system includes comprehensive performance optimizations for map loading:

| Phase       | Optimization                              | Impact        |
|-------------|-------------------------------------------|---------------|
| **Phase 1** | Database indexes + query parallelization  | 30-40% faster |
| **Phase 2** | Backend caching (10-min TTL)              | 60-70% faster |
| **Phase 3** | Frontend lazy loading + animation removal | 20-30% faster |
| **Phase 4** | Gzip compression + cache headers          | 10-15% faster |

**Results:**

- First load: 5-8s → <2s (75% improvement)
- Repeated load: 5-8s → <100ms (98% improvement)
- Database load: 70-80% reduction
- Network transfer: 60-80% reduction

**Implementation Details:**

- Database indexes on `mapviewtable.BaseStationName` and `metric_mappings.base_station_name`
- Query parallelization using `Promise.all()`
- In-memory caching with automatic cleanup
- Lazy loading for map markers
- Gzip compression middleware
- Browser caching headers (10-minute TTL)

## 🔧 Troubleshooting

### Database Connection Failed

```bash
# Check MySQL service
sudo systemctl status mysql

# Reset database
mysql -u root -p -e "DROP DATABASE IF EXISTS telemetry_reporting; CREATE DATABASE telemetry_reporting;"
```

### Port Already in Use

```bash
# Kill process on port 3010 (frontend)
lsof -ti:3010 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Map Not Loading

1. Check browser console for errors
2. Verify database has station data in `mapviewtable`
3. Check cache is working: `curl -i http://localhost:5000/api/basestations-map`
4. Verify indexes exist: `SHOW INDEX FROM mapviewtable;`

## 📊 Development Commands

```bash
# Development
npm run dev              # Run both frontend and backend

# Backend only
cd backend && npm start

# Frontend only
cd frontend && npm start

# Database setup
cd backend && npm run db:setup

# Build for production
npm run build

# Run production build
npm run start:prod
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Version**: 2.1.0 | **Last Updated**: June 2026
