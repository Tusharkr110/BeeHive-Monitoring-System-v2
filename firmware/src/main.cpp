#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "arduinoFFT.h"

/*
 * Smart Beehive Monitoring System v3.0
 * ESP32 + DHT22 + Sound (FFT) + Vibration + SIM800L + WiFi
 */

// ===== WiFi CREDENTIALS =====
const char* WIFI_SSID = "Redmi 10";
const char* WIFI_PASSWORD = "12345678";

// ===== BACKEND API =====
const char* API_ENDPOINT = "http://10.76.148.146:5000/api/hives/data";
const char* HIVE_ID = "HIVE001";

const char* DEVICE_API_KEY = "beehive_device_key_2026"; // For future authentication implementation

// ===== PIN SETUP =====
#define DHTPIN 14
#define DHTTYPE DHT22
#define VIB_PIN 33
#define SOUND_PIN 34  // Analog Input Pin for Acoustic FFT Analysis (KY-037)
#define LED_PIN 2

// ===== GSM UART =====
#define RX2 16
#define TX2 17

HardwareSerial sim800(2);

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== FFT CONFIGURATION =====
const uint16_t SAMPLES = 1024;          // Must be a power of 2
const double SAMPLING_FREQUENCY = 8000; // 8kHz sampling rate for honeybee acoustics
unsigned int sampling_period_us;
double vReal[SAMPLES];
double vImag[SAMPLES];

// Create the FFT object
ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, SAMPLES, SAMPLING_FREQUENCY);

// ===== OPTIMAL RANGES =====
const float TEMP_OPTIMAL_MIN = 32.0;
const float TEMP_OPTIMAL_MAX = 36.0;
const float HUM_OPTIMAL_MIN = 50.0;
const float HUM_OPTIMAL_MAX = 80.0;
const int SOUND_THRESHOLD = 2000;

// ===== CRITICAL THRESHOLDS =====
const float TEMP_CRITICAL_HIGH = 38.0;
const float TEMP_CRITICAL_LOW = 28.0;
const float HUM_CRITICAL_HIGH = 85.0;
const int HEALTH_CRITICAL = 50;

// ===== TIMING =====
unsigned long lastDataSend = 0;
const unsigned long DATA_SEND_INTERVAL = 3000;
unsigned long lastSMSAlert = 0;
const unsigned long SMS_COOLDOWN = 300000;

unsigned long lastSignalCheck = 0;
const unsigned long SIGNAL_CHECK_INTERVAL = 15000; // Profile GSM metrics every 15s

// ===== STATE =====
bool gsmReady = false;
bool wifiConnected = false;
bool smsAlertActive = false;
int gsmSignalStrength = 0; // 0% to 100%
String gsmStatus = "Unknown";
String fftPayload = "";    // Holds CSV format of 20 frequency buckets

// ===== FUNCTION PROTOTYPES =====
void connectWiFi();
void sendDataToBackend(float temp, float hum, int sound, int vib, float health);
float calculateHealthScore(float temp, float hum, int sound, int vib);
void sendSMS(String msg);
void checkCriticalAlerts(float temp, float hum, int vib, float health);
void checkSignalStrength();
bool diagnoseGSM();
void executeFFTAnalysis();

// ======================================================
// SETUP
// ======================================================

void setup() {
    Serial.begin(115200);

    pinMode(VIB_PIN, INPUT);
    pinMode(LED_PIN, OUTPUT);
    pinMode(SOUND_PIN, INPUT);

    dht.begin();

    // 1 / 8000 Hz = 125 microseconds sampling window
    sampling_period_us = round(1000000 * (1.0 / SAMPLING_FREQUENCY));

    Wire.begin(21, 22);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("Beehive Monitor");
    lcd.setCursor(0, 1);
    lcd.print("Initializing...");

    Serial.println("\n--- Starting GSM Hardware Diagnostics ---");
    sim800.begin(9600, SERIAL_8N1, RX2, TX2);
    delay(1000);
    gsmReady = diagnoseGSM();

    if (!gsmReady) {
        Serial.println("[⚠️] 9600 Baud unresponsive. Shifting to factory 115200 Baud...");
        sim800.begin(115200, SERIAL_8N1, RX2, TX2);
        delay(1000);
        gsmReady = diagnoseGSM();
    }

    if (gsmReady) {
        Serial.println("[✅] GSM Status: Online & Communicating.");
        lcd.setCursor(0, 1);
        lcd.print("GSM Mod: OK     ");
        
        sim800.println("AT+CPIN?");
        delay(500);
        sim800.println("AT+CREG?");
        delay(500);
        checkSignalStrength();
    } else {
        Serial.println("[❌] CRITICAL: GSM Connection Failed. Proceeding using WiFi fallback.");
        lcd.setCursor(0, 1);
        lcd.print("GSM Mod: FAILED ");
        delay(2000);
    }

    connectWiFi();

    lcd.clear();
    lcd.print("System Ready");
    delay(2000);
}

