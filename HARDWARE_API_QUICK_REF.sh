#!/bin/bash

# TeleScent Hardware API Quick Reference
# For connecting IoT devices, sensors, and embedded systems

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║              TELESCENT HARDWARE API - QUICK REFERENCE                      ║
║                                                                            ║
║                    For IoT Devices & Embedded Systems                      ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

🌐 YOUR API BASE URL
═════════════════════════════════════════════════════════════════════════════

https://outdated-acclimatable-leoma.ngrok-free.dev

⚠️  IMPORTANT: ngrok must be running on port 8080:
    ngrok http 8080

═════════════════════════════════════════════════════════════════════════════

📡 AVAILABLE ENDPOINTS
═════════════════════════════════════════════════════════════════════════════

1. HEALTH CHECK (No auth needed)
   GET /health
   
   curl https://outdated-acclimatable-leoma.ngrok-free.dev/health

2. API ROOT (No auth needed)
   GET /api
   
   curl https://outdated-acclimatable-leoma.ngrok-free.dev/api

3. REGISTER (No auth needed)
   POST /api/auth/register
   
   curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"device@example.com","password":"pass123","firstName":"Device"}'

4. LOGIN (No auth needed)
   POST /api/auth/login
   
   curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"device@example.com","password":"pass123"}'

═════════════════════════════════════════════════════════════════════════════

🔑 AUTHENTICATION
═════════════════════════════════════════════════════════════════════════════

Step 1: LOGIN to get a token
────────────────────────────
TOKEN=$(curl -s -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"device@example.com","password":"pass123"}' | jq -r '.token')

Step 2: Use token in requests
──────────────────────────────
curl -H "Authorization: Bearer $TOKEN" https://outdated-acclimatable-leoma.ngrok-free.dev/api

═════════════════════════════════════════════════════════════════════════════

💻 PLATFORM-SPECIFIC EXAMPLES
═════════════════════════════════════════════════════════════════════════════

PYTHON (Raspberry Pi, Linux)
───────────────────────────
import requests

response = requests.post(
    'https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login',
    json={'email': 'device@example.com', 'password': 'pass123'}
)
token = response.json()['token']

# Use token
headers = {'Authorization': f'Bearer {token}'}
api_response = requests.get(
    'https://outdated-acclimatable-leoma.ngrok-free.dev/api',
    headers=headers
)
print(api_response.json())

ARDUINO/ESP8266 (C++)
─────────────────────
#include <HTTPClient.h>

HTTPClient http;
http.begin("https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login");
http.addHeader("Content-Type", "application/json");

String payload = "{\"email\":\"device@example.com\",\"password\":\"pass123\"}";
int code = http.POST(payload);

String response = http.getString();
// Parse JSON to get token
http.end();

NODE.JS
───────
const https = require('https');

https.get('https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    console.log('Token:', token);
  });
});

SHELL SCRIPT (Bash/Linux)
──────────────────────────
#!/bin/bash

# Login and get token
LOGIN_RESPONSE=$(curl -s -X POST \
  https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"device@example.com","password":"pass123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

# Use token in API request
curl -H "Authorization: Bearer $TOKEN" \
  https://outdated-acclimatable-leoma.ngrok-free.dev/api

═════════════════════════════════════════════════════════════════════════════

🧪 QUICK TEST
═════════════════════════════════════════════════════════════════════════════

# 1. Check if server is running
curl https://outdated-acclimatable-leoma.ngrok-free.dev/health

# 2. Register a test device
curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_'$(date +%s)'@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "Device"
  }'

# 3. Get response and save token
# Copy the "token" value from the response

# 4. Use token to make authenticated request
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://outdated-acclimatable-leoma.ngrok-free.dev/api

═════════════════════════════════════════════════════════════════════════════

⚠️  TROUBLESHOOTING
═════════════════════════════════════════════════════════════════════════════

Issue: "Connection refused"
  → Check ngrok is running: ngrok http 8080
  → Check Docker is running: docker ps
  → Check logs: docker logs -f telescent-app

Issue: "Invalid or incomplete HTTP response"
  → Make sure ngrok is on port 8080 (not 5000)
  → Verify Docker container is healthy

Issue: "Unauthorized" (401 error)
  → Check token in Authorization header
  → Re-login to get a fresh token
  → Format: "Bearer YOUR_TOKEN_HERE" (with "Bearer " prefix)

Issue: "User already exists"
  → Use a different email address
  → Or use login endpoint instead of register

═════════════════════════════════════════════════════════════════════════════

📊 RESPONSE FORMATS
═════════════════════════════════════════════════════════════════════════════

Login/Register Success (201 or 200):
{
  "message": "...",
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Error Response (4xx or 5xx):
{
  "message": "Error description",
  "error": "Detailed error message"
}

═════════════════════════════════════════════════════════════════════════════

✨ KEY POINTS
═════════════════════════════════════════════════════════════════════════════

✓ Always use HTTPS (https://, not http://)
✓ ngrok must be running: ngrok http 8080
✓ Include Authorization header with Bearer token
✓ Content-Type should be application/json
✓ Keep your tokens secure
✓ Test with curl before implementing in code

═════════════════════════════════════════════════════════════════════════════

📚 FULL DOCUMENTATION
═════════════════════════════════════════════════════════════════════════════

Read: HARDWARE_API_GUIDE.md for:
  - Complete endpoint documentation
  - Full code examples
  - Detailed troubleshooting
  - Security best practices

═════════════════════════════════════════════════════════════════════════════

EOF
