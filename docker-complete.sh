#!/bin/bash

# TeleScent Complete Docker Setup Script
# Manages all services: Backend, Frontend, ngrok, ML
# Version: 1.0 - December 1, 2025

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.complete.yml"
PROJECT_NAME="telescent"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Functions
print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${CYAN}ℹ️  $1${NC}"
}

# Check if Docker is installed
check_docker() {
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Download from: https://www.docker.com/products/docker-desktop"
    exit 1
  fi
  print_success "Docker is installed"
}

# Check if Docker daemon is running
check_docker_daemon() {
  if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running!"
    echo "Start Docker Desktop or the Docker daemon and try again."
    exit 1
  fi
  print_success "Docker daemon is running"
}

# Show usage
show_usage() {
  cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║              🚀 TeleScent Complete Docker Management                  ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

USAGE:
  bash docker-complete.sh [command] [options]

COMMANDS:
  start              Start all services (Backend, Frontend, ngrok, ML)
  stop               Stop all services
  restart            Restart all services
  status             Show status of all services
  logs               Show logs from all services
  logs-backend       Show logs from backend only
  logs-ngrok         Show logs from ngrok tunnel
  logs-ml            Show logs from ML service (if running)
  shell-backend      Open shell in backend container
  shell-ngrok        Show ngrok tunnel status
  shell-ml           Open shell in ML container
  build              Build all services
  rebuild            Rebuild all services (no cache)
  down               Stop and remove all containers
  clean              Remove all containers, volumes, and images
  ngrok-token        Set ngrok auth token
  setup              Initial setup and configuration
  health             Check health of all services

OPTIONS:
  -v, --verbose      Show more detailed output
  -q, --quiet        Suppress most output
  --profile ml       Include ML service
  --no-color         Disable colored output

EXAMPLES:
  # Start all services
  bash docker-complete.sh start

  # View logs from backend
  bash docker-complete.sh logs-backend

  # Restart everything
  bash docker-complete.sh restart

  # Check status
  bash docker-complete.sh status

  # Set ngrok token and start
  bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE
  bash docker-complete.sh start

═════════════════════════════════════════════════════════════════════════

SERVICES:
  • Backend API         on port 5000
  • Frontend (via API)  on port 5000
  • ngrok Tunnel        on port 4040 (web interface)
  • ML Service          on port 5001 (optional, use --profile ml)

API ENDPOINTS:
  • Local:  http://localhost:5000
  • Public: https://your-ngrok-url.ngrok-free.dev

DOCUMENTATION:
  See: DOCKER_COMPLETE_GUIDE.md

═════════════════════════════════════════════════════════════════════════

EOF
}

# Start services
start_services() {
  print_header "🚀 Starting TeleScent Services"
  
  # Check for ngrok token
  if [ -z "$NGROK_AUTH_TOKEN" ]; then
    print_warning "NGROK_AUTH_TOKEN not set"
    print_info "Set it with: export NGROK_AUTH_TOKEN=your_token_here"
    print_info "Or run: bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE"
  fi
  
  print_info "Starting Docker containers..."
  
  if [ "$INCLUDE_ML" = "true" ]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" up -d --profile ml
  else
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" up -d
  fi
  
  if [ $? -eq 0 ]; then
    print_success "All services started!"
  else
    print_error "Failed to start services"
    exit 1
  fi
  
  # Wait for services to start
  echo ""
  print_info "Waiting for services to be ready..."
  sleep 5
  
  # Check health
  check_health
  
  print_info "View ngrok web interface: http://localhost:4040"
  print_info "View logs: bash docker-complete.sh logs"
  print_info "Stop services: bash docker-complete.sh stop"
}

# Stop services
stop_services() {
  print_header "⛔ Stopping TeleScent Services"
  
  print_info "Stopping Docker containers..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" down
  
  if [ $? -eq 0 ]; then
    print_success "All services stopped"
  else
    print_error "Failed to stop services"
    exit 1
  fi
}

# Restart services
restart_services() {
  print_header "🔄 Restarting TeleScent Services"
  
  stop_services
  echo ""
  start_services
}

# Show status
show_status() {
  print_header "📊 TeleScent Services Status"
  
  echo ""
  docker ps -a --filter "label=com.telescent.service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  
  echo ""
  print_info "Detailed status:"
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" ps
}

# Show logs
show_logs() {
  print_header "📋 TeleScent Services Logs"
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" logs -f --tail=100
}

# Show backend logs
show_backend_logs() {
  print_header "📋 Backend Logs"
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" logs -f backend --tail=100
}

# Show ngrok logs
show_ngrok_logs() {
  print_header "📋 ngrok Tunnel Logs"
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" logs -f ngrok --tail=100
}

# Show ML logs
show_ml_logs() {
  print_header "📋 ML Service Logs"
  
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" logs -f ml --tail=100
}

# Open shell in backend
shell_backend() {
  print_header "🔧 Backend Container Shell"
  
  docker exec -it telescent-backend /bin/sh
}