// ======================================================
// LOOP
// ======================================================

void loop() {
    unsigned long currentMillis = millis();

    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        connectWiFi();
    } else {
        wifiConnected = true;
    }

    digitalWrite(LED_PIN, HIGH);

    // 1. Environmental & Mechanical Data Acquisition
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int vib = digitalRead(VIB_PIN);
    int soundRaw = analogRead(SOUND_PIN);

    if (isnan(h) || isnan(t)) {
        Serial.println("DHT22 read failed!");
        h = 0;
        t = 0;
    }

    // 2. Perform Real-time FFT Audio Feature Extraction
    executeFFTAnalysis();

    float healthScore = calculateHealthScore(t, h, soundRaw, vib);

    // 3. Dynamic non-blocking GSM network sweeps
    if (gsmReady && (currentMillis - lastSignalCheck >= SIGNAL_CHECK_INTERVAL)) {
        checkSignalStrength();
        lastSignalCheck = currentMillis;
    }

    // Update Display Panels
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(t, 1);
    lcd.print("C H:");
    lcd.print((int)h);
    lcd.print("%  ");

    lcd.setCursor(0, 1);
    lcd.print("H:");
    lcd.print((int)healthScore);
    lcd.print("% GSM:");
    if (gsmReady) {
        lcd.print(gsmSignalStrength);
        lcd.print("% ");
    } else {
        lcd.print("ERR");
    }

    checkCriticalAlerts(t, h, vib, healthScore);

    // 4. Data Routing Engine
    if (wifiConnected && (currentMillis - lastDataSend >= DATA_SEND_INTERVAL)) {
        sendDataToBackend(t, h, soundRaw, vib, healthScore);
        lastDataSend = currentMillis;
    }

    Serial.printf("Temp: %.1f°C | Hum: %.1f%% | Sound Raw: %d | Vib: %s | Health: %.1f%% | GSM: %d%%\n",
                  t, h, soundRaw, vib == HIGH ? "YES" : "NO", healthScore, gsmSignalStrength);

    digitalWrite(LED_PIN, LOW);
    delay(1000);
}

// ======================================================
// WIFI INFRASTRUCTURE CONNECTION
// ======================================================
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    
    Serial.print("Connecting to local WiFi network: ");
    Serial.println(WIFI_SSID);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int counter = 0;
    // Attempt non-blocking connection cycle check up to 15 times
    while (WiFi.status() != WL_CONNECTED && counter < 15) {
        delay(500);
        Serial.print(".");
        counter++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[✅] WiFi Network Link Established!");
        Serial.print("IP Address assigned: ");
        Serial.println(WiFi.localIP());
        wifiConnected = true;
    } else {
        Serial.println("\n[⚠️] WiFi connection timed out. Standing down for fallback loop.");
        wifiConnected = false;
    }
}

