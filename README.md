# 🐝 Smart Beehive Monitoring System

> **Monitor your bee colonies in real-time using IoT sensors, AI/ML diagnostics, and a live web dashboard — all from your phone or PC.**

Built by **Tushar Kumar**, **Ayushman** and **Ravishankar**

---

## 📸 Screenshots

| Login Page | Farmer Dashboard |
|:---:|:---:|
| ![Login](screenshots/login.png) | ![Dashboard](screenshots/dashboard.png) |

| Sensor Cards + AI Diagnosis | History Chart |
|:---:|:---:|
| ![Sensors](screenshots/sensors.png) | ![History](screenshots/history.png) |

---

## 🤔 What Is This Project?

Imagine you are a beekeeper with multiple beehives. Normally, you would have to physically walk up to each hive every day to check if the bees are healthy. This is time-consuming and sometimes dangerous.

**This system solves that problem.** A small computer chip (ESP32) is placed near the hive. It continuously reads:
- 🌡️ Temperature inside the hive
- 💧 Humidity levels
- 🔊 Sound the bees are making (using FFT audio analysis)
- 📳 Any vibrations (predators knocking the hive?)

This data is sent over WiFi to a server on your PC. An **AI model** then listens to the sound pattern and tells you whether the hive is **Healthy**, **Queenless** (the queen bee is missing!), or showing an **Anomaly**. You can see everything live on a beautiful web dashboard.

If something is critically wrong, the system automatically **sends an SMS alert** to the farmer's phone via a GSM module (SIM800L).

---

## 🧠 How The AI Works (Simple Explanation)

The ESP32 records sound from the hive and breaks it into **20 frequency buckets** using a technique called FFT (Fast Fourier Transform) — think of it like splitting a song into bass, mid, and treble, but for bee sounds.

