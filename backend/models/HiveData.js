const mongoose = require("mongoose");

const HiveDataSchema = new mongoose.Schema({
  hive_id: {
    type: String,
    required: true,
    index: true,
  },
  temperature: {
    type: Number,
    default: 0,
  },
  humidity: {
    type: Number,
    default: 0,
  },
  // Field name matches the ESP32 firmware and the trained ML model.
  sound_envelope: {
    type: Number,
    default: 0,
  },
  vibration: {
    type: Boolean,
    default: false,
  },
  health_score: {
    type: Number,
    default: 0,
  },
  fft_features: {
    type: String,
    default: "",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60, // Auto-purge records older than 30 days (TTL index)
  },

  // ── ML prediction fields ──────────────────────────────────────────────────
  // Updated enums to match the current ML model's actual classes:
  //   NORMAL     → "normal"
  //   MONITORING → "monitoring"
  //   CRITICAL   → "critical"
  // The old model used "stressed_queenless" / "stressed_anomaly" which no
  // longer correspond to what the trained Random Forest outputs.
  ml_prediction: {
    type: String,
    enum: ["normal", "monitoring", "critical", "unavailable"],
    default: "unavailable",
  },
  ml_severity: {
    type: String,
    enum: ["healthy", "warning", "critical", "unknown"],
    default: "unknown",
  },
  ml_confidence: {
    type: Number,
    default: 0,
  },
  ml_probabilities: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

module.exports = mongoose.model("HiveData", HiveDataSchema);
