import React from "react";

const SEVERITY_STYLES = {
  healthy: {
    bg: "#e8f5e9",
    text: "#2e7d32",
    bar: "#4caf50",
    icon: "🟢",
    label: "Healthy",
  },
  warning: {
    bg: "#fff8e1",
    text: "#f57f17",
    bar: "#ffc107",
    icon: "🟡",
    label: "Queenless",
  },
  critical: {
    bg: "#ffebee",
    text: "#c62828",
    bar: "#f44336",
    icon: "🔴",
    label: "Anomaly",
  },
  unknown: {
    bg: "#f5f5f5",
    text: "#616161",
    bar: "#9e9e9e",
    icon: "⚪",
    label: "Unavailable",
  },
};

const LABEL_MAP = {
  normal: "Normal",
  stressed_queenless: "Stressed – Queenless",
  stressed_anomaly: "Stressed – Anomaly",
  unavailable: "ML Unavailable",
};

const HiveMLBridge = ({ liveData }) => {
  if (!liveData) return null;

  const severity = liveData.ml_severity || "unknown";
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.unknown;
  const label =
    LABEL_MAP[liveData.ml_prediction] ||
    liveData.ml_prediction ||
    "Unavailable";
  const conf = liveData.ml_confidence ?? 0;
  const probs = liveData.ml_probabilities || {};

  return (
    <div
      style={{
        background: style.bg,
        color: style.text,
        borderRadius: 16,
        padding: 20,
        marginTop: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          🤖 AI Health Diagnosis
        </span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          Random Forest Ensemble
        </span>
      </div>

      {/* Main prediction */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 32 }}>{style.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{label}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{style.label}</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          <span>Confidence</span>
          <strong>{conf.toFixed(1)}%</strong>
        </div>
        <div
          style={{ background: "rgba(0,0,0,0.1)", borderRadius: 4, height: 8 }}
        >
          <div
            style={{
              width: `${conf}%`,
              height: 8,
              borderRadius: 4,
              background: style.bar,
              transition: "width 0.7s ease",
            }}
          />
        </div>
      </div>

      {/* Probability breakdown */}
      {Object.keys(probs).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Class Probabilities
          </div>
          {Object.entries(probs).map(([cls, pct]) => (
            <div
              key={cls}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  width: 170,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  opacity: 0.85,
                }}
              >
                {LABEL_MAP[cls] || cls}
              </span>
              <div
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.1)",
                  borderRadius: 3,
                  height: 6,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: 6,
                    borderRadius: 3,
                    background: style.bar,
                    opacity: 0.75,
                  }}
                />
              </div>
              <span
                style={{
                  width: 45,
                  textAlign: "right",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HiveMLBridge;
