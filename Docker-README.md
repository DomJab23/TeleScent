# TeleScent Docker Setup

This Docker setup builds both the React frontend and Node.js backend into a single container.

## Quick Start

### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```

### Using Docker directly
```bash
# Build the image
docker build -t telescent .

# Run the container
docker run -p 8080:5000 telescent
```

## Access the Application

Once running, access the application at: http://localhost:8080

- The frontend React app will be served at the root `/`
- The backend API is available at `/api`

## Architecture

- **Frontend**: React app built for production and served as static files
- **Backend**: Express.js server that serves both the API and the frontend
- **Port**: Single port 5000 for both frontend and backend

## Development vs Production

- **Development**: Run frontend and backend separately with `npm start`
- **Production**: Use Docker to run everything together

## Commands

```bash
# Build and run with docker-compose
docker-compose up --build

# Run in background
docker-compose up -d

# Stop the container
docker-compose down

# View logs
docker-compose logs -f
```