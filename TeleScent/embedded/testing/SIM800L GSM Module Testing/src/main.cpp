#include <Arduino.h>
#include <HardwareSerial.h>
#include <SIM800L.h>

HardwareSerial GSMserial(1); // RX, TX
SIM800L gsm;

bool gsmbegin_f = 0;
bool gprsstart_f = 0;
int i = 0;

void setup() {
	Serial.begin(115200);
	GSMserial.begin(9600, SERIAL_8N1, 9, 8);
	while (!Serial) {
	}
	delay(1000);
	Serial.println("================================");
	Serial.println("Started the code!");
	Serial.println("================================");
	Serial.flush();
}

void loop() {
	int strength;
	int size;

	while(1){

		i++;
		Serial.println();
		Serial.println("Beginning of loop iteration: " + String(i));

		if (!gsmbegin_f) {
			Serial.println("Starting GSM...");
			if (gsm.begin(GSMserial)) // Will return 1 if GSM responds and SIM card is inserted
			{
				strength = gsm.signalStrength(); // get signal strength (0-31, where 0 is minimum and 31 is maximum)
				Serial.println("GSM Initialized, signal strength: " + String(strength));
				gsmbegin_f = 1;
			} else {
				strength = gsm.signalStrength();
				Serial.println("GSM not responding, signal strength: " + String(strength));
				continue;
			}
		}

		if (!gprsstart_f) {
			Serial.println("Starting GPRS...");
			if (gsm.startGPRS()) {
				Serial.println("GPRS started");
				gprsstart_f = 1; // set GPRS flag to indicate successful gprs initalization
			} else {
				Serial.println("GPRS failed to start");
				continue;
			}
		}

		strength = gsm.signalStrength();
		Serial.println("Signal strength: " + String(strength));

		Serial.println("Attempting to connect to web server through TCP: ");
		gsm.tcpConnect("outdated-acclimatable-leoma.ngrok-free.dev", 80);

		delay(100); // wait for connection to establish
		
		if (gsm.tcpStatus()) {
			Serial.println("TCP connection successful");
		} else {
			Serial.println("TCP connection failed");
			gprsstart_f = 0; // reset GPRS flag to retry in next iteration
			continue;
		}

		char buffer1[20];
		sprintf(buffer1, "Message number %d", i);
		gsm.tcpSend(buffer1);
		Serial.println("TCP Sent the message");

		// char buffer2[20];
		// size = gsm.tcpAvailable();
		// Serial.println("TCP Available size: " + String(size));
		// gsm.tcpRead(buffer2, size);
		// Serial.print("TCP Received a message: " + String(buffer2));

	}
}
