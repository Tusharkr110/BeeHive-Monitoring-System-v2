/*
 * Smart Beehive Monitoring System v2.0
 * ESP32 + DHT22 + Sound + Vibration + SIM800L + WiFi
 * 
 * Features:
 * - WiFi connectivity with auto-reconnect
 * - HTTP POST to cloud backend every 30s
 * - Health score calculation (0-100%)
 * - Smart SMS alerts (critical events only)
 * - Local LCD display
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi CREDENTIALS =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";      // Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASS";  // Change this

// ===== BACKEND API =====
// Replace IP below with your computer's local IP address (e.g., http://10.216.19.146:5000/api/hives/data)
const char* API_ENDPOINT = "http://10.216.19.146:5000/api/hives/data";
const char* API_KEY = "beehive_device_key_2026"; // Must match DEVICE_API_KEY in backend .env
const char* HIVE_ID = "HIVE001";  // Unique identifier for this hive
const char* TARGET_PHONE_NUMBER = "+918797726950"; // Replace with your phone number

// ===== PIN SETUP =====
#define DHTPIN 14
#define DHTTYPE DHT22
#define VIB_PIN 33
#define SOUND_PIN 34
#define LED_PIN 2

// ===== GSM UART =====
#define RX2 16   // SIM800L -> ESP32 RX
#define TX2 17   // SIM800L -> ESP32 TX

HardwareSerial sim800(2); // UART2 for SIM800L

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== OPTIMAL RANGES =====
const float TEMP_OPTIMAL_MIN = 32.0;
const float TEMP_OPTIMAL_MAX = 36.0;
const float HUM_OPTIMAL_MIN = 50.0;
const float HUM_OPTIMAL_MAX = 80.0;
const int SOUND_THRESHOLD = 2000;

// ===== CRITICAL THRESHOLDS (for SMS) =====
const float TEMP_CRITICAL_HIGH = 38.0;
const float TEMP_CRITICAL_LOW = 28.0;
const float HUM_CRITICAL_HIGH = 85.0;
const int HEALTH_CRITICAL = 50;  // Health score below 50% triggers SMS

// ===== TIMING =====
unsigned long lastDataSend = 0;
const unsigned long DATA_SEND_INTERVAL = 30000; // 30 seconds
unsigned long lastSMSAlert = 0;
const unsigned long SMS_COOLDOWN = 300000; // 5 minutes between SMS

// ===== STATE =====
bool wifiConnected = false;
bool smsAlertActive = false;

volatile bool rawVibTriggered = false;
void IRAM_ATTR vibrationISR() {
  rawVibTriggered = true;
}

// ===== FUNCTION PROTOTYPES =====
void connectWiFi();
void sendDataToBackend(float temp, float hum, int sound, int vib, float health);
float calculateHealthScore(float temp, float hum, int sound, int vib);
void sendSMS(String msg);
void checkCriticalAlerts(float temp, float hum, int vib, float health);

void setup() {
  Serial.begin(115200);
  
  // Hardware setup
  pinMode(VIB_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(VIB_PIN), vibrationISR, RISING);
  pinMode(LED_PIN, OUTPUT);
  dht.begin();
  
  // LCD Setup
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Beehive Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
  // GSM Setup
  sim800.begin(9600, SERIAL_8N1, RX2, TX2);
  delay(1000);
  sim800.println("AT"); // Test GSM
  delay(500);
  
  // WiFi Setup
  connectWiFi();
  
  lcd.clear();
  lcd.print("System Ready");
  delay(2000);
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  } else {
    wifiConnected = true;
  }
  
  // Read sensors
  digitalWrite(LED_PIN, HIGH);
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int rawVib = digitalRead(VIB_PIN);
  if (rawVibTriggered) {
    rawVib = HIGH;
    rawVibTriggered = false;
  }
  int vib = rawVib; // Strictly raw instantaneous vibration
  int sound = analogRead(SOUND_PIN);
  
  // Validate sensor readings
  if (isnan(h) || isnan(t)) {
    Serial.println("DHT22 read failed!");
    h = 0;
    t = 0;
  }
  
  // Calculate health score
  float healthScore = calculateHealthScore(t, h, sound, vib);
  
  // Update LCD
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(t, 1);
  lcd.print("C H:");
  lcd.print((int)h);
  lcd.print("%  ");
  
  lcd.setCursor(0, 1);
  lcd.print("HP:");
  lcd.print((int)healthScore);
  lcd.print("% ");
  lcd.print(vib == HIGH ? "VIB!" : "    ");
  
  // Check for critical alerts (SMS)
  checkCriticalAlerts(t, h, vib, healthScore);
  
  // Send data to backend every 30 seconds
  unsigned long currentMillis = millis();
  if (wifiConnected && (currentMillis - lastDataSend >= DATA_SEND_INTERVAL)) {
    sendDataToBackend(t, h, sound, vib, healthScore);
    lastDataSend = currentMillis;
  }
  
  // Print to Serial for debugging
  Serial.printf("Temp: %.1f°C | Hum: %.1f%% | Sound: %d | Vib: %s | Health: %.1f%%\n", 
                t, h, sound, vib == HIGH ? "YES" : "NO", healthScore);
  
  digitalWrite(LED_PIN, LOW);
  delay(1000); // 1 second loop
}

// ===== WiFi CONNECTION =====
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  lcd.clear();
  lcd.print("WiFi Connect...");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    lcd.setCursor(0, 1);
    lcd.print("WiFi OK         ");
    wifiConnected = true;
  } else {
    Serial.println("\nWiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("WiFi FAILED     ");
    wifiConnected = false;
  }
  delay(1000);
}

// ===== HEALTH SCORE CALCULATION =====
// Returns 0-100% based on how close readings are to optimal ranges
float calculateHealthScore(float temp, float hum, int sound, int vib) {
  float score = 100.0;
  
  // Temperature penalty (0-40 points)
  if (temp < TEMP_OPTIMAL_MIN || temp > TEMP_OPTIMAL_MAX) {
    float tempDeviation;
    if (temp < TEMP_OPTIMAL_MIN) {
      tempDeviation = TEMP_OPTIMAL_MIN - temp;
    } else {
      tempDeviation = temp - TEMP_OPTIMAL_MAX;
    }
    float tempPenalty = min(40.0, tempDeviation * 10.0);  // 1°C = 10 points
    score -= tempPenalty;
  }
  
  // Humidity penalty (0-30 points)
  if (hum < HUM_OPTIMAL_MIN || hum > HUM_OPTIMAL_MAX) {
    float humDeviation;
    if (hum < HUM_OPTIMAL_MIN) {
      humDeviation = HUM_OPTIMAL_MIN - hum;
    } else {
      humDeviation = hum - HUM_OPTIMAL_MAX;
    }
    float humPenalty = min(30.0, humDeviation * 0.5);  // 2% = 1 point
    score -= humPenalty;
  }
  
  // Sound penalty (0-20 points)
  if (sound > SOUND_THRESHOLD) {
    float soundPenalty = min(20.0, (sound - SOUND_THRESHOLD) / 50.0);
    score -= soundPenalty;
  }
  
  // Vibration penalty (immediate -10 points)
  if (vib == HIGH) {
    score -= 10.0;
  }
  
  // Clamp score to 0-100
  score = max(0.0, min(100.0, score));
  
  return score;
}

// ===== SEND DATA TO BACKEND =====
void sendDataToBackend(float temp, float hum, int sound, int vib, float health) {
  if (!wifiConnected) return;
  
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["hive_id"] = HIVE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["sound_level"] = sound;
  doc["vibration"] = (vib == HIGH) ? 1 : 0;
  doc["health_score"] = health;
  doc["timestamp"] = millis();
  
  String jsonData;
  serializeJson(doc, jsonData);
  
  Serial.println("Sending to backend: " + jsonData);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("Backend response [%d]: %s\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("HTTP POST failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

// ===== CRITICAL ALERT CHECKER =====
void checkCriticalAlerts(float temp, float hum, int vib, float health) {
  bool isCritical = false;
  String alertMsg = "CRITICAL HIVE ALERT!\n";
  
  // Check critical conditions
  if (temp > TEMP_CRITICAL_HIGH) {
    isCritical = true;
    alertMsg += "Temp VERY HIGH: " + String(temp, 1) + "C\n";
  }
  if (temp < TEMP_CRITICAL_LOW) {
    isCritical = true;
    alertMsg += "Temp VERY LOW: " + String(temp, 1) + "C\n";
  }
  if (hum > HUM_CRITICAL_HIGH) {
    isCritical = true;
    alertMsg += "Humidity CRITICAL: " + String(hum, 1) + "%\n";
  }
  if (vib == HIGH) {
    isCritical = true;
    alertMsg += "VIBRATION DETECTED!\n";
  }
  if (health < HEALTH_CRITICAL) {
    isCritical = true;
    alertMsg += "Health Score: " + String((int)health) + "%\n";
  }
  
  // Send SMS if critical and cooldown period passed
  unsigned long currentMillis = millis();
  if (isCritical && (currentMillis - lastSMSAlert >= SMS_COOLDOWN)) {
    sendSMS(alertMsg);
    lastSMSAlert = currentMillis;
    smsAlertActive = true;
  }
  
  // Reset alert flag if no longer critical
  if (!isCritical) {
    smsAlertActive = false;
  }
}

// ===== SEND SMS =====
void sendSMS(String msg) {
  Serial.println("Sending SMS Alert...");
  
  sim800.println("AT+CMGF=1");  // Text mode
  delay(500);
  sim800.println("AT+CMGS=\"" + String(TARGET_PHONE_NUMBER) + "+918797726950"");  // Your phone number
  delay(500);
  sim800.println(msg);
  delay(500);
  sim800.write(26);  // CTRL+Z to send
  delay(2000);
  
  Serial.println("SMS Sent!");
}
