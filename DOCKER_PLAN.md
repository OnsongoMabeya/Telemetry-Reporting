# Docker Conversion Plan for BSI Telemetry Reporting

## Overview

This document outlines the complete plan to containerize the BSI Telemetry Reporting project using Docker and Docker Compose.

### Key Specifications

- **Frontend Port:** `3010`
- **Backend Port:** `5000`
- **Database:** External (not containerized)
- **Architecture:** Backend (Node.js) + Frontend (React) only

---

## Phase 1: Preparation & Analysis

- **1.1** Audit project structure and dependencies
  - Review `backend/package.json` and `frontend/package.json`
  - Identify environment variables and configuration files
  - Document database schema and migration process
  - List all external services (WhatsApp, email, etc.)

- **1.2** Create Docker strategy document
  - Define container architecture (backend, frontend)
  - Plan networking and volume management
  - Outline environment variable handling

---

## Phase 2: Backend Containerization

- **2.1** Create `backend/Dockerfile`
  - Base image: `node:18-alpine` (lightweight)
  - Copy `package.json` and `package-lock.json`
  - Install dependencies with `npm ci`
  - Copy application code
  - Expose port `5000`
  - Set health check
  - Entry point: `npm start`

- **2.2** Create `backend/.dockerignore`
  - Exclude `node_modules`, `logs`, `.env`, `dist`, `.git`

- **2.3** Update `backend/server.js` for Docker
  - Read `DB_HOST` from environment (external database)
  - Ensure graceful shutdown handling
  - Add startup logging to confirm database connection

- **2.4** Create `backend/entrypoint.sh`
  - Run database migrations (`npm run db:setup`)
  - Start the server (`npm start`)
  - Handle startup failures gracefully

---

## Phase 3: Frontend Containerization

- **3.1** Create `frontend/Dockerfile` (multi-stage build)
  - **Stage 1 (Build):**
    - Base: `node:18-alpine`
    - Copy `package.json` and `package-lock.json`
    - Install dependencies
    - Copy source code
    - Build: `npm run build`
  - **Stage 2 (Runtime):**
    - Base: `nginx:alpine`
    - Copy built assets from Stage 1
    - Configure `nginx.conf` to proxy API requests to backend
    - Expose port `80` (mapped to `3010` in docker-compose)

- **3.2** Create `frontend/.dockerignore`
  - Exclude `node_modules`, `build`, `.git`, `.env.local`

- **3.3** Create `frontend/nginx.conf`
  - Serve static files from `/usr/share/nginx/html`
  - Proxy `/api/*` requests to `http://backend:5000`
  - Handle SPA routing (fallback to `index.html`)

- **3.4** Update `frontend/.env.docker`
  - Set `REACT_APP_API_BASE_URL=http://localhost:5000` (for local dev)
  - Or use relative paths `/api` for production

---

## Phase 4: ~~Database Containerization~~ SKIPPED

**Database is external and not containerized.**

---

## Phase 5: Docker Compose (Simplified)

Create root-level `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: bsi-backend
    environment:
      # External database connection
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      NODE_ENV: ${NODE_ENV:-production}
      # Optional: other env vars
      LOG_TO_CONSOLE: ${LOG_TO_CONSOLE:-true}
    ports:
      - "5000:5000"
    restart: unless-stopped
    networks:
      - bsi-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build: ./frontend
    container_name: bsi-frontend
    ports:
      - "3010:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - bsi-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

networks:
  bsi-network:
    driver: bridge
```

---

## Phase 6: Configuration for External Database

- **6.1** Create `.env.docker` template

  ```env
  # External Database Configuration
  DB_HOST=your-external-db-host.com
  DB_PORT=3306
  DB_USER=telemetry_user
  DB_PASSWORD=your_secure_password
  DB_NAME=horiserverlive
  NODE_ENV=production
  LOG_TO_CONSOLE=true
  ```

- **6.2** Create `.env.example`

  ```env
  # External Database (required)
  DB_HOST=your-database-host.example.com
  DB_PORT=3306
  DB_USER=telemetry_user
  DB_PASSWORD=change_me
  DB_NAME=horiserverlive
  NODE_ENV=production
  LOG_TO_CONSOLE=true
  ```

- **6.3** Update `backend/server.js`
  - Ensure it reads `DB_HOST` from environment
  - Add startup logging: "Connecting to external database at `${DB_HOST}:${DB_PORT}`"
  - Add retry logic for database connection (in case DB is temporarily unavailable)

- **6.4** Create `backend/db-wait.js` (optional)
  - Wait for external database to be available before starting server
  - Retry connection with exponential backoff

---

## Phase 7: Volumes & Persistence

- **7.1** Only persistent volume needed
  - `backend_logs`: Application logs (optional)

  ```yaml
  volumes:
    backend_logs:
  ```

- **7.2** No database backups needed in Docker
  - External database has its own backup strategy
  - Document: "Database backups are managed by your external database provider"

---

## Phase 8: Networking

- **8.1** Internal Docker network (`bsi-network`)
  - Frontend and backend communicate via service names
  - Frontend proxies API calls to `http://backend:5000`

- **8.2** External database connectivity
  - Backend connects to external DB via `DB_HOST` environment variable
  - Ensure firewall rules allow container → external DB connection

- **8.3** Port exposure
  - Frontend: `3010` (public)
  - Backend: `5000` (internal, accessed via frontend proxy)
  - Database: Not exposed (external)

---

## Phase 9: Health Checks

