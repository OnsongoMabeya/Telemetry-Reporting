# Nginx Reverse Proxy Deployment Guide

Complete step-by-step guide for deploying BSI Telemetry with nginx reverse proxy.

## Architecture Overview

```
External Users → http://197.156.145.121:80 (nginx)
                ↓
                HTTPS redirect to :443
                ↓
                nginx serves frontend + proxies /api
                ↓
                Backend at http://192.168.1.69:5000 (local network only)
```

**Benefits:**
- ✅ Only port 80/443 exposed externally (port 5000 stays internal)
- ✅ SSL/TLS encryption for all traffic
- ✅ Single entry point for security
- ✅ Static file caching for better performance
- ✅ Easy to add rate limiting and security headers

---

## Part 1: Development Computer (Mac) Setup

### Step 1: Update Frontend Configuration

The frontend needs to use relative API URLs so nginx can proxy them.

**Already done - files updated in this session:**
- `frontend/.env.production`
- `frontend/vite.config.js`

### Step 2: Update Backend CORS

**Already done - backend will accept requests from nginx proxy**

### Step 3: Build Frontend for Production

```bash
cd frontend
npm run build
```

This creates `frontend/build/` directory with optimized static files.

### Step 4: Commit and Push Changes

```bash
git add .
git commit -m "feat: Add nginx reverse proxy configuration with SSL/TLS support

- Add nginx.conf for Linux/production
- Add nginx-windows.conf for Windows deployment
- Add SSL/TLS setup guide with multiple certificate options
- Update frontend to use relative API URLs
- Update backend CORS for proxy compatibility"
git push origin main
```

---

## Part 2: Production Server (Windows) Setup

### Step 1: Install Nginx on Windows

**Download nginx:**

1. Go to: http://nginx.org/en/download.html
2. Download the latest stable Windows version (e.g., nginx-1.24.0.zip)
3. Extract to `C:\nginx`

**Or use Chocolatey:**

```powershell
choco install nginx
```

### Step 2: Sync Code from Git

```powershell
cd C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting
git pull origin main
```

### Step 3: Build Frontend on Production

```powershell
cd frontend
npm install
npm run build
```

This creates `frontend/build/` with production-ready files.

### Step 4: Configure Nginx

**Copy the Windows configuration:**

```powershell
copy nginx\nginx-windows.conf C:\nginx\conf\nginx.conf
```

**Verify paths in the configuration:**

Edit `C:\nginx\conf\nginx.conf` and confirm:
- `root C:/Users/BSI/Documents/telemetry_reporting/Telemetry-Reporting/frontend/build;`
- `proxy_pass http://192.168.1.69:5000;`

### Step 5: Test Nginx Configuration

```powershell
cd C:\nginx
nginx -t
```

Expected output:
```
nginx: the configuration file C:\nginx/conf/nginx.conf syntax is ok
nginx: configuration file C:\nginx/conf/nginx.conf test is successful
```

### Step 6: Start Nginx

```powershell
cd C:\nginx
start nginx
```

**Verify nginx is running:**

```powershell
tasklist /fi "imagename eq nginx.exe"
```

You should see 2 nginx.exe processes (master + worker).

### Step 7: Configure Router Port Forwarding

**On your router (197.156.145.121):**

1. Login to router admin panel
2. Go to Port Forwarding settings
3. Add rule:
   - External Port: 80
   - Internal IP: 192.168.1.69 (your Windows server)
   - Internal Port: 80
   - Protocol: TCP
4. Save and apply

**Do NOT forward port 5000** - this keeps your backend secure on the local network.

### Step 8: Start Backend Server

```powershell
cd C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend
npm start
```

Backend should start on `http://192.168.1.69:5000` (local network only).

### Step 9: Test the Setup

**From the Windows server:**

```powershell
# Test nginx is serving frontend
curl http://localhost

# Test API proxy
curl http://localhost/api/health
```

**From external network:**

```bash
# Test from any computer outside your network
curl http://197.156.145.121

# Test API
curl http://197.156.145.121/api/health
```

**Open in browser:**
- External: http://197.156.145.121
- Should see BSI Telemetry login page
- Login and verify dashboard loads

---

## Part 3: SSL/TLS Setup (Optional but Recommended)

### Option A: Self-Signed Certificate (Quick Test)

Follow `nginx/SSL_SETUP_GUIDE.md` - Option 1

**Quick steps:**

```powershell
# Install OpenSSL
choco install openssl

# Create SSL directory
mkdir C:\nginx\ssl

# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout C:\nginx\ssl\bsi-telemetry.key `
  -out C:\nginx\ssl\bsi-telemetry.crt `
  -subj "/C=KE/ST=Nairobi/L=Nairobi/O=BSI/CN=197.156.145.121"

# Update nginx config - uncomment HTTPS server block
# Edit C:\nginx\conf\nginx.conf

# Reload nginx
nginx -s reload
```

**Configure router to forward port 443:**
- External Port: 443
- Internal IP: 192.168.1.69
- Internal Port: 443
- Protocol: TCP

**Access via HTTPS:**
- https://197.156.145.121
- Browser will show security warning (accept it for self-signed cert)

