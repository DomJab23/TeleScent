# GSM/SIM800L Testing Guide

## Overview
This guide will help you verify if your SIM800L GSM module is properly connected and sending signals.

## Hardware Setup

### Required Components
- ESP32 Arduino Nano
- SIM800L GSM module
- Power supply (3.7-4.2V, minimum 2A for SIM800L)
- SIM card (activated, with data plan, PIN disabled)
- Antenna (connected to SIM800L)

### Wiring Connections
```
ESP32 GPIO 8 (TX)  →  SIM800L RX
ESP32 GPIO 9 (RX)  →  SIM800L TX
SIM800L VCC        →  3.7-4.2V Power (NOT 5V! Will damage module)
SIM800L GND        →  ESP32 GND
Antenna            →  SIM800L ANT
```

⚠️ **CRITICAL**: SIM800L requires 3.7-4.2V and can draw up to 2A during transmission bursts. USB power may not be sufficient!

## Running the Test

### Option 1: Use the Test File (Recommended)

1. **Temporarily modify platformio.ini** to use the test file:
   ```ini
   [env:arduino_nano_esp32_gsm_test]
   platform = espressif32
   board = arduino_nano_esp32
   framework = arduino
   lib_deps = 
       bblanchon/ArduinoJson@^7.2.0
   monitor_speed = 115200
   build_src_filter = 
       +<../test/test_gsm.cpp>
       -<main.cpp>
   ```

2. **Build and upload**:
   ```bash
   cd enose
   pio run -e arduino_nano_esp32_gsm_test -t upload
   pio device monitor
   ```

### Option 2: Enable GSM in Main Code

1. **Edit `enose/src/main.cpp`** - uncomment the GSM init line:
   ```cpp
   void setup() {
       Serial.begin(9600);
       Wire.begin();
       
       init_sensors();
       // init_bluetooth();
       init_GSM();  // ← Uncomment this line
   }
   ```

2. **Update HOST_NAME and PORT** in `enose/include/main.h`:
   ```cpp
   #define HOST_NAME "your-server.com"  // Your actual server
   #define PORT 443                      // Your port (443 for HTTPS)
   ```

3. **Build and upload**:
   ```bash
   cd enose
   pio run -t upload
   pio device monitor
   ```

## What to Look For

### Test Sequence
The test runs 6 automated tests:

#### 1. AT Command Test
- **Pass**: Module responds with "OK"
- **Fail**: Check power, RX/TX wiring

#### 2. Signal Quality Test
- **RSSI values**:
  - `0-9`: Poor signal
  - `10-14`: Fair signal
  - `15-19`: Good signal
  - `20-31`: Excellent signal
  - `99`: No signal detected
- **Fail**: Check antenna connection, move to better location

#### 3. Network Registration Test
- **Status codes**:
  - `0`: Not registered
  - `1`: Registered (home network) ✓
  - `2`: Searching for network
  - `3`: Registration denied
  - `5`: Registered (roaming) ✓
- **Fail**: Wait 30-60 seconds for registration, check SIM card

#### 4. GPRS Connection Test
- Establishes data connection
- **Pass**: "GPRS connection established"
- **Fail**: Check SIM data plan, APN settings, account credit

#### 5. TCP Connection Test
- Connects to your server
- **Pass**: "TCP connection established"
- **Fail**: Verify server URL, port, internet connectivity

#### 6. Data Transmission Test
- Sends test JSON data
- **Pass**: "Data sent successfully"
- **Fail**: Check server logs for received data

## Expected Serial Output

```
========================================
   GSM/SIM800L Test & Verification
========================================

[TEST 1/6] AT Command Test
----------------------------
Sending: AT
✓ GSM module responding to AT commands

[TEST 2/6] Signal Quality Test
--------------------------------
Signal Strength (RSSI): 18 (58%)
✓ Fair signal quality

[TEST 3/6] Network Registration Test
-------------------------------------
Registration Status: 1 - Registered, home network
✓ Successfully registered!

[TEST 4/6] GPRS Connection Test
--------------------------------
✓ GSM library initialized
✓ GPRS connection established!

[TEST 5/6] TCP Connection Test
-------------------------------
Connecting to: your-server.com:443
✓ TCP connection established!

[TEST 6/6] Data Transmission Test
----------------------------------
Sending test data:
{"test":"GSM verification","deviceId":"esp32-test","timestamp":12345}
✓ Data sent successfully!
```