// ======================================================
// SMART HEALTH SCORE EVALUATION HEURISTIC
// ======================================================
float calculateHealthScore(float temp, float hum, int sound, int vib) {
    float score = 100.0;

    // 1. Evaluate Thermoregulation Stability Boundaries
    if (temp < TEMP_OPTIMAL_MIN) {
        score -= (TEMP_OPTIMAL_MIN - temp) * 4.0; // Deduct penalties relative to cold variance
    } else if (temp > TEMP_OPTIMAL_MAX) {
        score -= (temp - TEMP_OPTIMAL_MAX) * 5.0; // Heavy penalty for brood-nest overheating
    }

    // 2. Evaluate Micro-climate Ambient Humidity
    if (hum < HUM_OPTIMAL_MIN) {
        score -= (HUM_OPTIMAL_MIN - hum) * 1.5;
    } else if (hum > HUM_OPTIMAL_MAX) {
        score -= (hum - HUM_OPTIMAL_MAX) * 2.0;
    }

    // 3. Evaluate Mechanical Structural Intrusion (Vibration)
    if (vib == HIGH) {
        score -= 25.0; // Instant 25% drop for structural shake alerts (predator/knocking)
    }

    // Contain limits strictly within 0% to 100% bounds
    if (score > 100.0) score = 100.0;
    if (score < 0.0) score = 0.0;

    return score;
}

// ======================================================
// THRESHOLD MONITORING & CRITICAL ALERT COOLDOWN GATE
// ======================================================
void checkCriticalAlerts(float temp, float hum, int vib, float health) {
    unsigned long currentMillis = millis();
    String alertMsg = "";

    // Parse and concatenate critical fault triggers
    if (temp > TEMP_CRITICAL_HIGH) {
        alertMsg += "CRITICAL OVERHEATING: " + String(temp, 1) + "C. ";
    } else if (temp < TEMP_CRITICAL_LOW) {
        alertMsg += "CRITICAL FREEZING: " + String(temp, 1) + "C. ";
    }

    if (hum > HUM_CRITICAL_HIGH) {
        alertMsg += "CRITICAL CONDENSATE: " + String(hum, 0) + "%. ";
    }

    if (vib == HIGH) {
        alertMsg += "PREDATOR/STRUCTURAL VIBRATION ALERT. ";
    }

    if (health < HEALTH_CRITICAL) {
        alertMsg += "HIVE DECAYING. TOTAL HEALTH LEVEL CRITICAL: " + String(health, 0) + "%. ";
    }

    // Execute SMS Dispatch Engine if a threat exists and cooldown has expired
    if (alertMsg != "" && (currentMillis - lastSMSAlert >= SMS_COOLDOWN)) {
        Serial.println("[🚨] Critical Threshold Crossed! Initiating GSM SMS Routing...");
        sendSMS("Hive " + String(HIVE_ID) + " " + alertMsg);
        lastSMSAlert = currentMillis;
    }
}

// ======================================================
// GSM TELEMETRY TEXT TRANSMISSION INTERFACE (SIM800L)
// ======================================================
void sendSMS(String msg) {
    if (!gsmReady) {
        Serial.println("[❌] SMS Aborted: GSM Module offline/failed initialized state.");
        return;
    }

    Serial.println("Transmitting SMS Warning to administrator dashboard...");
    
    sim800.println("AT+CMGF=1"); // Configure text formatting mode
    delay(200);
    
    // Replace with your targeted testing smartphone notification number
    sim800.println("AT+CMGS=\"+919128724343\""); 
    delay(200);
    
    sim800.print(msg);
    delay(200);
    
    sim800.write(26); // ASCII character code termination character command (Ctrl+Z)
    delay(3000); 
    
    Serial.println("[✅] SMS Task Pipeline processed completely.");
}

