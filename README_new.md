# BeeHive Monitoring System

This project contains the full stack for a smart beehive monitoring system:

- Backend API with Node.js and Express
- MongoDB database for hive and user data
- Python ML service for hive health prediction
- React frontend dashboard for monitoring and analytics
- ESP32 firmware for sensor collection

## Prerequisites

Install the following before starting:

- Node.js 18+
- Python 3.11
- MongoDB Compass or MongoDB server
- Git
- VS Code (recommended)

## 1) Clone the project

```bash
git clone <your-repository-url>
cd BeeHive_Monitoring_System
```

## 2) Start MongoDB

Open MongoDB Compass and connect to:

```text
mongodb://localhost:27017
```

Create a database named:

```text
beehive_monitor
```

## 3) Install backend dependencies

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder with:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/beehive_monitor
JWT_SECRET=your_super_secret_key_here
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Then run the backend:

```bash
npm start
```

Optional seed data:

```bash
npm run seed
```

Expected backend startup:

- MongoDB Connected
- Server running on port 5000

## 4) Install Python ML service dependencies

From the project root:

```bash
cd ml_service
python -m venv venv
```

On Windows:

```bash
venv\Scripts\activate
```

On macOS/Linux:

```bash
source venv/bin/activate
```

Then install requirements:

```bash
pip install -r requirements.txt
```

If you want to use the project-root requirements file instead:

```bash
pip install -r ../requirements.txt
```

Start the ML service:

```bash
python app.py
```

Expected ML service startup:

- Flask app running
- listening on port 8000

## 5) Install frontend dependencies

Open a new terminal and run:

```bash
cd frontend
npm install
```

Then start the frontend:

```bash
npm start
```

The app will run on:

```text
http://localhost:3000
```

## 6) Full project run order

Run services in this order:

1. MongoDB
2. Backend
3. ML service
4. Frontend

Example:

```bash
cd backend
npm start
```

```bash
cd ml_service
python app.py
```

```bash
cd frontend
npm start
```

## 7) Default app URLs

- Backend API: http://localhost:5000
- ML Service: http://localhost:8000
- Frontend: http://localhost:3000

## 8) Notes

- The backend expects the ML service at `http://localhost:8000`.
- The frontend is configured to proxy API requests to the backend at port 5000.
- If you are using the ESP32 firmware, make sure the device is connected to the same network and the backend URL is updated in the firmware configuration.

## 9) Troubleshooting

### MongoDB not connecting

Check whether MongoDB is running locally and that the DB URL is correct:

```text
mongodb://localhost:27017/beehive_monitor
```

### ML service fails to start

Verify Python is 3.11 and install all dependencies:

```bash
pip install -r requirements.txt
```

### Frontend cannot reach backend

Make sure the backend is running first and the API URL matches:

```text
http://localhost:5000
```

## 10) Project structure

```text
BeeHive_Monitoring_System/
├── backend/
├── frontend/
├── firmware/
├── ml_service/
├── README_new.md
├── requirements.txt
└── README.md
```

This setup is intended for local development and testing.