## Troubleshooting

### Module Not Responding
- **Check power**: SIM800L needs 3.7-4.2V with 2A capability
- **Check wiring**: RX ↔ TX are crossed correctly
- **LED indicators**: SIM800L has status LEDs
  - Fast blink: Searching for network
  - Slow blink (every 3s): Connected to network
  - Off: No power or dead module

### No Signal (RSSI: 99)
- **Antenna**: Make sure antenna is connected
- **Location**: Move near window or outside
- **SIM card**: Ensure it's inserted correctly
- **Wait**: Can take 30-60 seconds to register

### Registration Failed
- **SIM card**: Check if activated
- **PIN**: Disable PIN lock on SIM card
- **Network**: Verify SIM works in phone first
- **APN**: May need manual APN configuration

### GPRS Connection Failed
- **Data plan**: SIM card must have active data
- **APN settings**: May need carrier-specific APN
- **Credit**: Check account has sufficient balance
- **Carrier**: Some MVNOs don't support M2M/IoT

### TCP Connection Failed
- **Server URL**: Verify hostname is correct
- **Port**: Check port number (443 for HTTPS)
- **DNS**: Try using IP address instead of hostname
- **Firewall**: Check if server accepts connections

### Data Not Received
- **Server logs**: Check if data is reaching server
- **Format**: Verify data format matches API expectations
- **Authentication**: Server may require auth headers
- **HTTP vs Raw TCP**: Your server might expect HTTP protocol

## Power Supply Tips

### SIM800L Power Requirements
- **Voltage**: 3.4V - 4.4V (optimal: 3.7-4.2V)
- **Idle current**: ~50mA
- **Transmit bursts**: Up to 2A for 1-2ms

### Recommended Power Solutions
1. **Li-Po battery** (3.7V, >1000mAh)
2. **LM2596 buck converter** (set to 4.0V from 5V/12V source)
3. **Dedicated power supply** with 2A+ capability
4. **Large capacitor** (1000µF) near SIM800L VCC

### NOT Recommended
- ❌ USB power directly (not enough current)
- ❌ ESP32 3.3V pin (too low voltage + insufficient current)
- ❌ Arduino 5V pin (too high, will damage module)

## Integration with Main Code

Once GSM is verified working, integrate it into your sensor readings:

```cpp
void loop() {
    sensor_readings();
    
    // Send data via GSM every 30 seconds
    static unsigned long lastGSMSend = 0;
    if (millis() - lastGSMSend > 30000) {
        sendDataViaGSM();
        lastGSMSend = millis();
    }
    
    delay(1000);
}

void sendDataViaGSM() {
    // Format sensor data as JSON
    String jsonData = formatSensorDataAsJSON();
    
    // Send via GSM
    if (gsm.tcpStatus()) {  // Check if still connected
        gsm.tcpSend(jsonData.c_str());
        Serial.println("Data sent via GSM");
    } else {
        // Reconnect if needed
        if (gsm.tcpConnect(HOST_NAME, PORT)) {
            gsm.tcpSend(jsonData.c_str());
        }
    }
}
```

## AT Commands Reference

Useful AT commands for manual testing:

```
AT                  - Test if module responds
ATI                 - Get module information  
AT+CSQ              - Check signal quality
AT+CREG?            - Check network registration
AT+COPS?            - Get network operator
AT+CGATT?           - Check GPRS attachment
AT+CIPSTATUS        - Check TCP connection status
AT+CIPCLOSE         - Close TCP connection
```

Send via Serial Monitor to GSM module to manually test.

## Additional Resources

- [SIM800L AT Commands Manual](https://www.elecrow.com/wiki/images/2/20/SIM800_Series_AT_Command_Manual_V1.09.pdf)
- [SIM800L Hardware Design Guide](https://simcom.ee/documents/SIM800L/SIM800L%20Hardware%20Design_V1.00.pdf)
- Your backend API documentation for data format requirements

## Next Steps

✅ Once all tests pass:
1. Document your working configuration
2. Integrate GSM sending into main sensor loop
3. Add error handling and reconnection logic
4. Implement data buffering for failed sends
5. Add power management (sleep modes between sends)
6. Test with your actual backend API
