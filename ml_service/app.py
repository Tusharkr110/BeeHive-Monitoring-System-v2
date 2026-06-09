from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import joblib
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "models", "hive_health_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "models", "hive_acoustic_scaler.pkl")

model  = None
scaler = None

def load_model():
    global model, scaler
    try:
        model  = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        logger.info("Model and scaler loaded successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False

def build_feature_vector(data):
    fft_raw = data.get("fft_features", "")
    if isinstance(fft_raw, str) and fft_raw.strip():
        buckets = [float(x) for x in fft_raw.split(",") if x.strip()]
    else:
        buckets = [0.0] * 20

    if len(buckets) < 20:
        buckets += [0.0] * (20 - len(buckets))
    buckets = np.array(buckets[:20], dtype=np.float32)

    group_size    = 5
    mfcc_means    = np.array([np.mean(buckets[i:i+group_size]) for i in range(0, 20, group_size)])
    mfcc_stds     = np.array([np.std(buckets[i:i+group_size])  for i in range(0, 20, group_size)])
    mfcc_means_full = np.tile(mfcc_means, 5)
    mfcc_stds_full  = np.tile(mfcc_stds,  5)

    freqs         = np.linspace(200, 4000, 20)
    total         = buckets.sum() + 1e-9
    centroid_mean = float(np.dot(freqs, buckets) / total)
    centroid_std  = float(np.sqrt(np.dot(freqs**2, buckets / total) - centroid_mean**2 + 1e-9))

    chroma = np.zeros(12, dtype=np.float32)
    for idx, val in enumerate(buckets):
        chroma[idx % 12] += val
    chroma /= (chroma.sum() + 1e-9)

    return np.hstack([
        mfcc_means_full,
        mfcc_stds_full,
        centroid_mean,
        centroid_std,
        chroma
    ]).reshape(1, -1)

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "online", "model_loaded": model is not None})

@app.route("/predict", methods=["POST"])
def predict():
    if model is None or scaler is None:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "Empty request body"}), 400

    try:
        features   = build_feature_vector(data)
        scaled     = scaler.transform(features)
        prediction = model.predict(scaled)[0]
        proba      = model.predict_proba(scaled)[0]
        classes    = list(model.classes_)
        prob_dict  = {cls: round(float(p) * 100, 1) for cls, p in zip(classes, proba)}
        confidence = round(float(proba.max()) * 100, 1)

        severity_map = {
            "normal":              "healthy",
            "stressed_queenless":  "warning",
            "stressed_anomaly":    "critical",
        }

        return jsonify({
            "prediction":    str(prediction),
            "severity":      severity_map.get(str(prediction), "unknown"),
            "confidence":    confidence,
            "probabilities": prob_dict,
            "hive_id":       data.get("hive_id", "unknown"),
        })
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    load_model()
    app.run(host="0.0.0.0", port=5001, debug=False)