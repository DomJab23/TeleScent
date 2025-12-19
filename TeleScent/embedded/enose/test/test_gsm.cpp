/*
  ============================================
  GSM/SIM800L Test and Verification Sketch
  ============================================
  
  This sketch helps you verify if your SIM800L GSM module
  is properly connected and sending signals.
  
  Hardware Connections:
  - ESP32 GPIO 8 (TX) -> SIM800L RX
  - ESP32 GPIO 9 (RX) -> SIM800L TX
  - SIM800L VCC -> 3.7-4.2V (NOT 5V!)
  - SIM800L GND -> ESP32 GND
  
  Make sure your SIM card is:
  1. Inserted properly
  2. Activated and has credit/data plan
  3. PIN disabled (or handle PIN in code)
  
  Date: December 2, 2025
*/

#include <Arduino.h>
#include <HardwareSerial.h>
#include <SIM800L.h>

// GSM Configuration
#define GSM_RX_PIN 9
#define GSM_TX_PIN 8
#define GSM_BAUD_RATE 9600

// Server Configuration (update these!)
#define HOST_NAME "outdated-acclimatable-leoma.ngrok-free.dev"
#define PORT 80  // HTTP port for ngrok

HardwareSerial GSMserial(1); // Use UART1
SIM800L gsm;

// Test states
enum TestState {
    TEST_AT_COMMANDS,
    TEST_SIGNAL_QUALITY,
    TEST_NETWORK_REGISTRATION,
    TEST_GPRS_CONNECTION,
    TEST_TCP_CONNECTION,
    TEST_SEND_DATA,
    TEST_COMPLETE
};

TestState currentTest = TEST_AT_COMMANDS;
unsigned long lastTestTime = 0;
const unsigned long TEST_INTERVAL = 5000; // 5 seconds between tests

// Forward declarations
void testATCommands();
void testSignalQuality();
void testNetworkRegistration();
void testGPRSConnection();
void testTCPConnection();
void testSendData();
void printSummary();
bool waitForResponse(const char* expected, unsigned long timeout);

