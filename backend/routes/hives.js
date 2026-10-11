const express = require("express");
const router = express.Router();
const axios = require("axios");
const HiveData = require("../models/HiveData");
const Hive = require("../models/Hive");
const { protect, authorize } = require("../middleware/auth");
const deviceAuth = require("../middleware/deviceAuth");

// FIX: default fallback port was 5001, but the Flask ML service actually
// runs on port 8000 (see ml_service/app.py -> app.run(..., port=8000)).
// If ML_SERVICE_URL isn't set in .env, every prediction call was silently
// failing (caught in getMLPrediction) and every reading was being stored
// as ml_prediction: "unavailable" with no visible error anywhere.
// Best practice is still to set ML_SERVICE_URL explicitly in .env -
// this fallback now at least matches what Flask is actually listening on.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ── Helper: call the Python ML service ───────────────────────────────────────
async function getMLPrediction(payload) {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 5000,
    });
    return data;
  } catch (err) {
    console.warn("[ML] Prediction service unavailable:", err.message);
    return null;
  }
}

// @route   POST /api/hives/data
// @desc    Receive sensor data from ESP32 + get ML prediction
// @access  Device auth
router.post("/data", deviceAuth, async (req, res) => {
  try {
    const {
      hive_id,
      temperature,
      humidity,
      sound_envelope,
      vibration,
      health_score,
      fft_features,
    } = req.body;

    // Validate required fields
    // FIX: was checking `sound_level`, which the ESP32 never sends (it
    // sends `sound_envelope`) - every request from the device was failing
    // this check with a 400 before it ever reached Mongo or the ML service.
    if (
      !hive_id ||
      temperature === undefined ||
      humidity === undefined ||
      sound_envelope === undefined ||
      vibration === undefined ||
      health_score === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 1. Call ML service
    const mlResult = await getMLPrediction(req.body);

    // 2. Save enriched data entry
    const hiveData = await HiveData.create({
      hive_id,
      temperature,
      humidity,
      sound_envelope,
      vibration,
      health_score,
      fft_features: fft_features || "",
      ml_prediction: mlResult?.prediction || "unavailable",
      ml_severity: mlResult?.severity || "unknown",
      ml_confidence: mlResult?.confidence || 0,
      ml_probabilities: mlResult?.probabilities || {},
    });

    // 3. Find hive config & update lastDataReceived
    const hiveConfig = await Hive.findOneAndUpdate(
      { hive_id: hive_id.toUpperCase() },
      { lastDataReceived: new Date() },
      { new: true },
    );

    const smsAllowed = hiveConfig ? hiveConfig.smsAlertsEnabled : true;

    // Check critical SMS condition & enforce SMS toggle setting
    const isCriticalCondition =
      temperature > 38 ||
      health_score < 50 ||
      Boolean(vibration) ||
      hiveData.ml_severity === "critical";
    if (isCriticalCondition) {
      if (smsAllowed) {
        console.log(
          `[SMS] Alert dispatched for ${hive_id}! (Temp: ${temperature}C, Health: ${health_score}%)`,
        );
      } else {
        console.log(
          `[SMS] Alert suppressed for ${hive_id} because SMS Alerts are turned OFF in Dashboard.`,
        );
      }
    }

    // 4. Emit real-time update via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(hive_id).emit("hive:reading", hiveData.toObject());
      io.emit("hive:reading:all", hiveData.toObject());
    }

    res.status(201).json({
      success: true,
      message: "Data saved successfully",
      smsAlertsEnabled: smsAllowed,
      data: hiveData,
      ml_prediction: hiveData.ml_prediction,
      ml_severity: hiveData.ml_severity,
      ml_confidence: hiveData.ml_confidence,
    });
  } catch (error) {
    console.error("Error saving hive data:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   POST /api/hives/simulate
// @desc    Simulate sensor alert states (temperature alert, sound alert, critical, normal)
// @access  Private
router.post("/simulate", protect, async (req, res) => {
  try {
    const { hive_id, type } = req.body;
    if (!hive_id) {
      return res
        .status(400)
        .json({ success: false, message: "hive_id is required" });
    }

    let simulatedData = {};
    switch (type) {
      case "temperature_alert":
        simulatedData = {
          temperature: 43.5,
          humidity: 32.0,
          sound_envelope: 1450,
          vibration: false,
          health_score: 38,
          ml_prediction: "critical",
          ml_severity: "critical",
          ml_confidence: 96.2,
          ml_probabilities: {
            normal: 1.5,
            monitoring: 2.3,
            critical: 96.2,
          },
        };
        break;

      case "sound_alert":
        simulatedData = {
          temperature: 34.8,
          humidity: 62.5,
          sound_envelope: 4250,
          vibration: true,
          health_score: 45,
          ml_prediction: "monitoring",
          ml_severity: "warning",
          ml_confidence: 91.8,
          ml_probabilities: {
            normal: 3.2,
            monitoring: 91.8,
            critical: 5.0,
          },
        };
        break;

      case "critical_alert":
        simulatedData = {
          temperature: 45.2,
          humidity: 24.0,
          sound_envelope: 4800,
          vibration: true,
          health_score: 18,
          ml_prediction: "critical",
          ml_severity: "critical",
          ml_confidence: 98.4,
          ml_probabilities: {
            normal: 0.6,
            monitoring: 1.0,
            critical: 98.4,
          },
        };
        break;

      case "normal":
      default:
        simulatedData = {
          temperature: 34.1,
          humidity: 68.0,
          sound_envelope: 820,
          vibration: false,
          health_score: 96,
          ml_prediction: "normal",
          ml_severity: "healthy",
          ml_confidence: 92.5,
          ml_probabilities: {
            normal: 92.5,
            monitoring: 4.5,
            critical: 3.0,
          },
        };
        break;
    }

    const hiveData = await HiveData.create({
      hive_id: hive_id.toUpperCase(),
      ...simulatedData,
      timestamp: new Date(),
    });

    await Hive.findOneAndUpdate(
      { hive_id: hive_id.toUpperCase() },
      { lastDataReceived: new Date() },
    );

    res.status(200).json({
      success: true,
      message: `Simulated ${type || "alert"} data generated`,
      data: hiveData,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// @route   GET /api/hives/data/:hiveId/latest
// @desc    Get latest sensor data for a specific hive
// @access  Private
router.get("/data/:hiveId/latest", protect, async (req, res) => {
  try {
    const latestData = await HiveData.findOne({
      hive_id: req.params.hiveId.toUpperCase(),
    }).sort({ timestamp: -1 });

    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: "No data found for this hive",
      });
    }

    res.status(200).json({
      success: true,
      data: latestData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/hives/data/:hiveId/history
// @desc    Get historical data with optional time range
// @access  Private
router.get("/data/:hiveId/history", protect, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const query = { hive_id: req.params.hiveId.toUpperCase() };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const historyData = await HiveData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: historyData.length,
      data: historyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   GET /api/hives
// @desc    Get all hives (Admin: all, Farmer: only owned)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    let hives;

    if (req.user.role === "admin") {
      hives = await Hive.find().populate("owner", "name email");
    } else {
      hives = await Hive.find({ owner: req.user.id });
    }

    res.status(200).json({
      success: true,
      count: hives.length,
      data: hives,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   POST /api/hives
// @desc    Create new hive
// @access  Private (Admin only)
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const {
      hive_id,
      name,
      location,
      coordinates,
      owner,
      smsAlertsEnabled,
      metadata,
    } = req.body;

    const existingHive = await Hive.findOne({ hive_id: hive_id.toUpperCase() });
    if (existingHive) {
      return res.status(400).json({
        success: false,
        message: "Hive ID already exists",
      });
    }

    const hive = await Hive.create({
      hive_id: hive_id.toUpperCase(),
      name,
      location,
      coordinates,
      owner,
      smsAlertsEnabled,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: hive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   PUT /api/hives/:id
// @desc    Update hive settings
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    let hive = await Hive.findById(req.params.id);

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    if (req.user.role !== "admin" && hive.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this hive",
      });
    }

    hive = await Hive.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: hive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// @route   DELETE /api/hives/:id
// @desc    Delete hive
// @access  Private (Admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const hive = await Hive.findById(req.params.id);

    if (!hive) {
      return res.status(404).json({
        success: false,
        message: "Hive not found",
      });
    }

    await hive.deleteOne();

    res.status(200).json({
      success: true,
      message: "Hive deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
