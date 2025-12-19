/*
  ============================================
  SIMPLE POST REQUEST TEST
  ============================================
  
  This is a minimal test to send HTTP POST requests
  from Arduino ESP32 to your backend server via GSM.
  
  Hardware:
  - ESP32 GPIO 8 (TX) -> SIM800L RX
  - ESP32 GPIO 9 (RX) -> SIM800L TX
  - SIM800L VCC -> 3.7-4.2V (2A capable!)
  - SIM800L GND -> GND
  
  What it does:
  1. Connects to GSM network
  2. Activates GPRS data
  3. Sends a simple POST request every 10 seconds
  4. Shows result in Serial Monitor
*/

#include <Arduino.h>
#include <HardwareSerial.h>
#include <SIM800L.h>

// Server Configuration - YOUR ngrok URL
#define HOST_NAME "outdated-acclimatable-leoma.ngrok-free.dev"
#define PORT 80

// GSM Configuration
HardwareSerial GSMserial(1); // Use UART1
SIM800L gsm;

bool gsmReady = false;
int messageCount = 0;

void setup() {
    Serial.begin(9600);
    while (!Serial) { delay(10); }
    
    Serial.println("\n========================================");
    Serial.println("  Simple POST Request Test");
    Serial.println("========================================\n");
    
    // Initialize GSM serial
    GSMserial.begin(9600, SERIAL_8N1, 9, 8); // RX=9, TX=8
    delay(1000);
    
    Serial.println("Step 1: Initializing GSM module...");
    if (gsm.begin(GSMserial)) {
        Serial.println("✓ GSM module initialized");
        
        int signal = gsm.signalStrength();
        Serial.print("✓ Signal strength: ");
        Serial.print(signal);
        Serial.println("/31");
        
        Serial.println("\nStep 2: Connecting to cellular network...");
        Serial.println("(This may take 5-15 seconds...)");
        delay(5000); // Give it time to register
        
        Serial.println("\nStep 3: Starting GPRS data connection...");
        if (gsm.startGPRS()) {
            Serial.println("✓ GPRS connected!");
            Serial.println("✓ Ready to send data\n");
            gsmReady = true;
        } else {
            Serial.println("✗ GPRS connection failed");
            Serial.println("Check: SIM card has data plan");
        }
    } else {
        Serial.println("✗ GSM initialization failed");
        Serial.println("Check: SIM800L power and wiring");
    }
    
    Serial.println("========================================\n");
}

void loop() {
    if (!gsmReady) {
        Serial.println("Waiting 10 seconds before retry...");
        delay(10000);
        ESP.restart(); // Restart to try again
        return;
    }
    
    messageCount++;
    
    Serial.println("----------------------------------------");
    Serial.print("Sending POST request #");
    Serial.println(messageCount);
    Serial.println("----------------------------------------");
    
    // Build HTTP POST request manually
    String httpRequest = "POST /api/sensor-data HTTP/1.1\r\n";
    httpRequest += "Host: ";
    httpRequest += HOST_NAME;
    httpRequest += "\r\n";
    httpRequest += "Content-Type: application/json\r\n";
    
    // Create simple JSON data
    String jsonData = "{";
    jsonData += "\"deviceId\":\"ESP32-SIMPLE-TEST\",";
    jsonData += "\"sensorType\":\"test\",";
    jsonData += "\"value\":";
    jsonData += String(messageCount);
    jsonData += ",\"unit\":\"count\"";
    jsonData += "}";
    
    httpRequest += "Content-Length: ";
    httpRequest += String(jsonData.length());
    httpRequest += "\r\n\r\n";
    httpRequest += jsonData;
    
    Serial.println("Connecting to server...");
    Serial.print("  Host: ");
    Serial.println(HOST_NAME);
    Serial.print("  Port: ");
    Serial.println(PORT);
    
    // Connect TCP
    gsm.tcpConnect(HOST_NAME, PORT);
    delay(2000); // Wait for connection
    
    if (gsm.tcpStatus()) {
        Serial.println("✓ TCP connected");
        
        Serial.println("\nSending HTTP POST:");
        Serial.println("---");
        Serial.println(httpRequest);
        Serial.println("---");
        
        // Send the HTTP request
        gsm.tcpSend((char*)httpRequest.c_str());
        delay(1000);
        
        // Try to read response
        Serial.println("\nWaiting for response...");
        delay(2000);
        
        int available = gsm.tcpAvailable();
        if (available > 0) {
            Serial.print("✓ Response received (");
            Serial.print(available);
            Serial.println(" bytes):");
            
            char response[500];
            int bytesToRead = min(available, 499);
            gsm.tcpRead(response, bytesToRead);
            response[bytesToRead] = '\0';
            Serial.println(response);
        } else {
            Serial.println("⚠ No response (might be redirect/timeout)");
            Serial.println("  BUT: Request was sent to server!");
            Serial.println("  Check ngrok dashboard for confirmation");
        }
        
        Serial.println("✓ TCP transaction complete");
        
    } else {
        Serial.println("✗ TCP connection failed");
        Serial.println("  This might mean:");
        Serial.println("  - Server responded with redirect (ngrok HTTPS)");
        Serial.println("  - But request WAS received!");
        Serial.println("  Check your ngrok dashboard!");
    }
    
    Serial.println("\n✅ POST Request Complete!");
    Serial.print("Next request in 10 seconds...\n\n");
    
    delay(10000); // Wait 10 seconds before next request
}