void setup() {
    Serial.begin(115200);
    delay(2000);
    
    Serial.println("\n\n");
    Serial.println("========================================");
    Serial.println("   GSM/SIM800L Test & Verification");
    Serial.println("========================================");
    Serial.println();
    
    // Initialize GSM Serial
    Serial.println("Initializing GSM module...");
    GSMserial.begin(GSM_BAUD_RATE, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
    delay(1000);
    
    Serial.println("✓ GSM Serial initialized");
    Serial.println("Starting tests in 3 seconds...\n");
    delay(3000);
}

void loop() {
    // Run tests sequentially with delays
    if (millis() - lastTestTime > TEST_INTERVAL) {
        lastTestTime = millis();
        
        switch(currentTest) {
            case TEST_AT_COMMANDS:
                testATCommands();
                break;
                
            case TEST_SIGNAL_QUALITY:
                testSignalQuality();
                break;
                
            case TEST_NETWORK_REGISTRATION:
                testNetworkRegistration();
                break;
                
            case TEST_GPRS_CONNECTION:
                testGPRSConnection();
                break;
                
            case TEST_TCP_CONNECTION:
                testTCPConnection();
                break;
                
            case TEST_SEND_DATA:
                testSendData();
                break;
                
            case TEST_COMPLETE:
                printSummary();
                delay(10000); // Wait 10 seconds before restarting
                currentTest = TEST_AT_COMMANDS;
                break;
        }
    }
    
    // Print any data from GSM module
    if (GSMserial.available()) {
        String response = GSMserial.readString();
        Serial.print("GSM>> ");
        Serial.println(response);
    }
}

// ============================================
// Test Functions
// ============================================

void testATCommands() {
    Serial.println("\n[TEST 1/6] AT Command Test");
    Serial.println("----------------------------");
    Serial.println("Sending: AT");
    
    GSMserial.println("AT");
    delay(500);
    
    if (waitForResponse("OK", 2000)) {
        Serial.println("✓ GSM module responding to AT commands");
        
        // Get module info
        Serial.println("\nGetting module information...");
        GSMserial.println("ATI"); // Get module info
        delay(1000);
        
        GSMserial.println("AT+GSV"); // Get firmware version
        delay(1000);
        
        currentTest = TEST_SIGNAL_QUALITY;
    } else {
        Serial.println("✗ No response from GSM module!");
        Serial.println("  Check connections:");
        Serial.println("  - RX/TX wiring");
        Serial.println("  - Power supply (3.7-4.2V, >2A)");
        Serial.println("  - Module is powered on");
    }
}

void testSignalQuality() {
    Serial.println("\n[TEST 2/6] Signal Quality Test");
    Serial.println("--------------------------------");
    Serial.println("Sending: AT+CSQ");
    
    GSMserial.println("AT+CSQ");
    delay(1000);
    
    String response = "";
    unsigned long timeout = millis() + 2000;
    while (millis() < timeout) {
        if (GSMserial.available()) {
            response += GSMserial.readString();
        }
    }
    
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse signal quality (format: +CSQ: <rssi>,<ber>)
    int csqIndex = response.indexOf("+CSQ:");
    if (csqIndex != -1) {
        int rssi = response.substring(csqIndex + 6).toInt();
        
        Serial.print("\nSignal Strength (RSSI): ");
        Serial.print(rssi);
        
        if (rssi == 99) {
            Serial.println(" - No signal detected!");
            Serial.println("✗ No GSM signal");
            Serial.println("  Troubleshooting:");
            Serial.println("  - Check antenna connection");
            Serial.println("  - Move to area with better signal");
            Serial.println("  - Wait for SIM card to register (can take 30-60s)");
        } else if (rssi >= 0 && rssi <= 31) {
            int strength = map(rssi, 0, 31, 0, 100);
            Serial.print(" (");
            Serial.print(strength);
            Serial.println("%)");
            
            if (strength < 25) {
                Serial.println("⚠ Weak signal - may have connection issues");
            } else if (strength < 50) {
                Serial.println("✓ Fair signal quality");
            } else {
                Serial.println("✓ Good signal quality");
            }
        }
    } else {
        Serial.println("✗ Could not parse signal quality");
    }
    
    currentTest = TEST_NETWORK_REGISTRATION;
}

void testNetworkRegistration() {
    Serial.println("\n[TEST 3/6] Network Registration Test");
    Serial.println("-------------------------------------");
    Serial.println("Sending: AT+CREG?");
    
    GSMserial.println("AT+CREG?");
    delay(1000);
    
    String response = "";
    unsigned long timeout = millis() + 2000;
    while (millis() < timeout) {
        if (GSMserial.available()) {
            response += GSMserial.readString();
        }
    }
    
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse registration status
    int cregIndex = response.indexOf("+CREG:");
    if (cregIndex != -1) {
        // Format: +CREG: <n>,<stat>
        String statusPart = response.substring(cregIndex + 7);
        int commaPos = statusPart.indexOf(',');
        if (commaPos != -1) {
            int status = statusPart.substring(commaPos + 1).toInt();
            
            Serial.print("Registration Status: ");
            switch(status) {
                case 0:
                    Serial.println("0 - Not registered, not searching");
                    Serial.println("✗ Not registered on network");
                    break;
                case 1:
                    Serial.println("1 - Registered, home network");
                    Serial.println("✓ Successfully registered!");
                    break;
                case 2:
                    Serial.println("2 - Not registered, searching...");
                    Serial.println("⚠ Still searching for network");
                    break;
                case 3:
                    Serial.println("3 - Registration denied");
                    Serial.println("✗ Registration denied - check SIM card");
                    break;
                case 5:
                    Serial.println("5 - Registered, roaming");
                    Serial.println("✓ Registered (roaming)");
                    break;
                default:
                    Serial.println("Unknown status");
                    break;
            }
        }
    }
    
    // Check operator
    Serial.println("\nChecking network operator...");
    GSMserial.println("AT+COPS?");
    delay(1000);
    
    currentTest = TEST_GPRS_CONNECTION;
}

void testGPRSConnection() {
    Serial.println("\n[TEST 4/6] GPRS Connection Test");
    Serial.println("--------------------------------");
    
    // Check if GPRS is attached
    Serial.println("Checking GPRS attachment...");
    GSMserial.println("AT+CGATT?");
    delay(1000);
    
    Serial.println("\nInitializing GPRS with SIM800L library...");
    
    if (!gsm.begin(GSMserial)) {
        Serial.println("✗ Failed to initialize GSM library");
        currentTest = TEST_COMPLETE;
        return;
    }
    Serial.println("✓ GSM library initialized");
    
    Serial.println("\nStarting GPRS connection...");
    Serial.println("(This may take 10-30 seconds...)");
    
    if (gsm.startGPRS()) {
        Serial.println("✓ GPRS connection established!");
        Serial.println("  - APN configured");
        Serial.println("  - Data connection active");
        currentTest = TEST_TCP_CONNECTION;
    } else {
        Serial.println("✗ GPRS connection failed!");
        Serial.println("  Check:");
        Serial.println("  - SIM card has data plan");
        Serial.println("  - APN settings are correct");
        Serial.println("  - Account has credit");
        currentTest = TEST_COMPLETE;
    }
}

void testTCPConnection() {
    Serial.println("\n[TEST 5/6] TCP Connection Test");
    Serial.println("-------------------------------");
    Serial.print("Connecting to: ");
    Serial.print(HOST_NAME);
    Serial.print(":");
    Serial.println(PORT);
    
    // tcpConnect returns void, just call it
    gsm.tcpConnect(HOST_NAME, PORT);
    delay(3000); // Wait for connection
    
    // Check connection status
    if (gsm.tcpStatus()) {
        Serial.println("✓ TCP connection established!");
        Serial.println("✓ TCP connection verified active");
        currentTest = TEST_SEND_DATA;
    } else {
        Serial.println("✗ TCP connection failed!");
        Serial.println("  Check:");
        Serial.println("  - Server hostname is correct");
        Serial.println("  - Port is correct");
        Serial.println("  - Server is reachable from internet");
        Serial.println("  - Firewall settings");
        currentTest = TEST_COMPLETE;
    }
}

void testSendData() {
    Serial.println("\n[TEST 6/6] Data Transmission Test");
    Serial.println("----------------------------------");
    
    // Prepare test JSON data
    char testData[128];
    snprintf(testData, sizeof(testData), 
             "{\"test\":\"GSM\",\"device\":\"esp32\",\"ts\":%lu}", millis());
    
    Serial.println("Sending test data:");
    Serial.println(testData);
    
    // tcpSend returns void, just call it
    gsm.tcpSend(testData);
    delay(2000);
    
    Serial.println("✓ Data transmission command sent!");
    Serial.println("  Check server logs to verify receipt");
        
    Serial.println("\nNote: SIM800L library doesn't provide send confirmation");
    Serial.println("Monitor your server logs or SIM data usage to verify.");
    
    // Note: SIM800L library doesn't have tcpClose method
    Serial.println("\nConnection remains open (no close method in library)");
    
    currentTest = TEST_COMPLETE;
}

void printSummary() {
    Serial.println("\n\n========================================");
    Serial.println("        TEST SUMMARY");
    Serial.println("========================================");
    Serial.println("\nAll tests completed!");
    Serial.println("\nIf all tests passed:");
    Serial.println("  ✓ Your GSM module is properly configured");
    Serial.println("  ✓ You can send data to the internet");
    Serial.println("  ✓ Ready to integrate with your main code");
    Serial.println("\nIf tests failed, review the error messages");
    Serial.println("above for troubleshooting steps.");
    Serial.println("\nRestarting tests in 10 seconds...");
    Serial.println("========================================\n");
}

// Helper function to wait for response
bool waitForResponse(const char* expected, unsigned long timeout) {
    String response = "";
    unsigned long start = millis();
    
    while (millis() - start < timeout) {
        if (GSMserial.available()) {
            response += GSMserial.readString();
            if (response.indexOf(expected) != -1) {
                return true;
            }
        }
        delay(10);
    }
    
    return false;
}
