const express = require("express");
const router = express.Router();
const axios = require("axios");
const HiveData = require("../models/HiveData");
const Hive = require("../models/Hive");
const { protect, authorize } = require("../middleware/auth");
const deviceAuth = require("../middleware/deviceAuth");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

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
      sound_level,
      vibration,
      health_score,
      fft_features,
    } = req.body;

    // Validate required fields
    if (
      !hive_id ||
      temperature === undefined ||
      humidity === undefined ||
      sound_level === undefined ||
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
      sound_level,
      vibration,
      health_score,
      fft_features: fft_features || "",
      ml_prediction: mlResult?.prediction || "unavailable",
      ml_severity: mlResult?.severity || "unknown",
      ml_confidence: mlResult?.confidence || 0,
      ml_probabilities: mlResult?.probabilities || {},
    });

    // 3. Update lastDataReceived in Hive model
    await Hive.findOneAndUpdate(
      { hive_id },
      { lastDataReceived: new Date() },
      { upsert: false },
    );

    // 4. Emit real-time update via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(hive_id).emit("hive:reading", hiveData.toObject());
      io.emit("hive:reading:all", hiveData.toObject());
    }

    res.status(201).json({
      success: true,
      message: "Data saved successfully",
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
