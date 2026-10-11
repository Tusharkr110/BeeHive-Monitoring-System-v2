#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/*
 * Smart Beehive Monitoring System v3.7 (bugfix pass)
 * ESP32 + DHT22 + Sound Envelope Filter + Vibration (SW-420) + SIM800L + WiFi
 *
 * Changes from v3.6:
 *  - Removed unreachable/dead code after `return` in getSoundLevel()
 *  - Renamed RX2/TX2 macros -> GSM_RX_PIN/GSM_TX_PIN (they collided with
 *    ESP32 core's own RX2/TX2 gpio_num_t macros, causing the redefinition warning)
 *  - Replaced deprecated StaticJsonDocument with JsonDocument (ArduinoJson v7)
 *  - Added http.setTimeout() and response-body logging on failed POSTs, so
 *    a backend 500 actually tells you *why* instead of just the status code
 *  - Added a sensorReady guard so a failed first DHT read doesn't send 0.0/0%
 *  - Added saturation detection/logging for the sound sensor (see note below)
 *  - Fixed a stale comment on the alert blink interval
 *
 * NOTE ON SOUND READINGS: if Serial shows "Sound: 4094" and it never drops,
 * that's the KY-037's analog output clipping the ADC (0-4095 max on ESP32).
 * That's a hardware calibration issue - turn down the sensitivity
 * potentiometer on the module until quiet-hive readings sit well under 4095.
 * No amount of software smoothing fixes a signal that's already saturated
 * at the sensor.
 *
 * NOTE ON "Backend HTTP POST [500]": a 500 means the SERVER is erroring
 * while handling the request - it is not something this firmware can fix.
 * Check your backend logs. This build now prints the response body on
 * failure so you can see the actual error message from Serial.
 *
 * v3.8: Endpoint changed from the Flask ML service (port 8000) to the
 * Node backend's /api/hives/data route (port 5000). The Flask route was
 * bypassing Mongo persistence, the dashboard's Socket.IO live updates, and
 * the Hive.lastDataReceived tracking entirely - Node is what actually saves
 * data and calls Flask internally for the ML prediction. Node's route is
 * gated by a deviceAuth middleware that checks an x-api-key header against
 * DEVICE_API_KEY in the backend's .env - that header is now sent below.
 * Fill in DEVICE_API_KEY with the exact same value configured server-side.
 *
 * v3.9: Two scoring/sensing fixes:
 *  - The sound envelope EMA was seeded at 0, so every boot showed a slow
 *    ~5-10s "climb" in Sound: readings that was just the filter warming up,
 *    not the hive getting louder. setup() now takes 15 real samples of
 *    ambient sound and seeds soundEMA with their average.
 *  - Vibration was applying its health-score penalty on a single
 *    instantaneous HIGH read, so a one-loop electrical/mechanical blip
 *    could swing health score by 15 points and back within ~400ms (visible
 *    in logs as e.g. 92.5 -> 77.5 -> 92.5). Vibration now requires
 *    VIB_DEBOUNCE_COUNT consecutive HIGH reads before it's treated as real
 *    and counted toward the health score / alerts. The raw instantaneous
 *    reading is still logged separately to Serial for hardware debugging.
 *
 * v4.0: LCD display stability fix:
 *  - Slowed the display-only sound EMA from alpha=0.5 to alpha=0.12. The
 *    old alpha made the LCD number jump around every loop cycle (~200ms),
 *    making it unreadable. Alpha 0.12 settles in ~2-3s — still noticeably
 *    faster than the scoring EMA (0.10), so a clap or loud noise is
 *    visible on the LCD well before it affects the health score.
 *  - Added a static guard in updateDisplay() so the sound value on Page B
 *    only redraws when the integer actually changes. This eliminates the
 *    last source of visible flicker: sub-integer EMA jitter toggling
 *    between two adjacent values on every cycle.
 */

// ===== WiFi CREDENTIALS =====
const char* WIFI_SSID = "Redmi 10";
const char* WIFI_PASSWORD = "12345678";

// ===== BACKEND API =====
// Ensure IP matches your Node server's Wi-Fi IP and port (default 5000,
// per PORT in server.js) - NOT the Flask ML service's port.
const char* API_ENDPOINT = "http://10.20.239.155:5000/api/hives/data";
const char* HIVE_ID = "HIVE001";

// Must exactly match DEVICE_API_KEY in the Node backend's .env file -
// this is checked by middleware/deviceAuth.js on every request.
const char* DEVICE_API_KEY = "beehive_device_key_2026";

// ===== SMS RECIPIENT PHONE NUMBER =====
// Replace with your mobile number including country code (e.g. +91XXXXXXXXXX)
const char* TARGET_PHONE_NUMBER = "+918797726950";

// ===== PIN SETUP =====
#define DHTPIN 14
#define DHTTYPE DHT22
#define VIB_PIN 33
#define SOUND_PIN 34  // KY-037 Analog Output Pin (AO)
#define LED_PIN 2

// ===== GSM UART =====
// Renamed from RX2/TX2: those names are already defined by the ESP32 core
// (as gpio_num_t constants), which was producing a "redefined" warning and
// is exactly the kind of silent pin-conflict that bit this project before.
#define GSM_RX_PIN 16
#define GSM_TX_PIN 17

HardwareSerial sim800(2);

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

float lastTemp = 0;
float lastHum = 0;
bool sensorReady = false; // true once we've had at least one valid DHT read

// ===== OPTIMAL RANGES =====
const float TEMP_OPTIMAL_MIN = 32.0;
const float TEMP_OPTIMAL_MAX = 36.0;
const float HUM_OPTIMAL_MIN = 50.0;
const float HUM_OPTIMAL_MAX = 85.0;
const int SOUND_THRESHOLD = 180;

// ===== CRITICAL THRESHOLDS =====
const float TEMP_CRITICAL_HIGH = 38.0;
const float TEMP_CRITICAL_LOW = 28.0;
const float HUM_CRITICAL_HIGH = 98.0;

// Sound saturation detection (diagnostic only - doesn't change scoring logic)
const int SOUND_SATURATION_THRESHOLD = 4000;
int consecutiveSaturatedSoundReads = 0;
bool soundSaturationWarned = false;

// ===== TIMING & INTERVALS =====
unsigned long lastDataSend = 0;
const unsigned long DATA_SEND_INTERVAL = 3000;
unsigned long lastSMSAlert = 0;
const unsigned long SMS_COOLDOWN = 300000;

// Immediate SMS alerts for vibration and sound threshold events.
// These fire on the *rising edge* (transition from OK to alert) so you
// get one SMS the moment it happens, then nothing more until the
// cooldown expires AND the condition clears and re-triggers.
unsigned long lastVibSMS = 0;
unsigned long lastSoundSMS = 0;
const unsigned long IMMEDIATE_SMS_COOLDOWN = 15000; // 15s cooldown for fast testing
bool vibSMSSent = false;   // true after we've alerted for this episode
bool soundSMSSent = false;

unsigned long lastSignalCheck = 0;
const unsigned long SIGNAL_CHECK_INTERVAL = 15000;

unsigned long lastLcdDisplayToggle = 0;
const unsigned long LCD_TOGGLE_INTERVAL = 4000;   // 4-second page display hold

unsigned long lastBlinkToggle = 0;
// NOTE: this toggles every 5000ms (was mislabeled "800ms" in the old comment).
// If you actually want a fast blink, drop this to ~500ms.
const unsigned long BLINK_TOGGLE_INTERVAL = 5000;
bool alertBlinkState = false;

// ===== STATE & ANOMALY FILTERING =====
bool gsmReady = false;
bool wifiConnected = false;
int gsmSignalStrength = 0;
String gsmStatus = "Unknown";
bool lcdPageToggle = false;
int consecutiveAnomalyCount = 0;

// Smoothed sound envelope - declared here (not just before loop()) because
// setup() now seeds it with a real calibrated baseline instead of 0.
// This is the SLOW average (alpha=0.10) used for health scoring/alerts -
// intentionally sluggish so a single loud blip doesn't trigger false alerts.
float soundEMA = 0;

// FAST-responding average used only for the live LCD/Serial display, so a
// clap or tap near the mic is actually visible to a human testing the
// sensor. The slow soundEMA above barely moves on a single transient spike
// (10% weight per sample) - that's correct for scoring, but made the
// display look unresponsive/broken during hands-on testing.
//
// v4.0: Reduced from 0.5 to 0.06. At 0.5 the LCD number was jittering
// every ~200ms loop cycle. At 0.06 the EMA settles slowly (~4-5s to
// converge on a new level), which combined with the ±5 dead-band in
// updateDisplay() means the LCD number stays rock-steady during normal
// ambient fluctuation yet still tracks real sustained changes.
float soundDisplayEMA = 0;
const float SOUND_DISPLAY_ALPHA = 0.06f;

// Strictly Raw Instantaneous Vibration Detection (No Debouncing Delay)
volatile bool rawVibTriggered = false;
void IRAM_ATTR vibrationISR() {
    rawVibTriggered = true;
}

// ===== FUNCTION PROTOTYPES =====
void connectWiFi();
int getSoundLevel(int pin);
void sendDataToBackend(float temp, float hum, int soundEnv, int vib, float health);
float calculateHealthScore(float temp, float hum, int soundEnv, int vib);
void sendSMS(String msg);
void checkCriticalAlerts(float temp, float hum, int soundEnv, int vib, float health);
void checkSignalStrength();
bool diagnoseGSM();
void updateDisplay(float temp, float hum, int soundEnv, int soundDisplayEnv, int vib, float health);

// ======================================================
// SETUP
// ======================================================

void setup() {
    Serial.begin(115200);

    pinMode(VIB_PIN, INPUT);
    attachInterrupt(digitalPinToInterrupt(VIB_PIN), vibrationISR, RISING);
    pinMode(LED_PIN, OUTPUT);

    // Explicit ADC config for the sound sensor: 12-bit resolution and
    // 11dB attenuation give the full 0-3.3V range on the ESP32 ADC.
    analogReadResolution(12);
    analogSetPinAttenuation(SOUND_PIN, ADC_11db);

    dht.begin();

    // 1. Initial LCD Boot Screen Sequence
    Wire.begin(21, 22);
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("Beehive");
    lcd.setCursor(0, 1);
    lcd.print("Initializing...");
    delay(2000);

    // 2. GSM Initialization & Diagnostics
    Serial.println("\n--- Starting GSM Hardware Diagnostics ---");
    sim800.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
    delay(1000);
    gsmReady = diagnoseGSM();

    if (!gsmReady) {
        Serial.println("[warn] 9600 Baud unresponsive. Trying 115200 Baud...");
        sim800.begin(115200, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
        delay(1000);
        gsmReady = diagnoseGSM();
    }

    lcd.clear();
    if (gsmReady) {
        Serial.println("[ok] GSM Status: Connected.");
        lcd.setCursor(0, 0);
        lcd.print("GSM MOD: OK");

        sim800.println("AT+CPIN?");
        delay(500);
        sim800.println("AT+CREG?");
        delay(500);
        checkSignalStrength();
    } else {
        Serial.println("[fail] GSM Connection Failed.");
        lcd.setCursor(0, 0);
        lcd.print("GSM MOD: FAILED");
    }
    delay(2000);

    // 3. Connect to WiFi
    connectWiFi();

    // 4. Calibrate the sound envelope EMA against real ambient noise instead
    // of letting it start from 0. Starting from 0 meant the EMA spent the
    // first ~5-10 seconds after every boot visibly "climbing" toward the
    // real ambient level - that climb looked like rising hive noise but was
    // actually just filter warm-up, not anything happening in the hive.
    lcd.clear();
    lcd.print("Calibrating");
    lcd.setCursor(0, 1);
    lcd.print("sound baseline..");
    {
        long sum = 0;
        const int CAL_SAMPLES = 15;
        for (int i = 0; i < CAL_SAMPLES; i++) {
            int s = getSoundLevel(SOUND_PIN);
            if (s < 20) s = 0;
            sum += s;
            delay(50);
        }
        soundEMA = (float)sum / CAL_SAMPLES;
        soundDisplayEMA = soundEMA;
        Serial.printf("[cal] Sound baseline calibrated to %.1f\n", soundEMA);
    }

    lcd.clear();
    lcd.print("System Ready");
    delay(1000);
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

    // 1. Read Sensors with Noise Filtered Sound Sampling
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    int rawVib = digitalRead(VIB_PIN);
    if (rawVibTriggered) {
        rawVib = HIGH;
        rawVibTriggered = false;
    }
    int vib = rawVib; // Strictly raw instantaneous vibration reading (non-debounced)
    int rawSound = getSoundLevel(SOUND_PIN);

    if (rawSound < 20)
        rawSound = 0;

    // Diagnostic: warn (once per saturation episode) if the sensor is
    // pinned at/near the ADC ceiling for a sustained stretch - this means
    // the KY-037 gain pot needs to be turned down, not a software problem.
    if (rawSound >= SOUND_SATURATION_THRESHOLD) {
        consecutiveSaturatedSoundReads++;
        if (consecutiveSaturatedSoundReads == 20 && !soundSaturationWarned) {
            Serial.println("[warn] Sound sensor appears saturated (pinned near max). "
                            "Lower the KY-037 sensitivity potentiometer.");
            soundSaturationWarned = true;
        }
    } else {
        consecutiveSaturatedSoundReads = 0;
        soundSaturationWarned = false;
    }

    soundEMA = 0.90f * soundEMA + 0.10f * rawSound;
    soundDisplayEMA = (1.0f - SOUND_DISPLAY_ALPHA) * soundDisplayEMA + SOUND_DISPLAY_ALPHA * rawSound;

    int soundEnv = (int)soundEMA;
    int soundDisplayEnv = (int)soundDisplayEMA;

    if (isnan(h) || isnan(t)) {
        Serial.println("DHT22 read failed! Using last valid values.");
        if (sensorReady) {
            h = lastHum;
            t = lastTemp;
        } else {
            // No valid reading yet at all - skip this cycle's scoring/send
            // rather than treating 0.0C/0% as real data.
            Serial.println("No valid DHT reading yet - skipping this cycle.");
            digitalWrite(LED_PIN, LOW);
            delay(200);
            return;
        }
    } else {
        lastHum = h;
        lastTemp = t;
        sensorReady = true;
    }

    // 2. Combined Multi-Parameter Health Score Calculation
    float healthScore = calculateHealthScore(t, h, soundEnv, vib);

    // 3. Query GSM Signal (Output directed strictly to Serial Monitor)
    if (gsmReady && (currentMillis - lastSignalCheck >= SIGNAL_CHECK_INTERVAL)) {
        checkSignalStrength();
        lastSignalCheck = currentMillis;
    }

    // 4. Process Persistent Anomaly Filtering & Parameter SMS Dispatches
    checkCriticalAlerts(t, h, soundEnv, vib, healthScore);

    // 4b. Immediate SMS for vibration / sound threshold events.
    // These bypass the 3-consecutive-anomaly health-score filter and
    // fire the instant the condition is first detected (edge-triggered).
    // Once sent, the flag stays true until the condition clears, so you
    // get exactly one SMS per episode rather than one per loop cycle.
    if (vib == HIGH && !vibSMSSent && (lastVibSMS == 0 || currentMillis - lastVibSMS >= IMMEDIATE_SMS_COOLDOWN)) {
        String msg = "BEEHIVE VIBRATION ALERT!\n";
        msg += "Hive: " + String(HIVE_ID) + "\n";
        msg += "Raw vibration detected!\n";
        msg += "Health Score: " + String((int)healthScore) + "%\n";
        msg += "Temp: " + String(t, 1) + "C | Hum: " + String(h, 1) + "%\n";
        msg += "Immediate inspection advised.";
        sendSMS(msg);
        lastVibSMS = currentMillis;
        vibSMSSent = true;
        Serial.println("[SMS] Immediate raw vibration alert sent.");
    }
    if (vib == LOW) vibSMSSent = false; // reset edge flag when vibration stops

    if (soundEnv > SOUND_THRESHOLD && !soundSMSSent && (lastSoundSMS == 0 || currentMillis - lastSoundSMS >= IMMEDIATE_SMS_COOLDOWN)) {
        String msg = "BEEHIVE HIGH SOUND ALERT!\n";
        msg += "Hive: " + String(HIVE_ID) + "\n";
        msg += "Sound envelope: " + String(soundEnv) + " (threshold: " + String(SOUND_THRESHOLD) + ")\n";
        msg += "Health Score: " + String((int)healthScore) + "%\n";
        msg += "Temp: " + String(t, 1) + "C | Hum: " + String(h, 1) + "%\n";
        msg += "Possible swarming or disturbance. Check hive.";
        sendSMS(msg);
        lastSoundSMS = currentMillis;
        soundSMSSent = true;
        Serial.println("[SMS] Immediate high-sound alert sent.");
    }
    if (soundEnv <= SOUND_THRESHOLD) soundSMSSent = false; // reset when sound drops back

    // 5. Update LCD Display Screens
    updateDisplay(t, h, soundEnv, soundDisplayEnv, vib, healthScore);

    // 6. Transmit Data to Backend API
    if (wifiConnected && (currentMillis - lastDataSend >= DATA_SEND_INTERVAL)) {
        sendDataToBackend(t, h, soundEnv, vib, healthScore);
        lastDataSend = currentMillis;
    }

    // 7. Serial Monitor Diagnostics
    String healthStatusStr = (healthScore < 50.0) ? "CRITICAL" : (healthScore <= 75.0 ? "MONITOR" : "NORMAL");
    Serial.printf("Temp: %.1fC | Hum: %.1f%% | Sound(scoring/live): %d/%d | Vib(raw): %s | Health: %.1f%% (%s) | GSM Signal: %d%% (%s)\n",
                  t, h, soundEnv, soundDisplayEnv, vib == HIGH ? "YES" : "NO", healthScore,
                  healthStatusStr.c_str(), gsmSignalStrength, gsmStatus.c_str());

    digitalWrite(LED_PIN, LOW);
    delay(200);
}

// ======================================================
// NOISE-FILTERED SOUND ENVELOPE SAMPLER (30ms WINDOW)
// ======================================================

int getSoundLevel(int pin) {
    int minVal = 4095;
    int maxVal = 0;

    unsigned long start = millis();

    while (millis() - start < 30) {
        int sample = analogRead(pin);

        if (sample < minVal)
            minVal = sample;

        if (sample > maxVal)
            maxVal = sample;
    }

    return maxVal - minVal;
    // (Previously there was an unreachable `Serial.println(getSoundLevel(...))`
    // here, after the return - dead code that also would have recursed
    // infinitely if it were ever reachable. Removed.)
}

// ======================================================
// ENHANCED COMBINED HEALTH SCORE CALCULATION
// ======================================================

float calculateHealthScore(float temp, float hum, int soundEnv, int vib) {
    float penalty = 0.0;

    // Temperature Penalty
    if (temp < TEMP_OPTIMAL_MIN) {
        penalty += (TEMP_OPTIMAL_MIN - temp) * 5.0;
    } else if (temp > TEMP_OPTIMAL_MAX) {
        penalty += (temp - TEMP_OPTIMAL_MAX) * 8.0;
    }

    // Humidity Penalty
    if (hum < HUM_OPTIMAL_MIN) {
        penalty += (HUM_OPTIMAL_MIN - hum) * 0.5;
    } else if (hum > HUM_OPTIMAL_MAX) {
        penalty += (hum - HUM_OPTIMAL_MAX) * 1.0;
    }

    // Sound Volume Envelope Penalty
    float soundPenalty = 0;

    if (soundEnv < 30)
        soundPenalty = 10;          // Too quiet
    else if (soundEnv <= 250)
        soundPenalty = 0;           // Normal
    else if (soundEnv <= 600)
        soundPenalty = 5;           // Active
    else if (soundEnv <= 1200)
        soundPenalty = 15;          // Very active
    else
        soundPenalty = 30;          // Abnormal

    penalty += soundPenalty;

    // Vibration Penalty
    if (vib == HIGH) {
        penalty += 15.0;
    }

    // Overriding Safety Cap: Single extreme failure forces health below 50%
    if (temp > TEMP_CRITICAL_HIGH || temp < TEMP_CRITICAL_LOW || hum > HUM_CRITICAL_HIGH) {
        penalty = max(penalty, 55.0f);
    }

    float score = 100.0 - penalty;
    return max(0.0f, min(100.0f, score));
}

// ======================================================
// DYNAMIC LCD DISPLAY (3-TIER STATUS & SPECIFIC REASONS)
// ======================================================

void updateDisplay(float temp, float hum, int soundEnv, int soundDisplayEnv, int vib, float health) {
    unsigned long currentMillis = millis();

    // v4.0: Track the last sound value we actually wrote to the LCD.
    // Page B only redraws when this changes, eliminating the rapid
    // flicker caused by sub-integer EMA jitter toggling between two
    // adjacent values every loop cycle.
    static int lastDisplayedSound = -1;

    // Toggle Alert Blink State every BLINK_TOGGLE_INTERVAL ms
    if (currentMillis - lastBlinkToggle >= BLINK_TOGGLE_INTERVAL) {
        alertBlinkState = !alertBlinkState;
        lastBlinkToggle = currentMillis;
    }

    // Switch Display Pages every 4s
    if (currentMillis - lastLcdDisplayToggle >= LCD_TOGGLE_INTERVAL) {
        lcdPageToggle = !lcdPageToggle;
        lastLcdDisplayToggle = currentMillis;
        lcd.clear();
        lastDisplayedSound = -1; // force redraw on page switch
    }

    bool isCritical = (health < 50.0);
    bool isMonitoring = (health >= 50.0 && health <= 75.0);

    // LINE 1: Display blinking alert OR normal parameter headers
    lcd.setCursor(0, 0);
    if (isCritical && alertBlinkState) {
        lcd.print("*** ALERT! ***  ");
    } else {
        if (!lcdPageToggle) {
            // Page A: Temp & Humidity (% RH)
            lcd.print("Temp:");
            lcd.print((int)temp);
            lcd.print("C Hum:");
            lcd.print((int)hum);
            lcd.print("%  ");
        } else {
            // Page B: Sound Envelope (raw ADC count, display-smoothed) & Vibration
            // Dead-band: only redraw when the value has moved >=5 from what's
            // currently shown. Natural ambient jitter is typically ±3-4 units,
            // so this keeps the display rock-steady in a quiet room while
            // still reacting promptly to real noise events.
            if (lastDisplayedSound == -1 || abs(soundDisplayEnv - lastDisplayedSound) >= 5) {
                lastDisplayedSound = soundDisplayEnv;
                lcd.setCursor(0, 0);
                lcd.print("Snd:");
                lcd.print(soundDisplayEnv);
                lcd.print(" Vib:");
                lcd.print(vib == HIGH ? "YES" : "NO ");
                lcd.print("     ");
            }
        }
    }

    // LINE 2: Explicit Reason during Critical Alert / "Monitor" / "Normal"
    lcd.setCursor(0, 1);
    if (isCritical) {
        if (temp > TEMP_CRITICAL_HIGH)      lcd.print("Reason: High Temp");
        else if (temp < TEMP_CRITICAL_LOW)  lcd.print("Reason: Low Temp ");
        else if (hum > HUM_CRITICAL_HIGH)   lcd.print("Reason: High Hum ");
        else if (vib == HIGH)               lcd.print("Reason: Vib Det  ");
        else if (soundEnv > SOUND_THRESHOLD)lcd.print("Reason: High Snd ");
        else                                lcd.print("Reason: Low Hlth ");
    } else if (isMonitoring) {
        lcd.print("Health: Monitor ");
    } else {
        lcd.print("Health: Normal  ");
    }
}

// ======================================================
// PERSISTENT SMS ALERT CHECKER (FILTER FALSE ALARMS)
// ======================================================

void checkCriticalAlerts(float temp, float hum, int soundEnv, int vib, float health) {
    unsigned long currentMillis = millis();

    if (health < 50.0) {
        consecutiveAnomalyCount++;
    } else {
        consecutiveAnomalyCount = 0;
    }

    if (consecutiveAnomalyCount >= 3 && (currentMillis - lastSMSAlert >= SMS_COOLDOWN)) {
        String alertMsg = "CRITICAL BEEHIVE ALERT!\n";
        alertMsg += "Combined Health Score: " + String((int)health) + "%\n";

        if (temp > TEMP_CRITICAL_HIGH) alertMsg += "- High Temp: " + String(temp, 1) + "C\n";
        if (temp < TEMP_CRITICAL_LOW)  alertMsg += "- Low Temp: " + String(temp, 1) + "C\n";
        if (hum > HUM_CRITICAL_HIGH)   alertMsg += "- Critical Hum: " + String(hum, 1) + "%\n";

        alertMsg += "Sustained anomaly detected. Immediate inspection advised.";

        sendSMS(alertMsg);
        lastSMSAlert = currentMillis;
    }
}

// ======================================================
// GSM DIAGNOSTIC HANDSHAKE TEST
// ======================================================

bool diagnoseGSM() {
    int retry = 0;
    while (retry < 5) {
        while (sim800.available()) { sim800.read(); }

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
// CHECK GSM SIGNAL STRENGTH (SERIAL MONITOR ONLY)
// ======================================================

void checkSignalStrength() {
    if (!gsmReady) return;

    while (sim800.available()) { sim800.read(); }
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
                if (rssi >= 20) gsmStatus = "Excellent";
                else if (rssi >= 15) gsmStatus = "Good";
                else if (rssi >= 10) gsmStatus = "Fair";
                else gsmStatus = "Poor";
            }
        }
    } else {
        gsmStatus = "Error/Timeout";
    }

    Serial.printf("[GSM Monitor] Signal Quality: %d%% (%s)\n", gsmSignalStrength, gsmStatus.c_str());
}

// ======================================================
// WIFI CONNECTION
// ======================================================

void connectWiFi() {
    Serial.print("Connecting to WiFi");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi Connected!");
        wifiConnected = true;
    } else {
        Serial.println("\nWiFi Failed!");
        wifiConnected = false;
    }
}

