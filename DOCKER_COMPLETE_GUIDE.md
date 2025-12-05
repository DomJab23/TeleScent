# TeleScent Complete Docker Guide

**Status:** ✅ Production Ready  
**Date:** December 1, 2025  
**Version:** 1.0

---

## Overview

This Docker setup runs **everything in one place**:
- ✅ Backend API Server (Node.js/Express)
- ✅ Frontend React App (served by backend)
- ✅ ngrok Tunnel (internet access)
- ✅ ML Service (Python - optional)
- ✅ Database (SQLite, with PostgreSQL option)

All services are orchestrated with Docker Compose and managed with a single shell script.

---

## Prerequisites

### Required
- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
  - Download: https://www.docker.com/products/docker-desktop
  - Version: 20.10+ recommended

### Optional
- **ngrok** account for internet access (free tier available)
  - Sign up: https://ngrok.com
  - Get auth token from: https://dashboard.ngrok.com/auth/your-authtoken

---

## Files Created

1. **`docker-compose.complete.yml`**
   - Complete Docker Compose configuration
   - All services defined
   - Networks and volumes configured
   - Health checks included

2. **`docker-complete.sh`**
   - Comprehensive management script
   - Start, stop, restart, monitor services
   - View logs, access shells
   - Build and rebuild images

3. **`ml/Dockerfile.ml`**
   - ML service containerization
   - Python 3.11 base
   - All dependencies included

4. **`DOCKER_COMPLETE_GUIDE.md`**
   - This file
   - Complete documentation

---

## Quick Start

### 1. Make Script Executable
```bash
chmod +x docker-complete.sh
```

### 2. Set up ngrok (Optional but Recommended)
```bash
# Get your ngrok auth token from: https://dashboard.ngrok.com/auth/your-authtoken

# Set the token
bash docker-complete.sh ngrok-token YOUR_AUTH_TOKEN_HERE

# Or export as environment variable
export NGROK_AUTH_TOKEN="your_auth_token_here"
```

### 3. Start All Services
```bash
bash docker-complete.sh start
```

### 4. View Status
```bash
bash docker-complete.sh status
```

### 5. Access Services

**Backend API:**
- Local: http://localhost:5000
- Public: https://your-ngrok-url.ngrok-free.dev

**Frontend:**
- Local: http://localhost:5000
- Public: https://your-ngrok-url.ngrok-free.dev

**ngrok Dashboard:**
- http://localhost:4040

---

## Commands

### Service Management

**Start all services:**
```bash
bash docker-complete.sh start
```

**Stop all services:**
```bash
bash docker-complete.sh stop
```

**Restart all services:**
```bash
bash docker-complete.sh restart
```

**Show service status:**
```bash
bash docker-complete.sh status
```

**Check service health:**
```bash
bash docker-complete.sh health
```

### Logging

**View all logs (streaming):**
```bash
bash docker-complete.sh logs
```

**View backend logs only:**
```bash
bash docker-complete.sh logs-backend
```

**View ngrok logs:**
```bash
bash docker-complete.sh logs-ngrok
```

**View ML service logs:**
```bash
bash docker-complete.sh logs-ml
```

### Container Access

**Open shell in backend container:**
```bash
bash docker-complete.sh shell-backend
```

**View ngrok tunnel status:**
```bash
bash docker-complete.sh shell-ngrok
```

**Open shell in ML container:**
```bash
bash docker-complete.sh shell-ml
```

### Building

**Build all services:**
```bash
bash docker-complete.sh build
```

**Rebuild all services (no cache):**
```bash
bash docker-complete.sh rebuild
```

### Cleanup

**Stop and remove containers:**
```bash
bash docker-complete.sh down
```

**Deep clean (remove containers, volumes, images):**
```bash
bash docker-complete.sh clean
```

### Configuration

**Set ngrok auth token:**
```bash
bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE
```

**Initial setup:**
```bash
bash docker-complete.sh setup
```

### Help

**Show all commands:**
```bash
bash docker-complete.sh --help
```

---

## Services

### Backend API
- **Container:** `telescent-backend`
- **Port:** 5000 (internal) → 5000 (host)
- **Image:** Node.js 18-Alpine
- **Volumes:** SQLite database, logs
- **Health Check:** Every 30 seconds
- **Status:** Essential