// ======================================================
// BACKEND API TRANSCEIVER ROUTING ENGINE (JSON HTTP POST)
// ======================================================
void sendDataToBackend(float temp, float hum, int sound, int vib, float health) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[❌] Transmission Aborted: No active WiFi Link available.");
        return;
    }

    

    HTTPClient http;
    http.begin(API_ENDPOINT);

    http.addHeader("Content-Type", "application/json");


    // For future authentication implementation, we can include an API key in the header to secure our endpoint
    http.addHeader(
        "x-api-key", DEVICE_API_KEY); 
        
        

    // Allocate JSON memory pipeline space
    StaticJsonDocument<768> jsonDoc;
    jsonDoc["hive_id"] = HIVE_ID;
    jsonDoc["temperature"] = temp;
    jsonDoc["humidity"] = hum;
    jsonDoc["sound_level"] = sound;
    jsonDoc["vibration"] = (vib == HIGH) ? 1 : 0;
    jsonDoc["health_score"] = health;
    jsonDoc["fft_features"] = fftPayload; // Streams your 20 local edge-computed frequency buckets

    String jsonPayload;
    serializeJson(jsonDoc, jsonPayload);

    Serial.println("Pushing localized Telemetry to Central Data Hub...");
    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("[✅] Post Successful! HTTP Status Code: %d\n", httpResponseCode);
        Serial.println("Server Response payload: " + response);

        // Parse ML prediction from backend response
        StaticJsonDocument<256> respDoc;
        DeserializationError err = deserializeJson(respDoc, response);
        if (!err) {
            const char* pred = respDoc["ml_prediction"] | "unavailable";
            float       conf = respDoc["ml_confidence"] | 0.0f;
            Serial.printf("[ML] Prediction: %s (%.1f%% confidence)\n", pred, conf);

            // Show ML result on LCD line 2 briefly
            lcd.setCursor(0, 1);
            lcd.print("ML:");
            lcd.print(String(pred).substring(0, 10));
            lcd.print("      ");
        }
    } else {
        Serial.printf("[❌] Transmission Error. API Failure Code: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
}

// ======================================================
// FFT ACOUSTIC ENGINE
// ======================================================
void executeFFTAnalysis() {
    // Collect 1024 timed audio wave readings 
    for (int i = 0; i < SAMPLES; i++) {
        unsigned long microseconds = micros();
        vReal[i] = analogRead(SOUND_PIN);
        vImag[i] = 0; // Imaginary component initialized to zero
        
        // Accurate timing guard against background thread latency anomalies
        while ((micros() - microseconds) < sampling_period_us) {
            if (micros() - microseconds > (sampling_period_us + 1000)) break; 
        }
    }

    // Process Array via Forward Hamming Window FFT Algorithms
    FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD); 
    FFT.compute(FFT_FORWARD);
    FFT.complexToMagnitude();

    // Map output array space safely into 20 structural frequency buckets
    fftPayload = "";
    int bucketSize = (SAMPLES / 2) / 20; 
    
    for (int b = 0; b < 20; b++) {
        double sum = 0;
        for (int i = 0; i < bucketSize; i++) {
            sum += vReal[(b * bucketSize) + i];
        }
        fftPayload += String(sum / bucketSize, 2); 
        if (b < 19) fftPayload += ",";
    }
}

// ======================================================
// GSM DIAGNOSTIC HANDSHAKE TEST
// ======================================================
bool diagnoseGSM() {
    int retry = 0;
    while (retry < 5) {
        while(sim800.available()) { sim800.read(); } 
        
        Serial.printf("Probing SIM800L Link... Attempt %d/5\n", retry + 1);
        sim800.println("AT");

        unsigned long start = millis();
        String reply = "";
        while (millis() - start < 800) {
            if (sim800.available()) {
                reply += (char)sim800.read();
            }
        }

        if (reply.indexOf("OK") != -1) {
            return true;
        }
        retry++;
        delay(300);
    }
    return false;
}

// ======================================================
// CHECK GSM SIGNAL STRENGTH (AT+CSQ)
// ======================================================
void checkSignalStrength() {
    if (!gsmReady) return;

    while (sim800.available()) {
        sim800.read();
    }

    sim800.println("AT+CSQ");

    unsigned long startTime = millis();
    String response = "";

    while (millis() - startTime < 1000) {
        if (sim800.available()) {
            char c = sim800.read();
            response += c;
        }
    }

    int csqIndex = response.lastIndexOf("+CSQ:");

    if (csqIndex != -1) {
        int commaIndex = response.indexOf(",", csqIndex);

        if (commaIndex != -1) {
            String rssiRaw = response.substring(csqIndex + 6, commaIndex);
            rssiRaw.trim();

            int rssi = rssiRaw.toInt();

            if (rssi == 99) {
                gsmSignalStrength = 0;
                gsmStatus = "No Signal";
            } else {
                gsmSignalStrength = map(rssi, 0, 31, 0, 100);

                if (rssi >= 20)
                    gsmStatus = "Excellent";
                else if (rssi >= 15)
                    gsmStatus = "Good";
                else if (rssi >= 10)
                    gsmStatus = "Fair";
                else
                    gsmStatus = "Poor";
            }

            Serial.printf("GSM Signal: %d%% (%s)\n", gsmSignalStrength, gsmStatus.c_str());
        }
    }
}