# Show ngrok status
shell_ngrok() {
  print_header "🌐 ngrok Tunnel Status"
  
  print_info "Opening ngrok web interface: http://localhost:4040"
  echo ""
  echo "Features:"
  echo "  • View tunnel URL and traffic"
  echo "  • Inspect HTTP requests"
  echo "  • View response headers"
  echo "  • Monitor bandwidth"
  echo ""
  print_info "Or view logs: bash docker-complete.sh logs-ngrok"
}

# Open shell in ML container
shell_ml() {
  print_header "🤖 ML Container Shell"
  
  docker exec -it telescent-ml /bin/bash
}

# Build services
build_services() {
  print_header "🔨 Building Services"
  
  print_info "Building Docker images..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" build
  
  if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
  else
    print_error "Build failed"
    exit 1
  fi
}

# Rebuild services (no cache)
rebuild_services() {
  print_header "🔨 Rebuilding Services (No Cache)"
  
  print_warning "This will rebuild images without using cache"
  print_info "Building Docker images..."
  docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" build --no-cache
  
  if [ $? -eq 0 ]; then
    print_success "Rebuild completed successfully"
  else
    print_error "Rebuild failed"
    exit 1
  fi
}

# Remove all containers
down_services() {
  print_header "🗑️  Removing Containers"
  
  print_warning "This will stop and remove all containers"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" down
    print_success "Containers removed"
  else
    print_info "Cancelled"
  fi
}

# Clean everything
clean_services() {
  print_header "🧹 Deep Clean"
  
  print_warning "This will remove ALL containers, volumes, and images"
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p "$PROJECT_NAME" down -v
    print_success "Cleanup completed"
  else
    print_info "Cancelled"
  fi
}

# Set ngrok token
set_ngrok_token() {
  if [ -z "$1" ]; then
    print_error "Please provide ngrok auth token"
    echo "Usage: bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE"
    exit 1
  fi
  
  export NGROK_AUTH_TOKEN="$1"
  
  # Save to .env file
  echo "NGROK_AUTH_TOKEN=$1" > .env.ngrok
  
  print_success "ngrok token set"
  print_info "Token will be used on next start"
}

# Initial setup
setup() {
  print_header "🔧 TeleScent Docker Setup"
  
  print_info "Checking requirements..."
  check_docker
  check_docker_daemon
  
  print_success "All requirements met!"
  
  echo ""
  print_info "Optional: Set up ngrok for internet access"
  echo "1. Get ngrok auth token: https://dashboard.ngrok.com/auth/your-authtoken"
  echo "2. Run: bash docker-complete.sh ngrok-token YOUR_TOKEN_HERE"
  echo ""
  
  print_info "To start TeleScent:"
  echo "  bash docker-complete.sh start"
  
  print_info "To view logs:"
  echo "  bash docker-complete.sh logs"
  
  print_info "To check status:"
  echo "  bash docker-complete.sh status"
}

# Check health
check_health() {
  print_header "🏥 Checking Service Health"
  
  echo ""
  
  # Check backend
  if curl -s http://localhost:5000/api > /dev/null 2>&1; then
    print_success "Backend API: Healthy"
  else
    print_warning "Backend API: Not yet responding (might still be starting)"
  fi
  
  # Check ngrok
  if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -oP '"public_url":"\K[^"]+' | head -1)
    if [ -n "$NGROK_URL" ]; then
      print_success "ngrok Tunnel: Active at $NGROK_URL"
    else
      print_warning "ngrok: Running but no tunnel established yet"
    fi
  else
    print_warning "ngrok: Not yet responding"
  fi
  
  echo ""
}

# Parse arguments
INCLUDE_ML=false

while [[ $# -gt 0 ]]; do
  case $1 in
    start)
      start_services
      exit 0
      ;;
    stop)
      stop_services
      exit 0
      ;;
    restart)
      restart_services
      exit 0
      ;;
    status)
      show_status
      exit 0
      ;;
    logs)
      show_logs
      exit 0
      ;;
    logs-backend)
      show_backend_logs
      exit 0
      ;;
    logs-ngrok)
      show_ngrok_logs
      exit 0
      ;;
    logs-ml)
      show_ml_logs
      exit 0
      ;;
    shell-backend)
      shell_backend
      exit 0
      ;;
    shell-ngrok)
      shell_ngrok
      exit 0
      ;;
    shell-ml)
      shell_ml
      exit 0
      ;;
    build)
      build_services
      exit 0
      ;;
    rebuild)
      rebuild_services
      exit 0
      ;;
    down)
      down_services
      exit 0
      ;;
    clean)
      clean_services
      exit 0
      ;;
    ngrok-token)
      set_ngrok_token "$2"
      exit 0
      ;;
    setup)
      setup
      exit 0
      ;;
    health)
      check_health
      exit 0
      ;;
    --profile)
      if [ "$2" = "ml" ]; then
        INCLUDE_ML=true
      fi
      shift 2
      ;;
    -h|--help|help)
      show_usage
      exit 0
      ;;
    *)
      print_error "Unknown command: $1"
      echo "Run: bash docker-complete.sh --help"
      exit 1
      ;;
  esac
done

# If no arguments, show usage
show_usage
