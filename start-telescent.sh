#!/bin/bash

# TeleScent Startup Script
# One command to rule them all!

set -e  # Exit on error

echo "🚀 Starting TeleScent with Docker..."
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if ML model exists
if [ ! -f "ml/model/scent_pipeline.joblib" ]; then
    echo "⚠️  Warning: ML model not found at ml/model/scent_pipeline.joblib"
    echo "   The ML prediction feature will not work until you train the model."
    echo "   Run the Jupyter notebook in ml/scentdetection.ipynb to train the model."
    echo ""
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose-ml.yml down 2>/dev/null || true

# Build and start services
echo ""
echo "🔨 Building Docker images (this may take a few minutes)..."
docker-compose -f docker-compose-ml.yml build

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose-ml.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker ps | grep -q "telescent-backend"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend failed to start"
    docker-compose -f docker-compose-ml.yml logs backend
    exit 1
fi

if docker ps | grep -q "telescent-frontend"; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend failed to start"
    docker-compose -f docker-compose-ml.yml logs frontend
    exit 1
fi

echo ""
echo "================================================"
echo "🎉 TeleScent is now running!"
echo "================================================"
echo ""
echo "📊 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:5000/api"
echo "📈 Sensor Data Page: http://localhost:3000/sensor-data"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose -f docker-compose-ml.yml logs -f"
echo "  Stop services:    docker-compose -f docker-compose-ml.yml down"
echo "  Restart:          docker-compose -f docker-compose-ml.yml restart"
echo "  Backend logs:     docker-compose -f docker-compose-ml.yml logs -f backend"
echo "  Frontend logs:    docker-compose -f docker-compose-ml.yml logs -f frontend"
echo ""
echo "To send test sensor data:"
echo "  curl -X POST http://localhost:5000/api/sensor-data \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"device_id\":\"test\",\"gas\":1.15,\"voc_raw\":24218,\"nox_raw\":14243,\"no2\":788,\"ethanol\":913,\"voc\":889,\"co_h2\":513}'"
echo ""
