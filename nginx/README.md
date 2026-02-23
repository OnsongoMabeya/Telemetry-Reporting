# Nginx Reverse Proxy Setup

This directory contains nginx configuration files for deploying BSI Telemetry with a reverse proxy.

## Files

- **`nginx.conf`** - Production configuration for Linux/Unix servers
- **`nginx-windows.conf`** - Production configuration for Windows servers
- **`DEPLOYMENT_GUIDE.md`** - Complete step-by-step deployment instructions
- **`SSL_SETUP_GUIDE.md`** - SSL/TLS certificate setup guide

## Quick Start

### For Windows Production Server

1. Follow **`DEPLOYMENT_GUIDE.md`** for complete setup
2. Use **`nginx-windows.conf`** as your nginx configuration
3. Optionally follow **`SSL_SETUP_GUIDE.md`** to enable HTTPS

### Key Features

- ✅ Backend port 5000 stays on local network (not exposed externally)
- ✅ Only port 80/443 exposed to internet
- ✅ SSL/TLS ready configuration
- ✅ Static file caching
- ✅ Security headers enabled
- ✅ Gzip compression

## Architecture

```
External Users
    ↓
http://197.156.145.121:80 (nginx)
    ↓
Serves frontend + proxies /api requests
    ↓
http://192.168.1.69:5000 (backend - local network only)
```

## Support

See the deployment guide for troubleshooting and detailed instructions.