### Option B: Let's Encrypt (Production)

Follow `nginx/SSL_SETUP_GUIDE.md` - Option 2

**Requirements:**
- Domain name (e.g., telemetry.bsi.co.ke)
- DNS pointing to 197.156.145.121
- Port 80 accessible from internet

---

## Part 4: Running as Windows Service

To keep nginx running after reboot:

### Install NSSM (Non-Sucking Service Manager)

```powershell
choco install nssm
```

### Create Nginx Service

```powershell
nssm install nginx C:\nginx\nginx.exe
nssm set nginx AppDirectory C:\nginx
nssm set nginx DisplayName "Nginx Web Server"
nssm set nginx Description "BSI Telemetry Nginx Reverse Proxy"
nssm set nginx Start SERVICE_AUTO_START
nssm start nginx
```

### Create Backend Service

```powershell
nssm install bsi-backend "C:\Program Files\nodejs\node.exe" "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\server.js"
nssm set bsi-backend AppDirectory "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend"
nssm set bsi-backend DisplayName "BSI Telemetry Backend"
nssm set bsi-backend Description "BSI Telemetry Backend API Server"
nssm set bsi-backend Start SERVICE_AUTO_START
nssm start bsi-backend
```

**Verify services:**

```powershell
Get-Service nginx
Get-Service bsi-backend
```

---

## Nginx Management Commands

### Windows

```powershell
# Start nginx
cd C:\nginx
start nginx

# Stop nginx
nginx -s stop

# Reload configuration (no downtime)
nginx -s reload

# Test configuration
nginx -t

# View running processes
tasklist /fi "imagename eq nginx.exe"

# Kill all nginx processes (if needed)
taskkill /f /im nginx.exe
```

### Check Logs

```powershell
# Access log
type C:\nginx\logs\access.log

# Error log
type C:\nginx\logs\error.log

# Tail logs (PowerShell)
Get-Content C:\nginx\logs\error.log -Wait -Tail 50
```

---

## Troubleshooting

### Nginx Won't Start

```powershell
# Check configuration
nginx -t

# Check if port 80 is already in use
netstat -ano | findstr :80

# View error log
type C:\nginx\logs\error.log
```

### API Requests Failing

**Check backend is running:**

```powershell
curl http://192.168.1.69:5000/health
```

**Check nginx proxy configuration:**

```powershell
# Verify proxy_pass URL in nginx.conf
type C:\nginx\conf\nginx.conf | findstr proxy_pass
```

**Check nginx error log:**

```powershell
type C:\nginx\logs\error.log
```

### Frontend Not Loading

**Verify build directory exists:**

```powershell
dir C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\frontend\build
```

**Check nginx root path:**

```powershell
type C:\nginx\conf\nginx.conf | findstr "root"
```

### Port Forwarding Not Working

**Test from local network first:**

```powershell
# From Windows server
curl http://192.168.1.69

# From another computer on same network
curl http://192.168.1.69
```

**If local works but external doesn't:**
- Check router port forwarding rules
- Verify ISP doesn't block port 80
- Check Windows Firewall rules

**Allow nginx through firewall:**

```powershell
New-NetFirewallRule -DisplayName "Nginx HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Nginx HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

### SSL Certificate Issues

See `nginx/SSL_SETUP_GUIDE.md` for detailed SSL troubleshooting.

---

## Security Checklist

- [ ] Port 5000 NOT forwarded on router (backend stays internal)
- [ ] Only ports 80 and 443 exposed externally
- [ ] SSL/TLS certificate installed and working
- [ ] HTTP redirects to HTTPS
- [ ] Security headers enabled in nginx config
- [ ] Nginx and Node.js updated to latest versions
- [ ] Strong passwords for admin accounts
- [ ] Regular backups of database and configuration
- [ ] Firewall rules configured correctly
- [ ] Nginx access logs monitored for suspicious activity

---

## Maintenance

### Update Application

```powershell
# On production server
cd C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting
git pull origin main

# Rebuild frontend
cd frontend
npm install
npm run build

# Restart backend
nssm restart bsi-backend

# Reload nginx (no downtime)
nginx -s reload
```

### Monitor Logs

```powershell
# Nginx access log
Get-Content C:\nginx\logs\access.log -Wait -Tail 50

# Nginx error log
Get-Content C:\nginx\logs\error.log -Wait -Tail 50

# Backend logs (if using PM2 or logging to file)
Get-Content C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\app.log -Wait -Tail 50
```

### Backup

```powershell
# Backup nginx configuration
copy C:\nginx\conf\nginx.conf C:\nginx\conf\nginx.conf.backup

# Backup SSL certificates
copy C:\nginx\ssl\* C:\nginx\ssl\backup\

# Backup database (MySQL)
mysqldump -u root -p horiserverdatalive > backup_$(Get-Date -Format 'yyyy-MM-dd').sql
```

---

## Support

For issues:
1. Check nginx error logs
2. Check backend logs
3. Verify network connectivity
4. Review this guide's troubleshooting section
5. Check `nginx/SSL_SETUP_GUIDE.md` for SSL issues
