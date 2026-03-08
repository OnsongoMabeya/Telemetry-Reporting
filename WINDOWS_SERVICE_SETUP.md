# Windows Service Setup Guide

Complete guide for setting up BSI Telemetry Backend and Nginx as Windows services using NSSM (Non-Sucking Service Manager) for automatic startup on boot.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Part 1: Install NSSM](#part-1-install-nssm)
- [Part 2: Prepare for Service Installation](#part-2-prepare-for-service-installation)
- [Part 3: Install Backend Service](#part-3-install-backend-service)
- [Part 4: Install Nginx Service](#part-4-install-nginx-service)
- [Part 5: Verify Everything](#part-5-verify-everything)
- [Part 6: Service Management](#part-6-service-management)
- [Part 7: Test Auto-Start](#part-7-test-auto-start-on-reboot)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide will help you set up two Windows services:

1. **bsi-backend** - Node.js backend API server (Port 5000)
2. **bsi-nginx** - Nginx reverse proxy (Port 3010)

Both services will:

- ✅ Auto-start on Windows boot
- ✅ Auto-restart on failure
- ✅ Run in the background
- ✅ Log output for troubleshooting
- ✅ Be manageable via Windows Services (`services.msc`)

---

## Prerequisites

Before starting, verify the following on your production server:

```powershell
# Check Node.js installation and path
node --version
where.exe node

# Check nginx installation
Test-Path C:\nginx\current\nginx.exe

# Check if NSSM is already installed
nssm --version
```

**Required:**

- Node.js installed (typically in `C:\Program Files\nodejs\`)
- Nginx installed in `C:\nginx\current\`
- Administrator privileges to install services

---

## Part 1: Install NSSM

### Option A: If NSSM is NOT installed

#### Step 1: Download NSSM

1. Open browser and navigate to: [https://nssm.cc/download](https://nssm.cc/download)
2. Download the latest version (e.g., `nssm-2.24.zip`)
3. Save to Downloads folder

#### Step 2: Extract NSSM

```powershell
# Extract to C:\nssm
Expand-Archive -Path "$env:USERPROFILE\Downloads\nssm-2.24.zip" -DestinationPath "C:\nssm"
```

#### Step 3: Add NSSM to System PATH

Run PowerShell as Administrator:

```powershell
# Add to PATH
$env:Path += ";C:\nssm\win64"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\nssm\win64", [EnvironmentVariableTarget]::Machine)

# Restart PowerShell to apply changes
```

#### Step 4: Verify Installation

```powershell
nssm --version
# Should display: NSSM 2.24 64-bit 2014-08-31
```

### Option B: If NSSM is Already Installed

```powershell
# Just verify it works
nssm --version
```

---

## Part 2: Prepare for Service Installation

### Step 1: Stop Any Running Processes

```powershell
# Stop backend if running
taskkill /f /im node.exe

# Stop nginx if running
taskkill /f /im nginx.exe

# Verify they're stopped
tasklist /fi "imagename eq node.exe"
tasklist /fi "imagename eq nginx.exe"
# Both should return: INFO: No tasks are running which match the specified criteria.
```

### Step 2: Create Logs Directory

```powershell
# Create logs directory for backend
New-Item -ItemType Directory -Force -Path "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs"
```

---

## Part 3: Install Backend Service

### Step 1: Find Node.js Path

```powershell
# Get the exact path to node.exe
where.exe node
# Example output: C:\Program Files\nodejs\node.exe
```

**Important:** Use the exact path shown in the output for the next step.

### Step 2: Install the Service

```powershell
# Install backend service (adjust node.exe path if different)
nssm install bsi-telemetry-reporting-backend "C:\Program Files\nodejs\node.exe" "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\server.js"
```

**Expected output:** `Service 'bsi-backend' installed successfully!`

### Step 3: Configure the Service

```powershell
# Set working directory
nssm set bsi-telemetry-reporting-backend AppDirectory "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend"

# Set display name and description
nssm set bsi-telemetry-reporting-backend DisplayName "BSI Telemetry Backend"
nssm set bsi-telemetry-reporting-backend Description "BSI Telemetry Backend API Server (Port 5000)"

# Set to auto-start on boot
nssm set bsi-telemetry-reporting-backend Start SERVICE_AUTO_START

# Configure logging
nssm set bsi-telemetry-reporting-backend AppStdout "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stdout.log"
nssm set bsi-telemetry-reporting-backend AppStderr "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stderr.log"

# Rotate logs (prevents log files from growing too large)
nssm set bsi-telemetry-reporting-backend AppStdoutCreationDisposition 4
nssm set bsi-telemetry-reporting-backend AppStderrCreationDisposition 4

# Set restart behavior (auto-restart on failure)
nssm set bsi-telemetry-reporting-backend AppExit Default Restart
nssm set bsi-telemetry-reporting-backend AppRestartDelay 5000
```

### Step 4: Start the Backend Service

```powershell
# Start the service
nssm start bsi-telemetry-reporting-backend

# Check status
nssm status bsi-telemetry-reporting-backend
# Should show: SERVICE_RUNNING

# Verify via Windows Services
Get-Service bsi-telemetry-reporting-backend
```

### Step 5: Test Backend

```powershell
# Wait a few seconds for startup
Start-Sleep -Seconds 5

# Test backend is responding
curl http://localhost:5000/api/nodes
# Expected: {"error":"Access denied. No token provided.","code":"NO_TOKEN"}
```

✅ If you see the error message above, the backend is working correctly!

---

## Part 4: Install Nginx Service

### Step 1: Install the Service

```powershell
# Install nginx service
nssm install bsi-telemetry-reporting-nginx "C:\nginx\current\nginx.exe"
```

**Expected output:** `Service 'bsi-nginx' installed successfully!`

### Step 2: Configure the Service

```powershell
# Set working directory
nssm set bsi-telemetry-reporting-nginx AppDirectory "C:\nginx\current"

# Set display name and description
nssm set bsi-telemetry-reporting-nginx DisplayName "BSI Telemetry Nginx"
nssm set bsi-telemetry-reporting-nginx Description "BSI Telemetry Nginx Reverse Proxy (Port 3010)"

# Set to auto-start on boot
nssm set bsi-telemetry-reporting-nginx Start SERVICE_AUTO_START

# Configure logging
nssm set bsi-telemetry-reporting-nginx AppStdout "C:\nginx\current\logs\service-stdout.log"
nssm set bsi-telemetry-reporting-nginx AppStderr "C:\nginx\current\logs\service-stderr.log"

# Rotate logs
nssm set bsi-telemetry-reporting-nginx AppStdoutCreationDisposition 4
nssm set bsi-telemetry-reporting-nginx AppStderrCreationDisposition 4

# Set restart behavior
nssm set bsi-telemetry-reporting-nginx AppExit Default Restart
nssm set bsi-telemetry-reporting-nginx AppRestartDelay 5000
```

### Step 3: Start the Nginx Service

```powershell
# Start the service
nssm start bsi-telemetry-reporting-nginx

# Check status
nssm status bsi-telemetry-reporting-nginx
# Should show: SERVICE_RUNNING

# Verify via Windows Services
Get-Service bsi-telemetry-reporting-nginx
```

### Step 4: Test Nginx

```powershell
# Wait a few seconds for startup
Start-Sleep -Seconds 5

# Test frontend
curl http://localhost:3010/
# Should return HTML content

# Test API proxy
curl http://localhost:3010/api/nodes
# Expected: {"error":"Access denied. No token provided.","code":"NO_TOKEN"}
```

✅ If you see HTML and the error message, nginx is working correctly!

---

## Part 5: Verify Everything

### Step 1: Check Both Services

```powershell
# List both services
Get-Service bsi-telemetry-reporting-backend, bsi-telemetry-reporting-nginx | Format-Table -AutoSize
```

**Expected output:**

```text
Status  Name                             DisplayName
------  ----                             -----------
Running bsi-telemetry-reporting-backend  BSI Telemetry Backend
Running bsi-telemetry-reporting-nginx    BSI Telemetry Nginx
```

### Step 2: Verify Auto-Start is Enabled

```powershell
# Check startup type
Get-Service bsi-telemetry-reporting-backend | Select-Object Name, StartType, Status
Get-Service bsi-telemetry-reporting-nginx | Select-Object Name, StartType, Status
```

**Both should show:**

- **StartType:** Automatic
- **Status:** Running

### Step 3: Test the Full Application

```powershell
# Test from local network
curl http://192.168.1.237:3010/

# Open in browser
start http://192.168.1.237:3010
```

✅ You should see the BSI Telemetry login page!

---

## Part 6: Service Management

### View Service Status

```powershell
# Check if services are running
nssm status bsi-telemetry-reporting-backend
nssm status bsi-telemetry-reporting-nginx

# Or use Windows Services
Get-Service bsi-telemetry-reporting-backend, bsi-telemetry-reporting-nginx
```

### Start Services

```powershell
nssm start bsi-telemetry-reporting-backend
nssm start bsi-telemetry-reporting-nginx

# Or use Windows Services
Start-Service bsi-telemetry-reporting-backend
Start-Service bsi-telemetry-reporting-nginx
```

### Stop Services

```powershell
nssm stop bsi-telemetry-reporting-backend
nssm stop bsi-telemetry-reporting-nginx

# Or use Windows Services
Stop-Service bsi-telemetry-reporting-backend
Stop-Service bsi-telemetry-reporting-nginx
```

### Restart Services

```powershell
nssm restart bsi-telemetry-reporting-backend
nssm restart bsi-telemetry-reporting-nginx

# Or use Windows Services
Restart-Service bsi-telemetry-reporting-backend
Restart-Service bsi-telemetry-reporting-nginx
```

### View Service Configuration

```powershell
# View all settings for a service
nssm dump bsi-telemetry-reporting-backend
nssm dump bsi-telemetry-reporting-nginx
```

### Edit Service (GUI)

```powershell
# Open NSSM GUI to edit service settings
nssm edit bsi-telemetry-reporting-backend
nssm edit bsi-telemetry-reporting-nginx
```

This opens a graphical interface where you can modify all service settings.

### View Logs

```powershell
# Backend logs
Get-Content "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stdout.log" -Tail 50
Get-Content "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stderr.log" -Tail 50

# Nginx logs
Get-Content "C:\nginx\current\logs\service-stdout.log" -Tail 50
Get-Content "C:\nginx\current\logs\access.log" -Tail 50
Get-Content "C:\nginx\current\logs\error.log" -Tail 50
```

### Open Windows Services Manager

```powershell
# Open services.msc
services.msc
```

Look for:

- **BSI Telemetry Backend**
- **BSI Telemetry Nginx**

---

## Part 7: Test Auto-Start on Reboot

### Option A: Restart the Server

```powershell
# Restart the computer
Restart-Computer

# After reboot, verify services started automatically
Get-Service bsi-telemetry-reporting-backend, bsi-telemetry-reporting-nginx
curl http://localhost:3010/
```

### Option B: Simulate Reboot (Without Restarting)

```powershell
# Stop both services
nssm stop bsi-telemetry-reporting-backend
nssm stop bsi-telemetry-reporting-nginx

# Verify they're stopped
Get-Service bsi-telemetry-reporting-backend, bsi-telemetry-reporting-nginx

# Start them again (simulates boot)
nssm start bsi-telemetry-reporting-backend
nssm start bsi-telemetry-reporting-nginx

# Verify they're running
Get-Service bsi-telemetry-reporting-backend, bsi-telemetry-reporting-nginx
curl http://localhost:3010/
```

---

## Troubleshooting

### Backend Service Fails to Start

**Check error logs:**

```powershell
Get-Content "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stderr.log" -Tail 50
```

**Common issues:**

1. **Wrong Node.js path**

   ```powershell
   # Verify Node.js path
   where.exe node
   
   # Update service if needed
   nssm set bsi-telemetry-reporting-backend Application "C:\Program Files\nodejs\node.exe"
   nssm restart bsi-telemetry-reporting-backend
   ```

2. **Missing .env file**

   ```powershell
   # Check .env exists
   Test-Path "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\.env"
   
   ```

3. **Database connection issue**
   - Check database credentials in `.env`
   - Verify MySQL is running
   - Test database connection manually

4. **Port 5000 already in use**

   ```powershell
   # Check what's using port 5000
   netstat -ano | findstr :5000
   ```

### Nginx Service Fails to Start

**Check error logs:**

```powershell
Get-Content "C:\nginx\current\logs\error.log" -Tail 50
```

**Common issues:**

1. **Port 3010 already in use**

   ```powershell
   # Check what's using port 3010
   netstat -ano | findstr :3010
   
   # Kill the process if needed (replace PID)
   taskkill /f /pid <PID>

   
   ```

2. **Config syntax error**

   ```powershell
   # Test nginx config
   C:\nginx\current\nginx.exe -t
   ```

3. **Missing frontend build**

   ```powershell
   # Check frontend build exists
   Test-Path "C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\frontend\build"
   ```

### Service Won't Auto-Start on Boot

**Check startup type:**

```powershell
Get-Service bsi-telemetry-reporting-backend | Select-Object Name, StartType
Get-Service bsi-telemetry-reporting-nginx | Select-Object Name, StartType
```

**Fix if not Automatic:**

```powershell
nssm set bsi-telemetry-reporting-backend Start SERVICE_AUTO_START
nssm set bsi-telemetry-reporting-nginx Start SERVICE_AUTO_START
```

### Remove and Reinstall a Service

**If a service is misconfigured:**

```powershell
# Stop and remove backend service
nssm stop bsi-telemetry-reporting-backend
nssm remove bsi-telemetry-reporting-backend confirm

# Stop and remove nginx service
nssm stop bsi-telemetry-reporting-nginx
nssm remove bsi-telemetry-reporting-nginx confirm

# Then reinstall following the steps in Part 3 and Part 4
```

### View Service Dependencies

```powershell
# Check if services have dependencies
Get-Service bsi-telemetry-reporting-backend | Select-Object -ExpandProperty DependentServices
Get-Service bsi-telemetry-reporting-backend | Select-Object -ExpandProperty ServicesDependedOn
```

### Check Windows Event Logs

```powershell
# View recent service errors
Get-EventLog -LogName System -Source "Service Control Manager" -Newest 20 | Where-Object {$_.Message -like "*bsi*"}
```

---

## Summary

After completing this guide, you will have:

✅ **Backend service** (`bsi-backend`) running on port 5000
✅ **Nginx service** (`bsi-nginx`) running on port 3010
✅ Both services set to **auto-start on boot**
✅ Both services configured to **auto-restart on failure**
✅ **Logging** enabled for troubleshooting
✅ Full application accessible at `http://192.168.1.237:3010`
✅ Services manageable via `services.msc` or PowerShell

## Quick Reference

### Service Names

- Backend: `bsi-backend`
- Nginx: `bsi-nginx`

### Ports

- Backend: `5000` (local network only)
- Nginx: `3010` (external access)

### Log Locations

- Backend stdout: `C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stdout.log`
- Backend stderr: `C:\Users\BSI\Documents\telemetry_reporting\Telemetry-Reporting\backend\logs\service-stderr.log`
- Nginx access: `C:\nginx\current\logs\access.log`
- Nginx error: `C:\nginx\current\logs\error.log`

### Common Commands

```powershell
# Start services
nssm start bsi-telemetry-reporting-backend
nssm start bsi-telemetry-reporting-nginx

# Stop services
nssm stop bsi-telemetry-reporting-backend
nssm stop bsi-telemetry-reporting-nginx

# Restart services
nssm restart bsi-telemetry-reporting-backend
nssm restart bsi-telemetry-reporting-nginx

# Check status
nssm status bsi-telemetry-reporting-backend
nssm status bsi-telemetry-reporting-nginx

# View configuration
nssm dump bsi-telemetry-reporting-backend
nssm dump bsi-telemetry-reporting-nginx

# Edit service (GUI)
nssm edit bsi-telemetry-reporting-backend
nssm edit bsi-telemetry-reporting-nginx
```

---

## Additional Resources

- [NSSM Official Documentation](https://nssm.cc/usage)
- [Windows Services Documentation](https://docs.microsoft.com/en-us/windows/win32/services/services)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

---

**Last Updated:** March 8, 2026