These 20 numbers are sent to a Python AI service. The AI was trained on **thousands of real beehive audio recordings** from the [BeeTogether dataset on Kaggle](https://www.kaggle.com/datasets/augustin23/beetogether). It learned that:
- 🟢 A **healthy hive** with a queen sounds a certain way
- 🟡 A **queenless hive** sounds more stressed and erratic
- 🔴 An **anomaly** produces unusual acoustic patterns

The AI (a Random Forest Ensemble model) gives a prediction with a **confidence percentage** and shows the probability for each class on the dashboard.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ESP32 Firmware                           │
│  DHT22 (Temp/Humidity) + KY-037 (Sound/FFT) + Vibration Sensor │
│                    + SIM800L (GSM SMS)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST (JSON + FFT data)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Node.js Backend  (Port 5000)                      │
│         Express + MongoDB + Socket.IO + JWT Auth                │
└────────────┬──────────────────────────────┬────────────────────┘
             │ calls /predict               │ saves to DB
             ▼                             ▼
┌────────────────────────┐    ┌────────────────────────────────┐
│  Python ML Service     │    │   MongoDB (Local Compass)      │
│  Flask  (Port 5001)    │    │   Stores all readings +        │
│  Random Forest Model   │    │   ML predictions               │
└────────────────────────┘    └────────────────────────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────────┐
                           │   React Frontend  (Port 3000)     │
                           │  Live Dashboard + AI Badge +      │
                           │  Charts + Admin & Farmer Views    │
                           └───────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | What it does |
|-------|-----------|-------------|
| **Firmware** | ESP32 + Arduino (PlatformIO) | Reads sensors, does FFT, sends data |
| **Backend** | Node.js + Express.js | API server, auth, database |
| **Database** | MongoDB (local via Compass) | Stores all hive readings |
| **ML Service** | Python + Flask + scikit-learn | AI prediction microservice |
| **Frontend** | React.js + Recharts + Lucide | Live web dashboard |
| **Auth** | JWT (JSON Web Tokens) | Secure login for admin/farmer |
| **Alerts** | SIM800L GSM Module | SMS alerts on critical events |
| **Real-time** | Socket.IO | Live data push to dashboard |

---

## 📁 Project Structure

```
BeeHive_Monitoring_System/
│
├── 📁 backend/                    # Node.js API Server
│   ├── 📁 middleware/
│   │   ├── auth.js                # JWT token verification
│   │   └── deviceAuth.js         # ESP32 device key check
│   ├── 📁 models/
│   │   ├── Hive.js                # Hive configuration schema
│   │   ├── HiveData.js            # Sensor + ML readings schema
│   │   └── User.js                # Admin/Farmer user schema
│   ├── 📁 routes/
│   │   ├── auth.js                # Login, register endpoints
│   │   └── hives.js               # All hive data endpoints
│   ├── 📁 scripts/                # Seed/utility scripts
│   ├── .env                       # Environment variables
│   └── server.js                  # Main server entry point
│
├── 📁 frontend/                   # React Web Dashboard
│   └── 📁 src/
│       ├── 📁 components/
│       │   ├── AdminDashboard.js  # Admin view
│       │   ├── FarmerDashboard.js # Farmer live view
│       │   ├── HiveMLBrodge.jsx   # AI diagnosis badge
│       │   └── Login.js           # Login/Register page
│       ├── 📁 context/
│       │   └── AuthContext.js     # Global auth state
│       ├── 📁 services/
│       │   └── api.js             # All API call functions
│       └── 📁 styles/             # CSS files
│
├── 📁 firmware/                   # ESP32 PlatformIO Project
│   └── 📁 src/
│       └── main.cpp               # Full ESP32 firmware
│
└── 📁 ml_service/                 # Python AI Microservice
    ├── 📁 models/
    │   ├── hive_health_model.pkl  # Trained Random Forest model
    │   └── hive_acoustic_scaler.pkl # Feature scaler
    ├── 📁 venv/                   # Python virtual environment
    ├── app.py                     # Flask prediction API
    ├── train_model.py             # Model training script
    └── requirements.txt           # Python dependencies
```

---

## ⚙️ Prerequisites (What you need installed)

Before starting, make sure you have these installed on your PC:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or above | https://nodejs.org |
| Python | **3.11 exactly** | https://python.org/downloads/release/python-3119/ |
| MongoDB Compass | Latest | https://www.mongodb.com/try/download/compass |
| Git | Latest | https://git-scm.com |
| PlatformIO | VS Code Extension | Search in VS Code Extensions |

> ⚠️ **Important:** Use Python 3.11 specifically. Python 3.12+ and 3.14 will break the ML packages.

---

## 🚀 Setup Guide — Step by Step

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-username/BeeHive_Monitoring_System.git
cd BeeHive_Monitoring_System
```

---

### Step 2 — Setup MongoDB

1. Open **MongoDB Compass**
2. Click **"New Connection"**
3. Use the default connection string: `mongodb://localhost:27017`
4. Click **Connect**
5. Create a new database called `beehive_monitor`

That's it — MongoDB is ready.

---

### Step 3 — Setup the Backend

Open a terminal and run:

```bash
cd backend
npm install
```

Now create your environment file. Open `backend/.env` and fill it like this:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/beehive_monitor
JWT_SECRET=your_super_secret_key_here
ML_SERVICE_URL=http://localhost:5001
```

Seed the database with demo users and a test hive:

```bash
node scripts/seed.js
```

Start the backend server:

```bash
node server.js
```

✅ You should see: `Server running on port 5000` and `MongoDB Connected`

---

### Step 4 — Setup the ML Service

Open a **new terminal** and run:

```bash
cd ml_service

# Create a Python 3.11 virtual environment
py -3.11 -m venv venv

# Activate it
venv\Scripts\activate

# Install packages
```

> 📌 Make sure `ml_service/models/` contains both `.pkl` files before this step.
> If you don't have them yet, see the **Training the Model** section below.

Start the ML service:

```bash
python app.py
```

✅ You should see: `Model and scaler loaded successfully` and `Running on http://0.0.0.0:5001`

---

### Step 5 — Setup the Frontend

Open a **new terminal** and run:

```bash
cd frontend
npm install
npm start
```

✅ Your browser will automatically open `http://localhost:3000`

---

### Step 6 — Flash the ESP32 Firmware

1. Open the `firmware/` folder in **VS Code with PlatformIO**
2. Open `firmware/src/main.cpp`
3. Update these lines with your actual values:

```cpp
const char* WIFI_SSID     = "YourWiFiName";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* API_ENDPOINT  = "http://YOUR_PC_IP:5000/api/hives/data";
```

> 💡 To find your PC's IP address, run `ipconfig` in terminal and look for **IPv4 Address**

4. Connect your ESP32 via USB
5. Click the **Upload** button (→) in PlatformIO
6. Open **Serial Monitor** to see live logs

---

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@beehive.com | admin123 |
| **Farmer** | farmer@beehive.com | farmer123 |

> Admins can create hives and manage users. Farmers can only view their own hives.

---

## 🧪 Test The Full Pipeline (Without ESP32)

You can simulate an ESP32 sending data using this command in any terminal:

```bash
curl -X POST http://localhost:5000/api/hives/data \
  -H "Content-Type: application/json" \
  -H "x-api-key: beehive_device_key_2026" \
  -d "{\"hive_id\":\"HIVE001\",\"temperature\":34,\"humidity\":65,\"sound_level\":1500,\"vibration\":0,\"health_score\":85,\"fft_features\":\"120.5,98.2,75.0,60.1,55.0,48.3,40.0,35.5,30.0,25.0,22.0,18.0,15.5,13.0,11.0,9.5,8.0,7.0,6.0,5.5\"}"
```

Expected response:
```json
{
  "success": true,
  "ml_prediction": "normal",
  "ml_severity": "healthy",
  "ml_confidence": 87.3
}
```

Then refresh your dashboard — the AI badge should update!

---

## 🤖 Training the ML Model

The model was trained on the [BeeTogether Kaggle dataset](https://www.kaggle.com/datasets/augustin23/beetogether) — 14.9GB of real beehive audio recordings labeled as Normal, Queenless, or Anomaly.

To retrain from scratch:

**In Google Colab:**
```python
# 1. Set up Kaggle credentials and download dataset
!mkdir -p ~/.kaggle
!echo YOUR_KAGGLE_TOKEN > ~/.kaggle/kaggle.json
!kaggle datasets download -d augustin23/beetogether --force

# 2. Run all cells in Bee_hive_agentic.ipynb top to bottom

# 3. After training, save to Google Drive immediately
from google.colab import drive
drive.mount('/content/drive')
import shutil
shutil.copy('./hive_model_files/hive_health_model.pkl', '/content/drive/MyDrive/hive_health_model.pkl')
shutil.copy('./hive_model_files/hive_acoustic_scaler.pkl', '/content/drive/MyDrive/hive_acoustic_scaler.pkl')

# 4. Download to your PC
from google.colab import files
files.download('./hive_model_files/hive_health_model.pkl')
files.download('./hive_model_files/hive_acoustic_scaler.pkl')
```

Then place both `.pkl` files in `ml_service/models/`.

### Model Details

| Property | Value |
|----------|-------|
| Algorithm | Voting Classifier (Random Forest + Gradient Boosting) |
| Features | 54-dimensional acoustic feature vector |
| Feature types | 20 MFCC means, 20 MFCC stds, 2 spectral centroid, 12 chroma |
| Training data | BeeTogether dataset (Kaggle) |
| Classes | `normal`, `stressed_queenless`, `stressed_anomaly` |
| Oversampling | SMOTE (to handle class imbalance) |

---

## 📡 API Reference

### Device Endpoints (ESP32)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/hives/data` | Send sensor reading from ESP32 |

**Headers required:**
```
Content-Type: application/json
x-api-key: beehive_device_key_2026
```

**Body:**
```json
{
  "hive_id": "HIVE001",
  "temperature": 34.2,
  "humidity": 65,
  "sound_level": 1500,
  "vibration": 0,
  "health_score": 87.5,
  "fft_features": "120.5,98.2,75.0,..."
}
```

---

### Dashboard Endpoints (Frontend)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login and get JWT token |
| `POST` | `/api/auth/register` | ❌ | Register new user |
| `GET` | `/api/hives` | ✅ JWT | Get all hives for logged-in user |
| `GET` | `/api/hives/data/:hiveId/latest` | ✅ JWT | Get latest reading with ML result |
| `GET` | `/api/hives/data/:hiveId/history` | ✅ JWT | Get historical readings |
| `POST` | `/api/hives` | ✅ Admin | Create new hive |
| `PUT` | `/api/hives/:id` | ✅ JWT | Update hive settings |
| `DELETE` | `/api/hives/:id` | ✅ Admin | Delete a hive |

---

### ML Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `http://localhost:5001/health` | Check if ML service is online |
| `POST` | `http://localhost:5001/predict` | Get AI prediction for sensor data |

---

## 🔧 Hardware Setup

### Components Required

| Component | Purpose |
|-----------|---------|
| ESP32 Dev Board | Main microcontroller |
| DHT22 Sensor | Temperature & Humidity |
| KY-037 Sound Sensor | Acoustic / FFT analysis |
| SW-420 Vibration Sensor | Detects physical disturbances |
| SIM800L GSM Module | SMS alerts |
| I2C LCD (16x2) | Local display on hive |
| 5V Power Supply | Powers the system |

### Pin Connections

| ESP32 Pin | Connected To |
|-----------|-------------|
| GPIO 14 | DHT22 Data |
| GPIO 33 | Vibration Sensor |
| GPIO 34 | KY-037 (Analog) |
| GPIO 2 | Status LED |
| GPIO 16 (RX2) | SIM800L TX |
| GPIO 17 (TX2) | SIM800L RX |
| GPIO 21 (SDA) | LCD I2C SDA |
| GPIO 22 (SCL) | LCD I2C SCL |

---

## 🚨 Alert System

The ESP32 automatically sends an SMS if any of these thresholds are crossed:

| Condition | Threshold | Alert Message |
|-----------|-----------|---------------|
| Overheating | > 38°C | `CRITICAL OVERHEATING: XX.X°C` |
| Freezing | < 28°C | `CRITICAL FREEZING: XX.X°C` |
| High humidity | > 85% | `CRITICAL CONDENSATE: XX%` |
| Vibration | Detected | `PREDATOR/STRUCTURAL VIBRATION ALERT` |
| Low health | < 50% | `HIVE DECAYING. HEALTH CRITICAL: XX%` |

> 📵 SMS alerts have a **5-minute cooldown** to avoid spam.

---

## 🐛 Common Issues & Fixes

### ML service fails to start
```
ModuleNotFoundError: No module named 'flask'
```
**Fix:** Make sure you activated the virtual environment first:
```bash
cd ml_service
venv\Scripts\activate
python app.py
```

### numpy install fails
```
ERROR: NumPy requires GCC >= 8.4
```
**Fix:** You're using Python 3.12+. Install Python 3.11 and recreate the venv:
```bash
py -3.11 -m venv venv
```

### ESP32 can't reach the backend
**Fix:** Make sure your PC and ESP32 are on the **same WiFi network**. Use your PC's local IP (from `ipconfig`), not `localhost`.

### Dashboard shows no data
**Fix:** Check all three terminals are running — backend (5000), ML service (5001), and frontend (3000).

### MongoDB connection fails
**Fix:** Make sure MongoDB Compass is open and connected before starting the backend.

---

## 🗂️ Running Everything Together

You need **3 terminals open at the same time:**

```bash
# Terminal 1 — ML Service
cd ml_service
venv\Scripts\activate
python app.py

# Terminal 2 — Backend
cd backend
node server.js

# Terminal 3 — Frontend
cd frontend
npm start
```

Then open your browser at **http://localhost:3000** 🎉

---

## 🔮 Future Improvements

- [ ] Deploy backend to cloud (Render / Railway)
- [ ] Deploy frontend to Vercel
- [ ] Add mobile app (React Native)
- [ ] Add more ML classes (swarming, disease detection)
- [ ] Add camera module for visual hive inspection
- [ ] Email alerts in addition to SMS
- [ ] Multi-language support

---

## 👨‍💻 Team

|     Name    |
|------|------|
| **Tushar Kumar** 
| **Ayushman** 
| **Ravishankar** 

---

## 📄 License

This project is for educational purposes. Feel free to fork and build on it.

---

<div align="center">
  <strong>🐝 Made with love for the bees 🐝</strong><br/>
  <em>If the bees are happy, we are happy.</em>
</div>