- **9.1** Backend health check

  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  ```

- **9.2** Frontend health check

  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:80/"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 20s
  ```

- **9.3** Remove MySQL health checks
  - Not applicable (external database)

---

## Phase 10: Development & Production Variants

- **10.1** Create `docker-compose.dev.yml`

  ```yaml
  version: '3.8'
  services:
    backend:
      build: ./backend
      environment:
        DB_HOST: ${DB_HOST:-localhost}
        DB_PORT: ${DB_PORT:-3306}
        DB_USER: ${DB_USER}
        DB_PASSWORD: ${DB_PASSWORD}
        DB_NAME: ${DB_NAME}
        NODE_ENV: development
        LOG_TO_CONSOLE: true
      ports:
        - "5000:5000"
      volumes:
        - ./backend:/app
        - /app/node_modules
      restart: unless-stopped
      networks:
        - bsi-network

    frontend:
      build: ./frontend
      ports:
        - "3010:80"
      volumes:
        - ./frontend:/app
        - /app/node_modules
      restart: unless-stopped
      networks:
        - bsi-network

  networks:
    bsi-network:
      driver: bridge
  ```

- **10.2** Create `docker-compose.prod.yml`
  - Same as main `docker-compose.yml`
  - Use optimized images
  - No volume mounts
  - Stricter resource limits

---

## Phase 11: CI/CD Integration

- **11.1** Update `Makefile`

  ```makefile
  build: 
    docker-compose build

  up: 
    docker-compose up -d

  down:
    docker-compose down

  logs:
    docker-compose logs -f

  dev:
    docker-compose -f docker-compose.dev.yml up

  dev-down:
    docker-compose -f docker-compose.dev.yml down

  restart:
    docker-compose restart

  clean:
    docker-compose down -v
  ```

---

## Phase 12: Documentation

- **12.1** Create `DOCKER.md`
  
  ```markdown
  # Docker Setup Guide

  ## Prerequisites
  - Docker 20.10+
  - Docker Compose 1.29+
  - External MySQL database (configured and accessible)

  ## Quick Start

  1. **Configure environment:**
     ```bash
     cp .env.example .env.docker
     # Edit .env.docker with your external database details
     ```

  1. **Build and start:**

     ```bash
     docker-compose --env-file .env.docker up -d
     ```

  2. **Access the application:**

     - Frontend: <http://localhost:3010>
     - Backend API: <http://localhost:5000>

  3. **View logs:**

     ```bash
     docker-compose logs -f
     ```

  ## Database Migrations

  Run migrations on the external database before starting containers:

  ```bash
  # From your local machine
  npm run db:setup
  ```

  Or run inside the backend container:

  ```bash
  docker-compose exec backend npm run db:setup
  ```

  ## Development

  Use the development compose file with hot-reload:

  ```bash
  docker-compose -f docker-compose.dev.yml up
  ```

  ## Stopping

  ```bash
  docker-compose down
  ```

  ## Troubleshooting

  - **Backend can't connect to database:**
    - Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env.docker
    - Ensure external database is accessible from Docker network
    - Check firewall rules

  - **Frontend can't reach backend:**
    - Verify nginx.conf proxies to <http://backend:5000>
    - Check docker-compose network configuration

---

## Updated File Structure

```bash
project-root/
├── docker-compose.yml              # Production
├── docker-compose.dev.yml          # Development
├── .env.example                    # Template (commit to repo)
├── .env.docker                     # Local config (don't commit)
├── Makefile
├── DOCKER.md
├── DOCKER_PLAN.md                  # This file
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── entrypoint.sh
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── nginx.conf
└── scripts/
    └── deploy.sh
```

---

## Implementation Order

1. **Phase 1:** Preparation & Analysis (unchanged)
2. **Phase 2:** Backend Containerization (unchanged)
3. **Phase 3:** Frontend Containerization (update port to 3010)
4. **Phase 4:** ~~Database Containerization~~ **SKIP**
5. **Phase 5:** Docker Compose (simplified, no MySQL)
6. **Phase 6:** External Database Configuration
7. **Phase 7:** Volumes (minimal)
8. **Phase 8:** Networking (simplified)
9. **Phase 9:** Health Checks (backend + frontend only)
10. **Phase 10:** Dev/Prod Variants
11. **Phase 11:** CI/CD Integration
12. **Phase 12:** Documentation

---

## Success Criteria

✅ All services start with `docker-compose up`  
✅ Frontend accessible at `http://localhost:3010`  
✅ Backend accessible at `http://localhost:5000`  
✅ Backend connects to external database  
✅ API calls work end-to-end  
✅ Logs are viewable via `docker-compose logs`  
✅ Development and production variants work  
✅ No database containers in Docker  

---

## Quick Reference Commands

```bash
# Build images
docker-compose build

# Start services (production)
docker-compose --env-file .env.docker up -d

# Start services (development)
docker-compose -f docker-compose.dev.yml up

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Run database migrations
docker-compose exec backend npm run db:setup

# Restart services
docker-compose restart

# Clean up (remove containers and volumes)
docker-compose down -v
```

---

## Notes

- Database is **external** and managed separately
- Frontend is accessed via port **3010**
- Backend is accessed via port **5000** (internal to frontend)
- All database credentials must be provided via `.env.docker`
- Ensure external database is accessible from Docker containers
- Use `docker-compose.dev.yml` for local development with hot-reload
- Use main `docker-compose.yml` for production deployments

---

**Last Updated:** August 10, 2026  
**Status:** Ready for Implementation
