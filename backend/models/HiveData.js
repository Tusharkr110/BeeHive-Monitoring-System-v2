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
  sound_level: {
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
  },

  // ── ML prediction fields ──────────────────────────────────────────────────
  ml_prediction: {
    type: String,
    enum: ["normal", "stressed_queenless", "stressed_anomaly", "unavailable"],
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
