#!/bin/bash

# TeleScent - Setup for Internet Access

echo "🚀 TeleScent Internet Setup Script"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker found"
echo ""

# Ask user which option they want
echo "Choose your internet access option:"
echo "1. ngrok (Quick testing)"
echo "2. Dynamic DNS + Port Forwarding (Home setup)"
echo "3. Cloud Deployment (Production)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔗 Option 1: ngrok Setup"
        echo "========================"
        echo ""
        echo "1. Go to https://ngrok.com/download and download ngrok"
        echo "2. Extract and add to PATH, or run:"
        echo ""
        echo "   ngrok http 5000"
        echo ""
        echo "3. This will show you a public URL like: https://abc123.ngrok.io"
        echo ""
        echo "4. Update your frontend .env file with:"
        echo "   REACT_APP_API_URL=https://abc123.ngrok.io"
        echo ""
        echo "5. Build and restart the app"
        ;;
    2)
        echo ""
        echo "🔧 Option 2: Dynamic DNS + Port Forwarding"
        echo "==========================================="
        echo ""
        echo "Step 1: Find your local IP address:"
        hostname -I | awk '{print $1}' > /tmp/local_ip.txt
        LOCAL_IP=$(cat /tmp/local_ip.txt)
        echo "   Your local IP: $LOCAL_IP"
        echo ""
        echo "Step 2: Set up Dynamic DNS"
        echo "   - Sign up at: https://www.duckdns.org/ (or No-IP, etc.)"
        echo "   - Set up your domain: yourname.duckdns.org"
        echo "   - Configure your router to auto-update the DNS"
        echo ""
        echo "Step 3: Configure Port Forwarding in your router"
        echo "   - Router admin panel (usually 192.168.1.1)"
        echo "   - Port Forwarding settings:"
        echo "   - External Port: 8080"
        echo "   - Internal IP: $LOCAL_IP"
        echo "   - Internal Port: 5000"
        echo ""
        echo "Step 4: Update frontend .env:"
        echo "   REACT_APP_API_URL=https://yourname.duckdns.org:8080"
        echo ""
        ;;
    3)
        echo ""
        echo "☁️  Option 3: Cloud Deployment"
        echo "=============================="
        echo ""
        echo "Recommended platforms:"
        echo "  - DigitalOcean App Platform"
        echo "  - AWS Lightsail"
        echo "  - Heroku"
        echo "  - Render"
        echo "  - Railway"
        echo ""
        echo "Steps:"
        echo "1. Create an account on your chosen platform"
        echo "2. Connect your GitHub repository"
        echo "3. Set up Docker deployment with your docker-compose.yml"
        echo "4. Platform will provide you a public URL"
        echo "5. Update frontend .env with the provided URL"
        echo ""
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "📝 Next steps:"
echo "1. Choose your setup option above and follow the instructions"
echo "2. Update frontend/.env with your public URL"
echo "3. Rebuild the frontend: cd frontend && npm run build"
echo "4. Restart the app: docker-compose down && docker-compose up"
echo ""
echo "📚 See INTERNET_SETUP_GUIDE.md for detailed information"
echo ""
