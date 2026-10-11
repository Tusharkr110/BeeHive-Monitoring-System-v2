import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { hivesAPI } from "../services/api";
import HealthRingGauge from "./HealthRingGauge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  TrendingUp,
  Bell,
  BellOff,
  RefreshCw,
  Thermometer,
  Droplets,
  Volume2,
  Activity,
  LogOut,
  Hexagon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import toast from "react-hot-toast";
import "../styles/Dashboard.css";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { id: "live", icon: LayoutDashboard, label: "Live Monitor" },
  { id: "history", icon: TrendingUp, label: "Trend History" },
];

const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const [hives, setHives] = useState([]);
  const [selectedHive, setSelectedHive] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live");
  const [refreshing, setRefreshing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    fetchHives();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedHive) {
      fetchLiveData();
      const interval = setInterval(fetchLiveData, 1000); // 1-second ultra-fast live refresh
      return () => clearInterval(interval);
    }
  }, [selectedHive]);

  const fetchHives = async () => {
    try {
      const res = await hivesAPI.getAllHives();
      setHives(res.data.data);
      if (res.data.data.length > 0) setSelectedHive(res.data.data[0]);
    } catch {
      toast.error("Failed to load hives");
    }
    setLoading(false);
  };

  const fetchLiveData = async () => {
    if (!selectedHive) return;
    try {
      const res = await hivesAPI.getLatestData(selectedHive.hive_id);
      setLiveData(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLiveData();
    setTimeout(() => setRefreshing(false), 700);
  };

  const fetchHistory = async () => {
    if (!selectedHive) return;
    try {
      const res = await hivesAPI.getHistory(selectedHive.hive_id, {
        limit: 50,
      });
      setHistoryData(
        res.data.data.reverse().map((d) => ({
          time: new Date(d.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          temperature: d.temperature,
          health: d.health_score,
        })),
      );
    } catch {
      toast.error("Failed to load history");
    }
  };

  const toggleSMS = async () => {
    try {
      await hivesAPI.updateHive(selectedHive._id, {
        smsAlertsEnabled: !selectedHive.smsAlertsEnabled,
      });
      setSelectedHive({
        ...selectedHive,
        smsAlertsEnabled: !selectedHive.smsAlertsEnabled,
      });
      toast.success(
        `SMS alerts ${!selectedHive.smsAlertsEnabled ? "enabled" : "disabled"}`,
      );
    } catch {
      toast.error("Could not update alert settings");
    }
  };

  const healthColor = (s) =>
    s >= 80 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";
  const healthLabel = (s) =>
    s >= 80 ? "Excellent" : s >= 50 ? "Good" : "Critical";

  const handleSimulate = async (type) => {
    if (!selectedHive) return;
    try {
      toast.loading("Simulating state...", { id: "sim" });
      await hivesAPI.simulateData(selectedHive.hive_id, type);
      await fetchLiveData();
      if (activeTab === "history") await fetchHistory();
      toast.success(`Simulated ${type.replace("_", " ")}!`, { id: "sim" });
    } catch (err) {
      toast.error("Simulation failed", { id: "sim" });
    }
  };

  const initials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading)
    return (
      <div className="page-loading">
        <div className="spinner" />
        Loading your hives…
      </div>
    );

  if (hives.length === 0)
    return (
      <div className="page-loading">
        <div className="empty-state">
          <div className="empty-state-icon">🏚️</div>
          <h3>No Hives Found</h3>
          <p>Contact your administrator to register your first hive.</p>
        </div>
      </div>
    );

  return (
    <div className={`app-layout ${isCollapsed ? "collapsed" : ""}`}>
      {/* ══ Sidebar ══ */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🐝</div>
          {!isCollapsed && (
            <span className="sidebar-logo-text">
              Bharat<span>Bee</span>
            </span>
          )}
          <button
            className="sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={15} />
            ) : (
              <ChevronLeft size={15} />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Monitor</div>
          {NAV.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              className={`sidebar-link ${activeTab === id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(id);
                if (id === "history") fetchHistory();
              }}
              title={label}
            >
              <Icon size={16} />
              <span className="sidebar-link-text">{label}</span>
            </button>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>
            Alerts
          </div>
          <button
            className={`sidebar-link ${selectedHive?.smsAlertsEnabled ? "active" : ""}`}
            onClick={toggleSMS}
            title="Toggle SMS alerts"
          >
            {selectedHive?.smsAlertsEnabled ? (
              <Bell size={16} />
            ) : (
              <BellOff size={16} />
            )}
            <span className="sidebar-link-text">
              SMS Alerts {selectedHive?.smsAlertsEnabled ? "ON" : "OFF"}
            </span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: 12 }}>
            ⚡ Alert Simulator
          </div>
          <button
            className="sidebar-link"
            onClick={() => handleSimulate("temperature_alert")}
            title="🔥 High Temp (43.5°C)"
          >
            <span className="sidebar-link-icon">🔥</span>
            <span className="sidebar-link-text">High Temp</span>
          </button>
          <button
            className="sidebar-link"
            onClick={() => handleSimulate("sound_alert")}
            title="🔊 High Sound (4250)"
          >
            <span className="sidebar-link-icon">🔊</span>
            <span className="sidebar-link-text">High Sound</span>
          </button>
          <button
            className="sidebar-link"
            onClick={() => handleSimulate("critical_alert")}
            title="⚠️ Critical Anomaly"
          >
            <span className="sidebar-link-icon">⚠️</span>
            <span className="sidebar-link-text">Critical Alert</span>
          </button>
          <button
            className="sidebar-link"
            onClick={() => handleSimulate("normal")}
            title="✅ Normal State"
          >
            <span className="sidebar-link-icon">✅</span>
            <span className="sidebar-link-text">Normal State</span>
          </button>
        </nav>

        {/* Hive selector */}
        <div className="sidebar-hive-select">
          <label>Active Hive</label>
          <select
            value={selectedHive?._id || ""}
            onChange={(e) =>
              setSelectedHive(hives.find((h) => h._id === e.target.value))
            }
          >
            {hives.map((h) => (
              <option key={h._id} value={h._id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials(user?.name)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button
              className="sidebar-logout"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main ══ */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-crumb">Dashboard</span>
            <span className="topbar-crumb-sep">›</span>
            <span className="topbar-title">
              {activeTab === "live" ? "Live Monitor" : "Trend History"}
            </span>
          </div>
          <div className="topbar-right">
            {liveData && (
              <span
                className="topbar-badge"
                style={{
                  background:
                    liveData.ml_severity === "critical" ||
                    liveData.temperature > 36 ||
                    liveData.sound_envelope > 2000
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(34,211,238,0.08)",
                  borderColor:
                    liveData.ml_severity === "critical" ||
                    liveData.temperature > 36 ||
                    liveData.sound_envelope > 2000
                      ? "rgba(239,68,68,0.4)"
                      : "rgba(34,211,238,0.15)",
                  color:
                    liveData.ml_severity === "critical" ||
                    liveData.temperature > 36 ||
                    liveData.sound_envelope > 2000
                      ? "#ef4444"
                      : "var(--cyan-400)",
                }}
              >
                <span
                  className="dot"
                  style={{
                    background:
                      liveData.ml_severity === "critical" ||
                      liveData.temperature > 36 ||
                      liveData.sound_envelope > 2000
                        ? "#ef4444"
                        : "var(--green)",
                  }}
                />
                {liveData.ml_severity === "critical" ||
                liveData.temperature > 36 ||
                liveData.sound_envelope > 2000
                  ? "ALERT ACTIVE · " + selectedHive?.hive_id
                  : "Live · " + selectedHive?.hive_id}
              </span>
            )}
            <button
              className="topbar-action-btn"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw
                size={14}
                style={{
                  transition: "transform 0.7s",
                  transform: refreshing ? "rotate(360deg)" : "none",
                }}
              />
              Refresh
            </button>
            <ThemeToggle compact={true} />
          </div>
        </header>

        <div className="page-body">
          {/* ══ LIVE TAB ══ */}
          {activeTab === "live" && liveData && (
            <>
              {(liveData.temperature > 36 ||
                liveData.sound_envelope > 2000 ||
                liveData.vibration ||
                liveData.ml_severity === "critical" ||
                liveData.ml_severity === "warning") && (
                <div
                  className="bento-card"
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>
                      {liveData.temperature > 40
                        ? "🔥"
                        : liveData.sound_envelope > 2000
                          ? "🔊"
                          : "⚠️"}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                        }}
                      >
                        {liveData.temperature > 36 &&
                          `High Temperature Warning (${liveData.temperature.toFixed(1)}°C)`}
                        {liveData.temperature > 36 &&
                          liveData.sound_envelope > 2000 &&
                          ` · `}
                        {liveData.sound_envelope > 2000 &&
                          `High Sound Activity (${liveData.sound_envelope})`}
                        {!(
                          liveData.temperature > 36 ||
                          liveData.sound_envelope > 2000
                        ) && `Colony Anomaly Detected`}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {liveData.temperature > 36 &&
                          `Optimal range is 32.0°C – 36.0°C. `}
                        {liveData.sound_envelope > 2000 &&
                          `Normal sound level is < 2000. `}
                        {liveData.vibration && `Abnormal vibration detected.`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleSimulate("normal")}
                      style={{
                        padding: "8px 14px",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                      }}
                    >
                      Reset to Normal
                    </button>
                  </div>
                </div>
              )}

              <div className="bento-grid">
                {/* ── Health Gauge Ring ── */}
                <div
                  className="bento-card col-6 gauge-tile"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <h3 style={{ marginBottom: 0 }}>Colony Health</h3>
                  <HealthRingGauge
                    score={liveData.health_score}
                    liveData={liveData}
                  />
                </div>

                {/* ── Sensor Readings ── */}
                <div className="bento-card col-6">
                  <div className="card-section-header">
                    <span className="card-section-title">Sensor Readings</span>
                  </div>

                  <div className="sensor-row">
                    <div
                      className="sensor-row-icon"
                      style={{
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#ef4444",
                      }}
                    >
                      <Thermometer size={18} />
                    </div>
                    <div className="sensor-row-body">
                      <div className="sensor-row-name">Temperature</div>
                      <div className="sensor-row-value">
                        {liveData.temperature.toFixed(1)}°C
                      </div>
                    </div>
                    <span
                      className={`sensor-row-status ${liveData.temperature >= 32 && liveData.temperature <= 36 ? "status-ok" : "status-warn"}`}
                    >
                      {liveData.temperature >= 32 && liveData.temperature <= 36
                        ? "Optimal"
                        : "Check"}
                    </span>
                  </div>

                  <div className="sensor-row">
                    <div
                      className="sensor-row-icon"
                      style={{
                        background: "rgba(34,211,238,0.1)",
                        border: "1px solid rgba(34,211,238,0.18)",
                        color: "#22d3ee",
                      }}
                    >
                      <Droplets size={18} />
                    </div>
                    <div className="sensor-row-body">
                      <div className="sensor-row-name">Humidity</div>
                      <div className="sensor-row-value">
                        {liveData.humidity.toFixed(0)}%
                      </div>
                    </div>
                    <span
                      className={`sensor-row-status ${liveData.humidity >= 50 && liveData.humidity <= 80 ? "status-ok" : "status-warn"}`}
                    >
                      {liveData.humidity >= 50 && liveData.humidity <= 80
                        ? "Optimal"
                        : "Check"}
                    </span>
                  </div>

                  <div className="sensor-row">
                    <div
                      className="sensor-row-icon"
                      style={{
                        background: "rgba(234,179,8,0.1)",
                        border: "1px solid rgba(234,179,8,0.2)",
                        color: "#eab308",
                      }}
                    >
                      <Volume2 size={18} />
                    </div>
                    <div className="sensor-row-body">
                      <div className="sensor-row-name">Sound Level</div>
                      <div className="sensor-row-value">
                        {liveData.sound_envelope}
                      </div>
                    </div>
                    <span
                      className={`sensor-row-status ${liveData.sound_envelope < 2000 ? "status-ok" : "status-warn"}`}
                    >
                      {liveData.sound_envelope < 2000 ? "Normal" : "High"}
                    </span>
                  </div>

                  <div className="sensor-row">
                    <div
                      className="sensor-row-icon"
                      style={{
                        background: "rgba(167,139,250,0.1)",
                        border: "1px solid rgba(167,139,250,0.2)",
                        color: "#a78bfa",
                      }}
                    >
                      <Activity size={18} />
                    </div>
                    <div className="sensor-row-body">
                      <div className="sensor-row-name">Vibration</div>
                      <div
                        className="sensor-row-value"
                        style={{ fontSize: 18 }}
                      >
                        {liveData.vibration ? "Detected" : "None"}
                      </div>
                    </div>
                    <span
                      className={`sensor-row-status ${!liveData.vibration ? "status-ok" : "status-warn"}`}
                    >
                      {!liveData.vibration ? "Stable" : "Alert"}
                    </span>
                  </div>
                </div>

                {/* ── Stat Tiles ── */}
                <div className="bento-card col-3 stat-tile tile-cyan">
                  <div className="stat-tile-icon">
                    <Thermometer size={18} />
                  </div>
                  <div className="stat-tile-value">
                    {liveData.temperature.toFixed(1)}°
                  </div>
                  <div className="stat-tile-label">Temperature</div>
                </div>

                <div className="bento-card col-3 stat-tile tile-violet">
                  <div className="stat-tile-icon">
                    <Droplets size={18} />
                  </div>
                  <div className="stat-tile-value">
                    {liveData.humidity.toFixed(0)}%
                  </div>
                  <div className="stat-tile-label">Humidity</div>
                </div>

                <div className="bento-card col-3 stat-tile tile-yellow">
                  <div className="stat-tile-icon">
                    <Volume2 size={18} />
                  </div>
                  <div className="stat-tile-value">
                    {liveData.sound_envelope}
                  </div>
                  <div className="stat-tile-label">Sound Level</div>
                </div>

                <div className="bento-card col-3 stat-tile tile-green">
                  <div className="stat-tile-icon">
                    <Hexagon size={18} />
                  </div>
                  <div className="stat-tile-value">
                    {Math.round(liveData.health_score)}%
                  </div>
                  <div className="stat-tile-label">Health Score</div>
                </div>

                {/* ── Last Updated ── */}
                <div className="col-12">
                  <div className="last-update-bar">
                    Last synced: {new Date(liveData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══ HISTORY TAB ══ */}
          {activeTab === "history" && (
            <div
              className="bento-card col-12"
              style={{ gridColumn: "span 12" }}
            >
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">
                    Temperature &amp; Health Trends
                  </div>
                  <div className="chart-card-subtitle">
                    Last 50 readings for {selectedHive?.name}
                  </div>
                </div>
              </div>
              {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart
                    data={historyData}
                    margin={{ top: 8, right: 24, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.04)"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#4b5569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#4b5569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#4b5569", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0d0f1a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        fontSize: 12,
                        fontFamily: "Inter,sans-serif",
                        color: "#8892a4",
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: 12,
                        color: "#4b5569",
                        paddingTop: 14,
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Temp (°C)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="health"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      name="Health (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: 300 }}>
                  <div className="spinner" />
                  <p>Loading historical data…</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
