# TeleScent Hardware API Guide

## Overview

This guide explains how to connect hardware components (IoT devices, sensors, embedded systems) directly to the TeleScent backend API without needing a web browser.

---

## Quick Start

### Your API Endpoint

```
https://outdated-acclimatable-leoma.ngrok-free.dev
```

**Important:** ngrok must be running on port 8080:
```bash
ngrok http 8080
```

---

## Available API Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

Check if the server is running and healthy.

```bash
curl https://outdated-acclimatable-leoma.ngrok-free.dev/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-01T12:34:56.789Z"
}
```

---

### 2. API Root

**Endpoint:** `GET /api`

Basic API information.

```bash
curl https://outdated-acclimatable-leoma.ngrok-free.dev/api
```

**Response:**
```json
{
  "message": "Hello from the TeleScent backend!",
  "environment": "production",
  "timestamp": "2024-12-01T12:34:56.789Z"
}
```

---

### 3. User Registration

**Endpoint:** `POST /api/auth/register`

Register a new user account.

```bash
curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "device@example.com",
    "password": "secure_password_123",
    "firstName": "Device",
    "lastName": "Name"
  }'
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "device@example.com",
    "firstName": "Device",
    "lastName": "Name"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 4. User Login

**Endpoint:** `POST /api/auth/login`

Authenticate and get a JWT token for API requests.

```bash
curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "device@example.com",
    "password": "secure_password_123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "device@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Authentication

Once you have a token from login/register, include it in API requests:

```bash
curl -X GET https://outdated-acclimatable-leoma.ngrok-free.dev/api/protected-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Hardware Implementation Examples

### Example 1: Arduino/ESP8266 (C++)

```cpp
#include <HTTPClient.h>
#include <WiFi.h>

void setup() {
  WiFi.begin("SSID", "password");
  delay(1000);
}

void loop() {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Register
    http.begin("https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/register");
    http.addHeader("Content-Type", "application/json");
    
    String payload = "{\"email\":\"device@example.com\",\"password\":\"pass123\",\"firstName\":\"MyDevice\"}";
    int httpCode = http.POST(payload);
    
    if(httpCode == 201) {
      String response = http.getString();
      Serial.println("Registration successful!");
      Serial.println(response);
    }
    
    http.end();
  }
  delay(10000); // Wait 10 seconds
}
```

---

### Example 2: Python (Raspberry Pi, etc.)

```python
import requests
import json

BASE_URL = "https://outdated-acclimatable-leoma.ngrok-free.dev"

# Register device
register_data = {
    "email": "sensor_01@example.com",
    "password": "secure_pass_123",
    "firstName": "Sensor",
    "lastName": "01"
}

response = requests.post(
    f"{BASE_URL}/api/auth/register",
    json=register_data,
    headers={"Content-Type": "application/json"}
)

if response.status_code == 201:
    result = response.json()
    token = result['token']
    print(f"Registered successfully! Token: {token}")
    
    # Now you can use this token for authenticated requests
    headers = {"Authorization": f"Bearer {token}"}
    api_response = requests.get(
        f"{BASE_URL}/api",
        headers=headers
    )
    print(api_response.json())
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

---

### Example 3: Node.js (IoT Device)

```javascript
const https = require('https');

const BASE_URL = 'outdated-acclimatable-leoma.ngrok-free.dev';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(responseData)
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Register
const registerData = {
  email: 'iot_device@example.com',
  password: 'secure_123',
  firstName: 'IoT',
  lastName: 'Device'
};

makeRequest('POST', '/api/auth/register', registerData)
  .then(response => {
    console.log('Registration response:', response.data);
    return response.data.token;
  })
  .catch(error => console.error('Error:', error));
```

---

### Example 4: Shell Script (Linux Device)

```bash
#!/bin/bash

BASE_URL="https://outdated-acclimatable-leoma.ngrok-free.dev"
EMAIL="device_$(date +%s)@example.com"
PASSWORD="secure_pass_123"

# Register
echo "Registering device..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Device\",
    \"lastName\": \"Linux\"
  }")

echo "Registration response:"
echo "$REGISTER_RESPONSE" | jq .

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
echo "Token: $TOKEN"

# Test authenticated request
echo "Testing authenticated request..."
curl -s -X GET "$BASE_URL/api" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Security Considerations

### 1. Use HTTPS Only
Always use `https://` (not `http://`) for secure communication.

### 2. Store Tokens Securely
- Don't hardcode tokens in source code
- Use environment variables or secure storage
- Rotate tokens regularly

### 3. Change Default Credentials
- Don't use default email/password combinations
- Use strong, unique passwords
- Consider API keys for device authentication

### 4. CORS Headers
The backend is configured with CORS enabled for all origins. For production, restrict to known devices.

---

## Troubleshooting

### Error: "Connection refused"
- Check if ngrok is running: `ngrok http 8080`
- Check if Docker is running: `docker ps`
- Check Docker logs: `docker logs -f telescent-app`

### Error: "Invalid or incomplete HTTP response"
- Ensure you're using port 8080 in ngrok (not 5000)
- Verify the Docker container is healthy

### Error: "Unauthorized"
- Check if token is included in Authorization header
- Verify token hasn't expired
- Re-login to get a fresh token

### Certificate errors
- ngrok provides valid HTTPS certificates
- Ensure your device can access the internet
- Check firewall/proxy settings

---

## Testing Your Connection

### Test 1: Health Check
```bash
curl https://outdated-acclimatable-leoma.ngrok-free.dev/health
```

### Test 2: Register a Device
```bash
curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_device@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "Device"
  }'
```

### Test 3: Login
```bash
curl -X POST https://outdated-acclimatable-leoma.ngrok-free.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_device@example.com",
    "password": "test123"
  }'
```

---

## Next Steps

1. **Choose your hardware platform** (Arduino, Python, Node.js, etc.)
2. **Follow the implementation example** for your platform
3. **Test with curl first** to ensure connectivity
4. **Deploy to your device** and monitor logs
5. **Keep ngrok running** for continuous access

---

## Support

For more help:
- Run diagnostics: `./monitor.sh`
- View logs: `docker logs -f telescent-app`
- Check ngrok status: Visit http://127.0.0.1:4040 while ngrok is running

---

**Your API is ready for hardware components!** 🚀