### Frontend React App
- **Container:** Served by backend
- **Port:** 5000 (same as backend)
- **Build:** Built during Docker build phase
- **Status:** Essential

### ngrok Tunnel
- **Container:** `telescent-ngrok`
- **Port:** 4040 (web interface) → 4040 (host)
- **Image:** ngrok/ngrok:latest
- **Environment:** NGROK_AUTHTOKEN
- **Purpose:** Public internet access
- **Status:** Optional but recommended

### ML Service
- **Container:** `telescent-ml`
- **Port:** 5001 (internal) → 5001 (host)
- **Image:** Python 3.11-Slim
- **Volumes:** Models, data, logs
- **Profile:** `ml` (optional)
- **Status:** Optional

---

## Networks & Volumes

### Networks
```
telescent-network
├── backend
├── ngrok
└── ml
```

All containers communicate through this bridge network.

### Volumes
```
backend_logs      - Backend application logs
ml_logs          - ML service logs
db_data          - SQLite database (persisted)
postgres_data    - PostgreSQL data (if enabled)
```

---

## Environment Variables

### Backend
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=telescent-production-secret-change-this-in-production
DB_PATH=/app/backend/database.sqlite
```

### ngrok
```env
NGROK_AUTHTOKEN=your_token_here
```

### ML Service
```env
FLASK_ENV=production
FLASK_PORT=5001
```

---

## Configuration

### Backend Configuration

Edit environment variables in `docker-compose.complete.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=5000
  - JWT_SECRET=your-secret-here  # CHANGE THIS!
  - DB_PATH=/app/backend/database.sqlite
```

### ngrok Configuration

Set your auth token:

```bash
# Option 1: Use management script
bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE

# Option 2: Export environment variable
export NGROK_AUTH_TOKEN="your_token_here"

# Option 3: Create .env file
echo "NGROK_AUTH_TOKEN=your_token_here" > .env.ngrok
```

### ML Service Configuration

Edit `ml/Dockerfile.ml` and `docker-compose.complete.yml` as needed.

---

## Database

### SQLite (Default)
- **File:** `backend/database.sqlite`
- **Persisted:** Yes (volume)
- **Auto-created:** Yes
- **Backup:** Simple file copy

### PostgreSQL (Optional)

To use PostgreSQL instead of SQLite:

1. Uncomment PostgreSQL service in `docker-compose.complete.yml`
2. Update backend environment variables
3. Update backend code to use PostgreSQL connection string
4. Run: `bash docker-complete.sh rebuild`

---

## Monitoring & Debugging

### View Container Status
```bash
bash docker-complete.sh status
```

### Check Service Health
```bash
bash docker-complete.sh health
```

### Stream Logs
```bash
# All services
bash docker-complete.sh logs

# Specific service
bash docker-complete.sh logs-backend
bash docker-complete.sh logs-ngrok
bash docker-complete.sh logs-ml
```

### Access Container Shell
```bash
bash docker-complete.sh shell-backend
```

### View ngrok Tunnel
```bash
bash docker-complete.sh shell-ngrok
# Or open: http://localhost:4040
```

---

## Troubleshooting

### Docker Daemon Not Running
```
❌ Error: Cannot connect to Docker daemon

Solution:
- Start Docker Desktop (Windows/Mac)
- Or: sudo systemctl start docker (Linux)
```

### Port Already in Use
```
❌ Error: bind: address already in use

Solution:
- Stop other services using the ports
- Or: Change ports in docker-compose.complete.yml
```

### ngrok Tunnel Not Establishing
```
❌ Error: Failed to establish tunnel

Solution:
- Check NGROK_AUTH_TOKEN is set correctly
- Verify ngrok account is active
- Check internet connection
```

### Backend Not Starting
```
❌ Error: Backend container exits immediately

Solution:
- Check logs: bash docker-complete.sh logs-backend
- Check Node.js dependencies: bash docker-complete.sh rebuild
- Verify database permissions
```

### Build Failures
```
❌ Error: Docker build fails

Solution:
- Check internet connection
- Rebuild without cache: bash docker-complete.sh rebuild
- Verify Docker has enough disk space
```

---

## Performance Optimization

### Memory Management
```yaml
services:
  backend:
    mem_limit: 1g
    memswap_limit: 1g
```

### CPU Limits
```yaml
services:
  backend:
    cpus: '1.0'
    cpu_shares: 1024
