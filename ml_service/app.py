from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np

app = Flask(__name__)

# ==========================================================
# Load Trained Random Forest Model
# ==========================================================
model = joblib.load("models/hive_model.pkl")
print(model.feature_names_in_)


def predict_hive(data):
    try:
        hive_id = data.get("hive_id", "HIVE001")

        temperature = float(data.get("temperature", 0))
        humidity = float(data.get("humidity", 0))

        # Support both incoming field names from different firmware
        # versions - this part was already fine.
        sound = float(
            data.get(
                "sound_level",
                data.get("sound_envelope", 0)
            )
        )

        vibration = int(data.get("vibration", 0))
        health = float(data.get("health_score", 0))

        # --------------------------------------------------
        # Use DataFrame (removes sklearn warning)
        #
        # Column name MUST be "sound_envelope" to match what the
        # model saw during .fit() (confirmed via model.feature_names_in_).
        # --------------------------------------------------
        features = pd.DataFrame([{
            "temperature": temperature,
            "humidity": humidity,
            "sound_envelope": sound,
            "vibration": vibration,
            "health_score": health
        }])

        # --------------------------------------------------
        # Prediction
        # --------------------------------------------------
        predicted_state = str(model.predict(features)[0])

        probabilities = model.predict_proba(features)[0]

        confidence = float(np.max(probabilities) * 100)

        # --------------------------------------------------
        # Map ML classes to backend enum values
        #
        # The model outputs: NORMAL, MONITORING, CRITICAL
        # These map directly to meaningful backend labels now,
        # instead of the old model's queenless/anomaly names.
        # --------------------------------------------------
        prediction_map = {
            "NORMAL":     "normal",
            "MONITORING": "monitoring",
            "CRITICAL":   "critical"
        }

        prediction = prediction_map.get(
            predicted_state.upper(),
            "unavailable"
        )

        severity_map = {
            "normal":      "healthy",
            "monitoring":  "warning",
            "critical":    "critical",
            "unavailable": "unknown"
        }

        severity = severity_map.get(
            prediction,
            "unknown"
        )

        probability_dict = {}

        try:
            for cls, prob in zip(model.classes_, probabilities):

                backend_cls = prediction_map.get(
                    str(cls).upper(),
                    str(cls).lower()
                )

                probability_dict[backend_cls] = round(
                    float(prob * 100),
                    2
                )

        except Exception:
            pass

        # --------------------------------------------------
        # Debug
        # --------------------------------------------------
        print("\n===================================")
        print("Hive ID      :", hive_id)
        print("Temperature  :", temperature)
        print("Humidity     :", humidity)
        print("Sound        :", sound)
        print("Vibration    :", vibration)
        print("Health Score :", health)
        print("-----------------------------------")
        print("Raw Model    :", predicted_state)
        print("Prediction   :", prediction)
        print("Severity     :", severity)
        print("Confidence   :", round(confidence, 2))
        print("===================================\n")

        return jsonify({
            "success": True,

            "prediction": prediction,
            "severity": severity,
            "confidence": round(confidence, 2),
            "probabilities": probability_dict,

            "hive_id": hive_id
        }), 200

    except Exception as e:

        print("\n[Prediction Error]")
        print(e)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================================
# Node.js Backend Route
# ==========================================================
@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON"
        }), 400

    return predict_hive(data)


# ==========================================================
# Direct ESP32 Route
# ==========================================================
@app.route("/api/hives/data", methods=["POST"])
def api_hive_data():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON"
        }), 400

    return predict_hive(data)


# ==========================================================
# Health Check
# ==========================================================
@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "status": "running",
        "service": "BeeHive ML Service"
    })


# ==========================================================
# Start Server
# ==========================================================
if __name__ == "__main__":

    print("\n========================================")
    print("BeeHive ML Service Started")
    print("Listening on port 8000")
    print("========================================\n")

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=False,
        use_reloader=False
    )
