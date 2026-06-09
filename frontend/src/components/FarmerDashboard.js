import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hivesAPI } from '../services/api';
import GaugeChart from 'react-gauge-chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, Thermometer, Volume2, AlertTriangle, Bell, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/Dashboard.css';
import HiveMLBridge from "./HiveMLBridge";

const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const [hives, setHives] = useState([]);
  const [selectedHive, setSelectedHive] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'history'

  useEffect(() => {
    fetchHives();
  }, []);

  useEffect(() => {
    if (selectedHive) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [selectedHive]);

  const fetchHives = async () => {
    try {
      const response = await hivesAPI.getAllHives();
      setHives(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedHive(response.data.data[0]);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch hives');
      setLoading(false);
    }
  };

  const fetchLiveData = async () => {
    if (!selectedHive) return;
    
    try {
      const response = await hivesAPI.getLatestData(selectedHive.hive_id);
      setLiveData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    }
  };

  const fetchHistory = async () => {
    if (!selectedHive) return;
    
    try {
      const response = await hivesAPI.getHistory(selectedHive.hive_id, { limit: 50 });
      const formattedData = response.data.data.reverse().map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        temperature: item.temperature,
        health: item.health_score
      }));
      setHistoryData(formattedData);
    } catch (error) {
      toast.error('Failed to fetch history');
    }
  };

  const toggleSMSAlerts = async () => {
    try {
      await hivesAPI.updateHive(selectedHive._id, {
        smsAlertsEnabled: !selectedHive.smsAlertsEnabled
      });
      
      setSelectedHive({ ...selectedHive, smsAlertsEnabled: !selectedHive.smsAlertsEnabled });
      toast.success(`SMS alerts ${!selectedHive.smsAlertsEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update alert settings');
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getHealthStatus = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Critical';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (hives.length === 0) {
    return (
      <div className="no-hives">
        <h2>No Hives Found</h2>
        <p>Contact your administrator to set up your first hive.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🐝 Beehive Monitor</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="hive-selector">
        <label>Select Hive:</label>
        <select
          value={selectedHive?._id || ""}
          onChange={(e) =>
            setSelectedHive(hives.find((h) => h._id === e.target.value))
          }
        >
          {hives.map((hive) => (
            <option key={hive._id} value={hive._id}>
              {hive.name} ({hive.hive_id})
            </option>
          ))}
        </select>
      </div>

      <div className="tabs">
        <button
          className={activeTab === "live" ? "tab active" : "tab"}
          onClick={() => setActiveTab("live")}
        >
          Live Data
        </button>
        <button
          className={activeTab === "history" ? "tab active" : "tab"}
          onClick={() => {
            setActiveTab("history");
            fetchHistory();
          }}
        >
          History
        </button>
      </div>

      {activeTab === "live" && liveData && (
        <div className="live-view">
          <div className="health-gauge-card">
            <h2>Colony Health Score</h2>
            <GaugeChart
              id="health-gauge"
              nrOfLevels={3}
              colors={["#ef4444", "#f59e0b", "#10b981"]}
              arcWidth={0.3}
              percent={liveData.health_score / 100}
              textColor="#000"
              formatTextValue={() => `${Math.round(liveData.health_score)}%`}
            />
            <div
              className="health-status"
              style={{ color: getHealthColor(liveData.health_score) }}
            >
              Status: {getHealthStatus(liveData.health_score)}
            </div>
          </div>

          <div className="sensor-grid">
            <div className="sensor-card">
              <div className="card-icon" style={{ background: "#ff6b6b" }}>
                <Thermometer size={32} />
              </div>
              <div className="card-content">
                <h3>Temperature</h3>
                <div className="value">{liveData.temperature.toFixed(1)}°C</div>
                <div className="status">
                  {liveData.temperature >= 32 && liveData.temperature <= 36
                    ? "✓ Optimal"
                    : "⚠ Out of range"}
                </div>
              </div>
            </div>

            <div className="sensor-card">
              <div className="card-icon" style={{ background: "#4ecdc4" }}>
                <Droplets size={32} />
              </div>
              <div className="card-content">
                <h3>Humidity</h3>
                <div className="value">{liveData.humidity.toFixed(0)}%</div>
                <div className="status">
                  {liveData.humidity >= 50 && liveData.humidity <= 80
                    ? "✓ Optimal"
                    : "⚠ Out of range"}
                </div>
              </div>
            </div>

            <div className="sensor-card">
              <div className="card-icon" style={{ background: "#ffd93d" }}>
                <Volume2 size={32} />
              </div>
              <div className="card-content">
                <h3>Sound Level</h3>
                <div className="value">{liveData.sound_level}</div>
                <div className="status">
                  {liveData.sound_level < 2000 ? "✓ Normal" : "⚠ High activity"}
                </div>
              </div>
            </div>

            <div className="sensor-card">
              <div className="card-icon" style={{ background: "#a8e6cf" }}>
                <Activity size={32} />
              </div>
              <div className="card-content">
                <h3>Vibration</h3>
                <div className="value">
                  {liveData.vibration ? "DETECTED" : "None"}
                </div>
                <div className="status">
                  {!liveData.vibration ? "✓ Stable" : "⚠ Check hive"}
                </div>
              </div>
            </div>
          </div>

          <div className="alert-control">
            <button
              className={`alert-toggle ${selectedHive.smsAlertsEnabled ? "enabled" : "disabled"}`}
              onClick={toggleSMSAlerts}
            >
              {selectedHive.smsAlertsEnabled ? (
                <Bell size={20} />
              ) : (
                <BellOff size={20} />
              )}
              SMS Alerts: {selectedHive.smsAlertsEnabled ? "ON" : "OFF"}
            </button>
          </div>

          <HiveMLBridge liveData={liveData} />

          <div className="last-update">
            Last updated: {new Date(liveData.timestamp).toLocaleString()}
          </div>

          <div className="last-update">
            Last updated: {new Date(liveData.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="history-view">
          <h2>Temperature & Health Trends</h2>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Temperature (°C)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Health Score (%)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="health"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>Loading historical data...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
