/**
 * ADD THIS TO YOUR main.cpp
 * 
 * Function to send sensor data via HTTP POST over GSM
 */

// Add this function after your sensor_readings() function

/**
 * ROBUST VERSION: Send sensor data via HTTP POST over GSM
 * 
 * This version includes:
 * - Better error handling
 * - Connection cleanup
 * - Status feedback
 * - Automatic reconnection
 */
bool send_sensor_data_via_gsm(float temp, float hum, float pres, float gas,
                                uint16_t srawVoc, uint16_t srawNox,
                                uint16_t NO2, uint16_t eth, uint16_t VOC, uint16_t COandH2) {
    
    Serial.println("\n=== 📡 Preparing to Send Data ===");
    
    // STEP 1: Disconnect any existing connection
    if (gsm.tcpStatus()) {
        Serial.println("Closing previous connection...");
        gsm.tcpDisconnect();
        delay(500);
    }
    
    // STEP 2: Create JSON payload
    String jsonData = "{";
    jsonData += "\"device_id\":\"EnoseDevice001\",";
    jsonData += "\"timestamp\":" + String(millis()) + ",";
    jsonData += "\"temperature\":" + String(temp, 2) + ",";
    jsonData += "\"humidity\":" + String(hum, 2) + ",";
    
    // Only include pressure if valid (not null)
    if (pres > 0) {
        jsonData += "\"pressure\":" + String(pres, 2) + ",";
    } else {
        jsonData += "\"pressure\":null,";
    }
    
    jsonData += "\"gas\":" + String(gas, 2) + ",";
    jsonData += "\"voc_raw\":" + String(srawVoc) + ",";
    jsonData += "\"nox_raw\":" + String(srawNox) + ",";
    jsonData += "\"no2\":" + String(NO2) + ",";
    jsonData += "\"ethanol\":" + String(eth) + ",";
    jsonData += "\"voc\":" + String(VOC) + ",";
    jsonData += "\"co_h2\":" + String(COandH2);
    jsonData += "}";
    
    Serial.print("JSON size: ");
    Serial.print(jsonData.length());
    Serial.println(" bytes");
    
    // STEP 3: Build HTTP POST request
    String httpRequest = "POST /api/sensor-data HTTP/1.1\r\n";
    httpRequest += "Host: outdated-acclimatable-leoma.ngrok-free.dev\r\n";
    httpRequest += "Content-Type: application/json\r\n";
    httpRequest += "Content-Length: ";
    httpRequest += String(jsonData.length());
    httpRequest += "\r\n";
    httpRequest += "Connection: close\r\n";  // Important: Close connection after response
    httpRequest += "\r\n";
    httpRequest += jsonData;
    
    // STEP 4: Check GPRS connection
    if (!gsm.gprsStatus()) {
        Serial.println("⚠️  GPRS disconnected! Reconnecting...");
        if (!gsm.startGPRS()) {
            Serial.println("❌ GPRS reconnection failed!");
            return false;
        }
        Serial.println("✓ GPRS reconnected");
        delay(1000);
    }
    
    // STEP 5: Connect to server
    Serial.println("Connecting to server...");
    bool connected = gsm.tcpConnect(HOST_NAME, PORT);
    
    if (!connected) {
        Serial.println("❌ TCP connection failed");
        return false;
    }
    
    Serial.println("✓ TCP connected");
    delay(1000); // Wait for connection to stabilize
    
    // STEP 6: Verify connection
    if (!gsm.tcpStatus()) {
        Serial.println("❌ TCP status check failed");
        return false;
    }
    
    // STEP 7: Send the HTTP request
    Serial.println("Sending HTTP request...");
    gsm.tcpSend((char*)httpRequest.c_str());
    Serial.println("✓ Data sent!");
    
    // STEP 8: Wait for and read response
    delay(2000); // Wait for server response
    
    int available = gsm.tcpAvailable();
    if (available > 0) {
        Serial.print("Response available: ");
        Serial.print(available);
        Serial.println(" bytes");
        
        char response[300];
        int bytesToRead = min(available, 299);
        gsm.tcpRead(response, bytesToRead);
        response[bytesToRead] = '\0';
        
        Serial.println("--- Server Response ---");
        Serial.println(response);
        Serial.println("--- End Response ---");
        
        // Check if response contains "success"
        if (strstr(response, "success") != NULL || strstr(response, "200 OK") != NULL) {
            Serial.println("✅ Server confirmed receipt!");
        }
    } else {
        Serial.println("⚠️  No response from server (may be normal)");
    }
    
    // STEP 9: Clean up - ALWAYS disconnect
    Serial.println("Closing connection...");
    gsm.tcpDisconnect();
    delay(500); // Give it time to close
    
    Serial.println("=== ✓ Send Complete ===\n");
    
    return true;
}


