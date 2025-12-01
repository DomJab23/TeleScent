#!/bin/bash
# TeleScent Internet Setup Checklist
# Use this to track your setup progress

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   TeleScent - Internet Access Setup Checklist              ║"
echo "║   Choose one option and follow the checklist               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print checkbox
print_check() {
    local item=$1
    local status=$2
    if [ "$status" = "done" ]; then
        echo -e "${GREEN}✓${NC} $item"
    else
        echo -e "${RED}☐${NC} $item"
    fi
}

# Function for option 1
option_1_checklist() {
    echo ""
    echo -e "${YELLOW}📋 OPTION 1: ngrok Setup Checklist (5 minutes)${NC}"
    echo "=================================================="
    echo ""
    
    echo "Pre-requisites:"
    print_check "Downloaded ngrok from https://ngrok.com/download"
    print_check "Extracted ngrok to your PATH or noted its location"
    print_check "Created ngrok account (if using paid features)"
    echo ""
    
    echo "Setup Steps:"
    echo "1. Run ngrok:"
    echo "   ngrok http 5000"
    echo ""
    print_check "Opened ngrok dashboard at http://127.0.0.1:4040"
    print_check "Noted the public URL (e.g., https://abc123.ngrok.io)"
    echo ""
    
    echo "2. Configure Frontend:"
    echo "   Create frontend/.env with:"
    echo "   REACT_APP_API_URL=https://YOUR_NGROK_URL"
    print_check "Created/updated frontend/.env file"
    print_check "Set REACT_APP_API_URL to your ngrok URL"
    echo ""
    
    echo "3. Build & Deploy:"
    echo "   cd frontend"
    echo "   npm run build"
    echo "   cd .."
    print_check "Built frontend (npm run build)"
    print_check "Restarted Docker: docker-compose down && docker-compose up"
    echo ""
    
    echo "4. Test:"
    print_check "Accessed app from another device using ngrok URL"
    print_check "Logged in successfully"
    print_check "App works on phone with SIM data"
    echo ""
    
    echo "✅ Option 1 Complete!"
    echo ""
}

# Function for option 2
option_2_checklist() {
    echo ""
    echo -e "${YELLOW}📋 OPTION 2: Dynamic DNS + Port Forwarding (30 minutes)${NC}"
    echo "=========================================================="
    echo ""
    
    echo "Step 1: Dynamic DNS Setup"
    print_check "Created account on https://www.duckdns.org (or No-IP)"
    print_check "Created domain (e.g., mydomain.duckdns.org)"
    print_check "Downloaded and installed DuckDNS updater/set up CRON"
    print_check "Verified DNS is resolving to your public IP"
    echo ""
    
    echo "Step 2: Router Configuration"
    print_check "Logged into router admin panel (usually 192.168.1.1)"
    print_check "Found Port Forwarding settings"
    print_check "Set up port forwarding:"
    print_check "  - External Port: 8080"
    print_check "  - Internal IP: YOUR_LOCAL_IP"
    print_check "  - Internal Port: 5000"
    print_check "Saved and applied port forwarding rules"
    print_check "Verified router is configured correctly"
    echo ""
    
    echo "Step 3: Frontend Configuration"
    echo "   Create frontend/.env with:"
    echo "   REACT_APP_API_URL=https://YOUR_DUCKDNS_DOMAIN:8080"
    print_check "Created/updated frontend/.env file"
    print_check "Set REACT_APP_API_URL with port number"
    echo ""
    
    echo "Step 4: Build & Deploy"
    echo "   cd frontend"
    echo "   npm run build"
    echo "   cd .."
    print_check "Built frontend (npm run build)"
    print_check "Restarted Docker: docker-compose down && docker-compose up"
    echo ""
    
    echo "Step 5: Testing"
    print_check "Found your public IP: curl ifconfig.me"
    print_check "Tested locally from another computer: curl http://LOCAL_IP:8080/api"
    print_check "Tested from internet: curl https://YOUR_DUCKDNS_DOMAIN:8080/api"
    print_check "Accessed from phone on SIM data"
    print_check "Confirmed stable access (IP hasn't changed)"
    echo ""
    
    echo "Maintenance:"
    print_check "DuckDNS updater is running automatically"
    print_check "Port forwarding rules are saved in router"
    print_check "Set reminder to check every 30 days"
    echo ""
    
    echo "✅ Option 2 Complete!"
    echo ""
}

# Function for option 3
option_3_checklist() {
    echo ""
    echo -e "${YELLOW}📋 OPTION 3: Cloud Hosting (1-2 hours)${NC}"
    echo "======================================="
    echo ""
    
    echo "Step 1: Choose Cloud Platform"
    print_check "Decided on platform: DigitalOcean / AWS / Render / Railway / Heroku"
    print_check "Created account on chosen platform"
    print_check "Added payment method if required"
    echo ""
    
    echo "Step 2: Prepare Code for Deployment"
    print_check "Committed all changes: git add . && git commit -m '...'"
    print_check "Pushed to GitHub: git push origin main"
    print_check "Verified code is on GitHub"
    echo ""
    
    echo "Step 3: Deploy Application"
    print_check "Connected GitHub repository to platform"
    print_check "Selected main branch for deployment"
    print_check "Configured environment variables:"
    print_check "  - NODE_ENV=production"
    print_check "  - JWT_SECRET=your_strong_secret"
    print_check "  - ALLOWED_ORIGINS=platform_url"
    print_check "Started deployment process"
    print_check "Waited for build to complete (5-10 min)"
    print_check "Deployment successful (no errors)"
    echo ""
    
    echo "Step 4: Frontend Configuration"
    echo "   Create frontend/.env with:"
    echo "   REACT_APP_API_URL=https://YOUR_PLATFORM_URL"
    print_check "Updated frontend/.env with platform URL"
    print_check "Committed and pushed changes"
    print_check "Platform redeployed automatically"
    echo ""
    
    echo "Step 5: Testing"
    print_check "Accessed app at provided URL in browser"
    print_check "Logged in successfully"
    print_check "Tested all features"
    print_check "Accessed from phone on SIM data"
    print_check "Confirmed HTTPS/SSL is working"
    echo ""
    
    echo "Maintenance:"
    print_check "Reviewed deployment logs for errors"
    print_check "Set up monitoring/alerts if available"
    print_check "Planned for scaling if needed"
    print_check "Enabled auto-backups if available"
    echo ""
    
    echo "✅ Option 3 Complete!"
    echo ""
}

# Main menu
echo "Which option did you choose?"
echo ""
echo "1. ngrok (Quickest - 5 minutes)"
echo "2. Dynamic DNS + Port Forwarding (Stable - 30 minutes)"
echo "3. Cloud Hosting (Professional - 1-2 hours)"
echo "0. Exit"
echo ""
read -p "Enter your choice (0-3): " choice

case $choice in
    1)
        option_1_checklist
        ;;
    2)
        option_2_checklist
        ;;
    3)
        option_3_checklist
        ;;
    0)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🎉 Congratulations! Your TeleScent app is now accessible"
echo "   from the internet via SIM card!"
echo ""
echo "📝 Next Steps:"
echo "  - Share your public URL with others"
echo "  - Monitor logs: docker logs -f telescent-app"
echo "  - Run diagnostics: ./monitor.sh"
echo "  - Check security settings: see INTERNET_SETUP_GUIDE.md"
echo ""
echo "📚 For help:"
echo "  - Read: INTERNET_SETUP_GUIDE.md"
echo "  - Run: ./monitor.sh"
echo "  - Check: docker logs telescent-app"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