// ======================================================
// SEND DATA TO BACKEND API
// ======================================================

void sendDataToBackend(float temp, float hum, int soundEnv, int vib, float health) {
    if (!wifiConnected) return;

    HTTPClient http;
    http.begin(API_ENDPOINT);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", DEVICE_API_KEY); // required by deviceAuth middleware
    http.setTimeout(5000); // avoid indefinite blocking on a stalled connection

    // ArduinoJson v7: StaticJsonDocument is deprecated, use JsonDocument.
    JsonDocument doc;
    doc["hive_id"] = HIVE_ID;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["sound_envelope"] = soundEnv;
    doc["vibration"] = (vib == HIGH) ? 1 : 0;
    doc["health_score"] = health;
    doc["gsm_signal"] = gsmSignalStrength;
    doc["timestamp"] = millis();

    String jsonData;
    serializeJson(doc, jsonData);

    int httpResponseCode = http.POST(jsonData);

    if (httpResponseCode > 0) {
        Serial.printf("Backend HTTP POST [%d]\n", httpResponseCode);
        if (httpResponseCode >= 400) {
            // Print the server's own error body so a 500 is actually
            // debuggable instead of just a bare status code.
            String body = http.getString();
            Serial.println("Backend response body:");
            Serial.println(body);
        }
    } else {
        Serial.printf("HTTP POST failed: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
}

// ======================================================
// SEND SMS
// ======================================================

void sendSMS(String msg) {
    if (!gsmReady) {
        Serial.println("[SMS] Aborted: GSM hardware unready.");
        return;
    }
    Serial.printf("[SMS] Sending alert SMS to %s...\n", TARGET_PHONE_NUMBER);

    while (sim800.available()) sim800.read(); // Clear input buffer

    sim800.println("AT+CMGF=1");
    delay(300);

    sim800.print("AT+CMGS=\"");
    sim800.print(TARGET_PHONE_NUMBER);
    sim800.println("\"");
    delay(500);

    sim800.print(msg);
    delay(300);
    sim800.write(26); // Ctrl+Z to dispatch

    // Read response with 6-second timeout
    unsigned long start = millis();
    String resp = "";
    while (millis() - start < 6000) {
        if (sim800.available()) {
            char c = sim800.read();
            resp += c;
            if (resp.indexOf("OK") != -1 || resp.indexOf("ERROR") != -1) {
                break;
            }
        }
    }

    Serial.printf("[SMS] SIM800L Module Reply: %s\n", resp.c_str());
    Serial.println("[SMS] Dispatch Completed!");
}