```

### Storage Optimization
```bash
# Clean up unused images
docker image prune -a

# Clean up unused volumes
docker volume prune

# View disk usage
docker system df
```

---

## Production Deployment

### Before Production

1. **Change JWT Secret**
   ```yaml
   JWT_SECRET=your-very-secure-random-string-here
   ```

2. **Set up ngrok Pro** (for stable URL)
   - Free tier: URL changes on restart
   - Pro tier: Stable custom URL

3. **Enable HTTPS**
   - ngrok provides automatic HTTPS
   - Verify certificate is valid

4. **Set up backup**
   ```bash
   # Backup database
   docker cp telescent-backend:/app/backend/database.sqlite ./backup/
   ```

5. **Monitor logs**
   ```bash
   bash docker-complete.sh logs -f
   ```

### Production Commands

**Start in background:**
```bash
bash docker-complete.sh start
disown
```

**Monitor status regularly:**
```bash
bash docker-complete.sh health
```

**Auto-restart on failure:**
- Already configured with `restart: unless-stopped`
- Docker will restart containers automatically

---

## Scaling

### Running Multiple Containers

To run multiple instances of backend:

```yaml
services:
  backend:
    deploy:
      replicas: 3
    ports:
      - "5000-5002:5000"
```

Then use a reverse proxy (nginx, etc.) to load balance.

---

## Backup & Restore

### Backup Database
```bash
docker cp telescent-backend:/app/backend/database.sqlite ./backup/database-$(date +%Y%m%d).sqlite
```

### Backup Volumes
```bash
docker run --rm -v backend_logs:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/backend_logs.tar.gz /data
```

### Restore Database
```bash
docker cp ./backup/database.sqlite telescent-backend:/app/backend/database.sqlite
docker-compose -f docker-compose.complete.yml restart backend
```

---

## Advanced Usage

### Custom Docker Network
```bash
docker network create telescent-custom
docker-compose -f docker-compose.complete.yml --network telescent-custom up
```

### Run Specific Service
```bash
# Only start backend
docker-compose -f docker-compose.complete.yml up backend -d

# Only start ngrok
docker-compose -f docker-compose.complete.yml up ngrok -d
```

### Execute Commands in Container
```bash
# Run npm command
docker exec telescent-backend npm test

# Run Python script
docker exec telescent-ml python script.py

# Check Node version
docker exec telescent-backend node --version
```

---

## Updating Services

### Update Backend Code
```bash
# Make code changes
# Then rebuild and restart
bash docker-complete.sh rebuild
bash docker-complete.sh restart
```

### Update Dependencies
```bash
# Edit package.json or requirements.txt
# Then rebuild
bash docker-complete.sh rebuild
```

### Update Images
```bash
# Pull latest base images
docker pull node:18-alpine
docker pull python:3.11-slim
docker pull ngrok/ngrok:latest

# Rebuild
bash docker-complete.sh rebuild
```

---

## Stopping & Cleanup

### Stop Services
```bash
bash docker-complete.sh stop
```

### Remove Containers
```bash
bash docker-complete.sh down
```

### Full Cleanup
```bash
bash docker-complete.sh clean
```

---

## Support & Resources

### Docker Documentation
- [Docker Official Docs](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### ngrok Documentation
- [ngrok Dashboard](https://dashboard.ngrok.com/)
- [ngrok Documentation](https://ngrok.com/docs)
- [ngrok Docker Image](https://hub.docker.com/r/ngrok/ngrok)

### TeleScent Documentation
- `ARDUINO_IMPLEMENTATION.md` - Arduino integration
- `HARDWARE_API_GUIDE.md` - API reference
- `HARDWARE_API_TEST_RESULTS.md` - Test results

---

## Summary

You now have:
- ✅ Complete Docker setup for all services
- ✅ Single command management script
- ✅ Automated health checks
- ✅ Logging and monitoring tools
- ✅ Easy deployment and scaling
- ✅ Production-ready configuration

**Next steps:**
1. Make script executable: `chmod +x docker-complete.sh`
2. Set ngrok token: `bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE`
3. Start services: `bash docker-complete.sh start`
4. View logs: `bash docker-complete.sh logs`
5. Access dashboard: `http://localhost:4040`

---

**Last Updated:** December 1, 2025  
**Status:** Production Ready ✅
