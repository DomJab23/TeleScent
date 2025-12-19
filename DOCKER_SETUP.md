# TeleScent Docker Setup

This Docker setup runs the entire TeleScent backend with database initialization and optional ngrok tunneling in a single command.

## Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose installed
- (Optional) ngrok account and authtoken for public URL tunneling

### Run Everything with One Command

**Without ngrok tunneling:**
```bash
docker-compose up --build
```

**With ngrok tunneling (requires authtoken):**
```bash
NGROK_AUTHTOKEN=your-authtoken docker-compose up --build
```

This single command will:
1. ✅ Build the Docker image with all dependencies
2. ✅ Initialize the SQLite database
3. ✅ Start the Node.js server on port 5001
4. ✅ (Optional) Start ngrok tunnel for public access

### What Happens

1. **Database Setup**: The initialization script:
   - Connects to SQLite database
   - Syncs database schema
   - Creates tables if needed

2. **Server Starts**: Node.js server runs on port 5001 with:
   - Express API endpoints
   - CORS enabled
   - Frontend build serving (if available)
   - Prediction service

3. **ngrok Tunnel** (optional): Creates a public URL for your local server:
   - Requires an authtoken (get one at https://ngrok.com)
   - Access the ngrok web UI at `http://localhost:4040`
   - Your public URL will be displayed in the console

### Accessing Your Application

1. **Local Access**: `http://localhost:5001`
2. **API Endpoints**:
   - `http://localhost:5001/api` - API status
   - `http://localhost:5001/api/auth/login` - Login endpoint
   - `http://localhost:5001/api/sensor-data` - Sensor data endpoints
   - `http://localhost:5001/api/predictions` - Predictions endpoints
3. **ngrok Web UI** (if enabled): `http://localhost:4040` (inspect requests, sessions, etc.)

### Login Credentials

- **Username**: `admin`
- **Password**: `admin`

### Getting ngrok Authtoken

1. Go to https://ngrok.com and create a free account
2. Navigate to https://dashboard.ngrok.com/auth/your-authtoken
3. Copy your authtoken
4. Run with: `NGROK_AUTHTOKEN=your-token docker-compose up --build`

### Stop the Services

```bash
docker-compose down
```

To also remove volumes (database):
```bash
docker-compose down -v
```

### Rebuild (if you made code changes)

```bash
docker-compose up --build
```

### View Logs

```bash
docker-compose logs -f telescent-backend
```

### Common Issues

**Port Already in Use**
If port 5001 or 4040 is already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "5002:5001"    # Change left side to your desired port
  - "4041:4040"
```

**Database Not Initializing**
The database file persists in `TeleScent/backend/database.sqlite`. If you want a fresh start:
```bash
docker-compose down -v
docker-compose up --build
```

**ngrok Connection Issues**
Ensure your internet connection is stable. The ngrok tunnel requires connectivity to the ngrok servers.

## Architecture

```
docker-compose up --build
         ↓
    Builds Dockerfile
         ↓
    Creates Container with:
    ├── Node.js 18 (slim variant)
    ├── Build tools (python, gcc, g++, make)
    ├── ngrok binary
    └── Backend code
         ↓
    Runs entrypoint.sh:
    ├── Initialize database schema
    ├── Start Node.js Express server (port 5001)
    └── (Optional) Start ngrok tunnel
```

## Environment Variables

To customize, set these before running docker-compose:

```bash
# With ngrok authtoken for tunneling
export NGROK_AUTHTOKEN="your-ngrok-authtoken"

# Or set NODE_ENV to development
export NODE_ENV=development

docker-compose up --build
```

## Production Notes

- The database (SQLite) is persisted in `./TeleScent/backend/database.sqlite`
- For production, consider using a proper database like PostgreSQL
- Add authentication/security headers as needed
- Configure CORS properly for your domain
- Set NODE_ENV to production for security
