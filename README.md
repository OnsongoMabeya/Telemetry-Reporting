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
- **🌓 Dark Mode**: Full dark theme support
- **📱 Responsive**: Works on desktop, tablet, and mobile

## 📋 Quick Start

```bash
# Clone repository
git clone https://github.com/OnsongoMabeya/Telemetry-Reporting.git
cd Telemetry-Reporting

# Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Setup database
cd backend && npm run db:setup && cd ..

# Run development server
npm run dev
```

Access at: `http://localhost:3010`

Default login: `BSI` / `Reporting2026`

## 📖 Documentation

- **[Detailed Guide](DETAILED_GUIDE.md)** - Complete installation, configuration, and deployment documentation
- **[API Reference](DETAILED_GUIDE.md#api-reference)** - API endpoints and examples

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

## � User Roles

| Role        | Access Level                                                  |
|-------------|---------------------------------------------------------------|
| **Admin**   | Full system access, Dashboard, user management, configuration |
| **Manager** | Dashboard access, view all data, create reports               |
| **Viewer**  | My Sites only (no Dashboard access), view assigned nodes      |

**Note:** Dashboard (`/`) is restricted to Admin and Manager roles. Viewers are automatically redirected to My Sites (`/my-sites`).

## �� Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Frontend | React 19, Material-UI, Recharts |
| Backend  | Node.js 22, Express 5           |
| Database | MySQL 8.0                       |
| Auth     | JWT with bcrypt                 |
| Maps     | Leaflet                         |
| PDF      | Puppeteer                       |
| Alerts   | Meta WhatsApp API               |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Version**: 2.1.0 | **Last Updated**: June 2026
