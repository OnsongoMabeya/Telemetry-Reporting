# BSI Telemetry Reporting System - Quick Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x LTS or higher
- **MySQL** 8.0 or higher  
- **Redis** 6.0 or higher
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
```

### WhatsApp Setup (Optional)

1. Go to [Meta Developers](https://developers.facebook.com)
2. Create Business App → Add WhatsApp product
3. Add phone number and verify
4. Configure templates in `.env`

### Troubleshooting

**Database Connection Failed:**
```bash
# Check MySQL service
sudo systemctl status mysql

# Reset database
mysql -u root -p -e "DROP DATABASE IF EXISTS telemetry_reporting; CREATE DATABASE telemetry_reporting;"
```

**Port Already in Use:**
```bash
# Kill process on port 3010
lsof -ti:3010 | xargs kill -9

# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

**Permission Issues:**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 .
```

---

**For complete documentation, see [DOCUMENTATION.md](DOCUMENTATION.md)**
