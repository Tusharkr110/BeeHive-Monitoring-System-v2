import React from "react";
import "./HiveMLBridge.css";

const CONFIG = {
  healthy: {
    accent: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.18)",
    icon: "🟢",
    tag: "Healthy",
  },
  warning: {
    accent: "#eab308",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.18)",
    icon: "🟡",
    tag: "Warning",
  },
  critical: {
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.18)",
    icon: "🔴",
    tag: "Critical",
  },
  unknown: {
    accent: "#4b5569",
    bg: "rgba(75,85,105,0.08)",
    border: "rgba(75,85,105,0.15)",
    icon: "⚪",
    tag: "Unknown",
  },
};

// Updated to match the actual ML model classes (NORMAL / MONITORING / CRITICAL)
// instead of the old model's queenless/anomaly labels.
const LABELS = {
  normal: "Normal",
  monitoring: "Monitoring",
  critical: "Critical",
  unavailable: "ML Unavailable",
};

const HiveMLBridge = ({ liveData }) => {
  if (!liveData) return null;
  const cfg = CONFIG[liveData.ml_severity] || CONFIG.unknown;
  const label =
    LABELS[liveData.ml_prediction] || liveData.ml_prediction || "Unavailable";
  const conf = liveData.ml_confidence ?? 0;
  const probs = liveData.ml_probabilities || {};

  return (
    <div
      className="ml-card"
      style={{ "--accent": cfg.accent, "--bg": cfg.bg, "--border": cfg.border }}
    >
      {/* Header */}
      <div className="ml-card-header">
        <div className="ml-card-tag">🤖 AI Diagnosis</div>
        <span className="ml-model-badge">Random Forest</span>
      </div>

      {/* Main result */}
      <div className="ml-result">
        <div className="ml-result-icon">{cfg.icon}</div>
        <div>
          <div className="ml-result-label">{label}</div>
          <div className="ml-result-sub">{cfg.tag} Colony</div>
        </div>
      </div>

      {/* Confidence */}
      <div className="ml-conf">
        <div className="ml-conf-row">
          <span className="ml-conf-text">Confidence</span>
          <strong className="ml-conf-pct">{conf.toFixed(1)}%</strong>
        </div>
        <div className="ml-bar-track">
          <div className="ml-bar-fill" style={{ width: `${conf}%` }} />
        </div>
      </div>

      {/* Probabilities */}
      {Object.keys(probs).length > 0 && (
        <div className="ml-probs">
          <div className="ml-probs-title">Class Breakdown</div>
          {Object.entries(probs).map(([cls, pct]) => (
            <div className="ml-prob-row" key={cls}>
              <span className="ml-prob-name">{LABELS[cls] || cls}</span>
              <div className="ml-prob-track">
                <div className="ml-prob-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="ml-prob-num">{pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HiveMLBridge;
