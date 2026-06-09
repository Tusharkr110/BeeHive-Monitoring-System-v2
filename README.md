# 🐝 BeeHive Monitoring System

An IoT-based Smart BeeHive Monitoring System that continuously monitors hive conditions using ESP32 sensors and provides real-time visualization through a MERN stack dashboard.

The system collects environmental and activity data from the hive, stores it in MongoDB, and displays real-time analytics through a web dashboard. SMS alerts can also be sent for critical conditions.

---

## 📌 Features

### Firmware (ESP32)
- Temperature Monitoring (DHT22)
- Humidity Monitoring (DHT22)
- Sound Detection
- Vibration Detection
- WiFi Connectivity
- SIM800L SMS Alerts
- Automatic Sensor Data Upload

### Backend
- REST API using Express.js
- MongoDB Data Storage
- Authentication & Authorization
- Hive Management APIs
- Sensor Data APIs
- Real-time Data Processing

### Frontend
- Responsive Dashboard
- Real-time Hive Monitoring
- Sensor Data Visualization
- Hive Statistics
- Alert Monitoring
- User Authentication

---

# 🏗️ System Architecture

```text
ESP32 + Sensors
       │
       ▼
   Express API
       │
       ▼
    MongoDB
       │
       ▼
 React Dashboard
```

---

# 🛠 Tech Stack

## Firmware

- ESP32
- Arduino Framework
- DHT22 Sensor
- SIM800L GSM Module
- WiFi

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs

## Frontend

- React.js
- Axios
- Chart.js
- React Router

---

# 📂 Project Structure

```text
BeeHive-Monitoring-System/
│
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── firmware/
│   ├── src/
│   ├── include/
│   ├── platformio.ini
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│
├── .gitignore
├── README.md
└── LICENSE
```

---

# ⚙️ Installation Guide

## 1. Clone Repository

```bash
git clone https://github.com/yourusername/BeeHive-Monitoring-System.git

cd BeeHive-Monitoring-System
```

---

# Backend Setup

## Navigate to Backend

```bash
cd backend
```

## Install Dependencies

```bash
npm install
```

## Create Environment File

Create:

```text
backend/.env
```

Copy contents from:

```text
backend/.env.example
```

Example:

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/beehive

JWT_SECRET=your_jwt_secret

JWT_EXPIRE=30d

NODE_ENV=development
```

---

## Start Backend

Development Mode

```bash
npm run dev
```

Production Mode

```bash
npm start
```

Backend will run at:

```text
http://localhost:5000
```

---

# Frontend Setup

## Navigate to Frontend

```bash
cd frontend
```

## Install Dependencies

```bash
npm install
```

## Create Environment File

```text
frontend/.env
```

Example:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## Start Frontend

```bash
npm start
```

Frontend will run at:

```text
http://localhost:3000
```

---

# MongoDB Setup

## Local MongoDB

Install MongoDB Community Edition.

Start MongoDB service:

```bash
mongod
```

Database:

```text
beehive
```

---

## MongoDB Atlas

Replace:

```env
MONGO_URI=
```

with:

```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/beehive
```

---

# Firmware Setup

## Requirements

- VS Code
- PlatformIO Extension

---

## Open Firmware Folder

```bash
firmware/
```

---

## Configure WiFi

Inside:

```cpp
main.cpp
```

Update:

```cpp
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
```

---

## Configure Backend API

Replace:

```cpp
const char* SERVER_URL = "http://YOUR_SERVER_IP:5000/api/hives/data";
```

Examples:

Local:

```cpp
http://192.168.1.10:5000/api/hives/data
```

Cloud:

```cpp
https://your-domain.com/api/hives/data
```

---

## Configure SMS Alerts

Update SIM800L phone number:

```cpp
String phoneNumber = "+91XXXXXXXXXX";
```

---

## Upload Firmware

Connect ESP32.

Run:

```bash
PlatformIO: Upload
```

or

```bash
pio run --target upload
```

---

# API Endpoints

## Hive Data

### Upload Sensor Data

```http
POST /api/hives/data
```

### Get Hive Data

```http
GET /api/hives/data
```

### Get Single Hive

```http
GET /api/hives/:id
```

---

# Security Notes

Never commit:

```text
.env
node_modules
```

Only commit:

```text
.env.example
```

---

# Deployment

## Backend

Recommended:

- Render
- Railway
- VPS
- AWS EC2

## Frontend

Recommended:

- Vercel
- Netlify

## Database

Recommended:

- MongoDB Atlas

---

# Future Improvements

- AI-based Bee Activity Prediction
- Hive Health Analytics
- Mobile Application
- Push Notifications
- Multi-Hive Management
- GPS Tracking
- Historical Trend Analysis

---

# Contributors

### Tushar Kumar

Computer Science & Engineering

---

# License

This project is licensed under the MIT License.