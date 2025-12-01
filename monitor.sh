#!/bin/bash

# TeleScent - Monitoring and Troubleshooting Script

echo "🔍 TeleScent Monitoring & Diagnostics"
echo "====================================="
echo ""

# Function to check if Docker container is running
check_container() {
    if docker ps | grep -q telescent-app; then
        echo "✅ Container is running"
        echo ""
        
        # Show container info
        docker ps | grep telescent-app
        echo ""
    else
        echo "❌ Container is not running"
        echo "   Start with: docker-compose up"
        return 1
    fi
}

# Function to check server health
check_health() {
    echo "Checking server health..."
    if curl -s http://localhost:5000/health > /dev/null; then
        echo "✅ Server is responding"
        curl -s http://localhost:5000/health | jq . 2>/dev/null || curl -s http://localhost:5000/health
        echo ""
    else
        echo "❌ Server is not responding"
        echo "   Check if: docker-compose up is running"
        echo "   Check logs: docker logs telescent-app"
        return 1
    fi
}

# Function to show container logs
show_logs() {
    echo "📋 Recent logs (last 50 lines):"
    echo "================================"
    docker logs --tail 50 telescent-app 2>/dev/null || echo "No logs available"
    echo ""
}

# Function to check network connectivity
check_network() {
    echo "🌐 Network Information:"
    echo "======================"
    
    # Get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo "Local IP: $LOCAL_IP:8080"
    
    # Get public IP (if available)
    echo -n "Public IP: "
    curl -s https://checkip.amazonaws.com || echo "Unable to determine"
    echo ""
    
    # Test localhost
    echo "Testing localhost:5000..."
    if curl -s -m 3 http://localhost:5000/api | jq . 2>/dev/null; then
        echo "✅ Localhost is working"
    else
        echo "⚠️  Localhost may not be accessible"
    fi
    echo ""
}

# Function to test API endpoints
test_api() {
    echo "🧪 Testing API Endpoints:"
    echo "========================="
    
    BASE_URL="http://localhost:5000"
    
    # Test health endpoint
    echo "Testing /health..."
    curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/health" | jq . 2>/dev/null || curl -s "$BASE_URL/health"
    echo ""
    
    # Test API endpoint
    echo "Testing /api..."
    curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api" | jq . 2>/dev/null || curl -s "$BASE_URL/api"
    echo ""
}

# Function to show environment
show_environment() {
    echo "🔧 Environment Configuration:"
    echo "============================="
    
    if [ -f backend/.env ]; then
        echo "Backend .env file found"
        grep -E "(PORT|HOST|NODE_ENV|PUBLIC_URL|ALLOWED_ORIGINS)" backend/.env || echo "No config found"
    else
        echo "⚠️  No .env file in backend/"
    fi
    echo ""
    
    if [ -f frontend/.env ]; then
        echo "Frontend .env file found"
        grep -E "REACT_APP_API_URL" frontend/.env || echo "No API URL configured"
    else
        echo "⚠️  No .env file in frontend/"
    fi
    echo ""
}

# Function to show troubleshooting tips
show_tips() {
    echo "💡 Troubleshooting Tips:"
    echo "======================"
    echo ""
    echo "Issue: Can't connect from phone/internet"
    echo "  1. Check if container is running: docker ps"
    echo "  2. Check server logs: docker logs telescent-app"
    echo "  3. Ensure PORT is 5000 in backend/.env"
    echo "  4. Ensure HOST is 0.0.0.0 in backend/.env"
    echo ""
    echo "Issue: CORS errors in browser console"
    echo "  1. Update ALLOWED_ORIGINS in backend/.env"
    echo "  2. Restart container: docker-compose restart"
    echo ""
    echo "Issue: Port 8080 already in use"
    echo "  1. Check what's using it: lsof -i :8080"
    echo "  2. Kill process: kill -9 <PID>"
    echo "  3. Or change port in docker-compose.yml"
    echo ""
    echo "Issue: API URL wrong in frontend"
    echo "  1. Update REACT_APP_API_URL in frontend/.env"
    echo "  2. Rebuild frontend: npm run build"
    echo "  3. Restart container"
    echo ""
}

# Main menu
while true; do
    echo ""
    echo "Select option:"
    echo "1. Check container status"
    echo "2. Check server health"
    echo "3. View container logs"
    echo "4. Check network information"
    echo "5. Test API endpoints"
    echo "6. Show environment configuration"
    echo "7. Show troubleshooting tips"
    echo "8. Full diagnostic report"
    echo "9. Exit"
    echo ""
    read -p "Enter choice (1-9): " choice
    
    case $choice in
        1) check_container ;;
        2) check_health ;;
        3) show_logs ;;
        4) check_network ;;
        5) test_api ;;
        6) show_environment ;;
        7) show_tips ;;
        8) 
            check_container
            check_health
            show_logs
            check_network
            test_api
            show_environment
            ;;
        9) 
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
done