// MODIFY your sensor_readings() function to capture and send data:

void sensor_readings() {
    // == BME680 readings ==
    float temp = 0;
    float hum = 0;
    float pres = 0;
    float gas = 0;

    if (!bme680.read_sensor_data()) {
        temp = bme680.sensor_result_value.temperature;
        hum = bme680.sensor_result_value.humidity;
        pres = bme680.sensor_result_value.pressure / 1000.0;
        gas = bme680.sensor_result_value.gas / 1000.0;
    } else {
        Serial.println("BME680 read failed!");
        send_error(SensorBME680_failed_to_read);
        return; // Exit if sensor failed
    }

    // == SGP41 readings ==
    uint16_t error;
    char errorMessage[256];
    uint16_t srawVoc = 0;
    uint16_t srawNox = 0;

    // convert BME680 humidity/temperature to sensor ticks
    uint16_t rhTicks = (uint16_t)(hum * 65535.0f / 100.0f + 0.5f);
    uint16_t tTicks = (uint16_t)(((temp) + 45.0f) * 65535.0f / 175.0f + 0.5f);

    error = sgp41.measureRawSignals(rhTicks, tTicks, srawVoc, srawNox);

    if (error) {
        Serial.print("Error trying to execute measureRawSignals(): ");
        errorToString(error, errorMessage, 256);
        send_error(SensorSGP41_failed_to_read);
        return; // Exit if sensor failed
    }

    // == Multichannel Gas Sensor readings ==
    uint16_t NO2 = gasSensor.getGM102B();
    uint16_t eth = gasSensor.getGM302B();
    uint16_t VOC = gasSensor.getGM502B();
    uint16_t COandH2 = gasSensor.getGM702B();

    // Print to Serial (for debugging)
    unsigned long elapsed = millis();
    Serial.print(elapsed);
    Serial.print(",");
    Serial.print(temp, 2);
    Serial.print(",");
    Serial.print(hum, 2);
    Serial.print(",");
    Serial.print(pres, 2);
    Serial.print(",");
    Serial.print(gas, 2);
    Serial.print(",");
    Serial.print(srawVoc);
    Serial.print(",");
    Serial.print(srawNox);
    Serial.print(",");
    Serial.print(NO2);
    Serial.print(",");
    Serial.print(eth);
    Serial.print(",");
    Serial.print(VOC);
    Serial.print(",");
    Serial.println(COandH2);
    
    // *** SEND VIA GSM ***
    send_sensor_data_via_gsm(temp, hum, pres, gas, srawVoc, srawNox, 
                              NO2, eth, VOC, COandH2);
}


// UPDATE your loop() to control sending frequency:

void loop() {
    static unsigned long lastSendTime = 0;
    const unsigned long SEND_INTERVAL = 5000; // Send every 5 seconds
    
    // Always read sensors
    sensor_readings();
    
    delay(1000); // 1 second between readings
}

// NOTE: sensor_readings() now sends data automatically each time it's called
// The delay(1000) in loop() means it sends every 1 second
// If you want to send less frequently, add a timer check
