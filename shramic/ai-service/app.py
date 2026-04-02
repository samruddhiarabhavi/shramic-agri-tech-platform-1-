"""
Shramic Agri Tech Platform - AI Service (Flask)
All AI features merged into one file:
  - Crop Recommendation (/api/ai/crop-recommend)
  - Plant Disease Detection (/api/ai/disease-detect)
  - Soil & Yield Recommendation (/api/ai/soil-recommend)
"""

import os
import io
import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Model paths (update these if your folder changes) ──────────────────────────
CROP_MODEL_PATH    = r"C:\Users\HP\Downloads\shramic-agri-tech-platform\shramic\crop_recommendation\model.pkl"
CROP_ENCODER_PATH  = r"C:\Users\HP\Downloads\shramic-agri-tech-platform\shramic\crop_recommendation\label_encoder.pkl"
DISEASE_MODEL_PATH = r"C:\Users\HP\Downloads\shramic-agri-tech-platform\shramic\plant_disease\models\best_plant_disease_model.h5"
SOIL_MODEL_PATH    = r"C:\Users\HP\Downloads\shramic-agri-tech-platform\shramic\soil\yield_model.pkl"
SOIL_ENCODERS_PATH = r"C:\Users\HP\Downloads\shramic-agri-tech-platform\shramic\soil\yield_encoders.pkl"

app = Flask(__name__)
CORS(app)  # Allow calls from React frontend

# ── Lazy-load models on first request (saves startup time) ─────────────────────
_crop_model    = None
_crop_encoder  = None
_disease_model = None
_soil_model    = None
_soil_encoders = None

# 67 disease classes (from your training_output/data/test folder structure)
DISEASE_CLASSES = [
    "Apple_Apple_Black_rot", "Apple_Apple_Cedar_apple_rust", "Apple_Apple_healthy",
    "Apple_Apple_scab", "Cherry_Cherry_Healthy", "Cherry_Cherry_Powdery_mildew",
    "Citrus_Citrus_Black_spot", "Citrus_Citrus_canker", "Citrus_Citrus_greening",
    "Citrus_Citrus_Healthy", "Corn_Corn_cercospora_gray_leaf_spot", "Corn_Corn_Common_rust",
    "Corn_Corn_healthy", "Corn_Corn_Northern_Leaf_Blight", "Cotton_Cotton_bacterial_blight",
    "Cotton_Cotton_curl_virus", "Cotton_Cotton_fussarium_wilt", "Cotton_Cotton_healthy",
    "Grape_Grape_Black_Measles", "Grape_Grape_Black_rot", "Grape_Grape_Healthy",
    "Grape_Grape_Isariopsis_Leaf_Spot", "Peach_Peach_Bacterial_spot", "Peach_Peach_Healthy",
    "Pepper_bell_Pepper_bell_Bacterial_spot", "Pepper_bell_pepper_bell_healthy",
    "Potato_Potato_Early_blight", "Potato_Potato_healthy", "Potato_Potato_Late_blight",
    "Rice_Rice_Bacterial_Leaf_Blight", "Rice_Rice_Brown_Spot", "Rice_Rice_Healthy",
    "Rice_Rice_Leaf_Blast", "Rice_Rice_Leaf_scald", "Rice_Rice_Sheath_Blight",
    "Strawberry_Strawberry_Healthy", "Strawberry_Strawberry_Leaf_scorch",
    "Sugarcane_Sugarcane_Healthy", "Sugarcane_Sugarcane_Mosaic_Virus",
    "Sugarcane_Sugarcane_RedRot", "Sugarcane_Sugarcane_Rust", "Sugarcane_Sugarcane_Yellow",
    "Tomato_Tomato_Bacterial_spot", "Tomato_Tomato_Early_blight", "Tomato_Tomato_healthy",
    "Tomato_Tomato_Late_blight", "Tomato_Tomato_Leaf_Mold", "Tomato_Tomato_mosaic_virus",
    "Tomato_Tomato_Septoria_leaf_spot", "Tomato_Tomato_Spider_mites",
    "Tomato_Tomato_Target_Spot", "Tomato_Tomato_YellowLeaf_Curl_Virus",
    "Wheat_Wheat_Aphid", "Wheat_Wheat_Black_Rust", "Wheat_Wheat_Blast",
    "Wheat_Wheat_Brown_Rust", "Wheat_Wheat_Common_Root_Rot", "Wheat_Wheat_Fusarium_Head_Blight",
    "Wheat_Wheat_Healthy", "Wheat_Wheat_Leaf_Blight", "Wheat_Wheat_Mildew",
    "Wheat_Wheat_Mite", "Wheat_Wheat_Septoria", "Wheat_Wheat_Smut",
    "Wheat_Wheat_Stem_fly", "Wheat_Wheat_Tan_spot", "Wheat_Wheat_Yellow_Rust",
]

# Treatment map for common diseases (expandable)
TREATMENTS = {
    "healthy": "Your plant is healthy! Maintain good irrigation and balanced fertilization.",
    "Black_rot": "Apply copper-based fungicide. Remove infected leaves. Improve air circulation.",
    "Cedar_apple_rust": "Apply myclobutanil or mancozeb fungicide during early spring.",
    "scab": "Use captan or sulfur fungicide. Prune for better air circulation.",
    "Powdery_mildew": "Apply potassium bicarbonate or sulfur-based fungicide. Avoid overhead watering.",
    "Black_spot": "Use copper hydroxide. Remove infected parts. Ensure proper drainage.",
    "canker": "Prune infected branches 10cm below lesion. Apply copper bactericide.",
    "greening": "No cure. Remove and destroy infected trees. Control psyllid vectors.",
    "cercospora_gray_leaf_spot": "Apply strobilurin fungicide. Rotate crops annually.",
    "Common_rust": "Apply triazole fungicide. Plant resistant varieties.",
    "Northern_Leaf_Blight": "Apply azoxystrobin or propiconazole. Rotate crops.",
    "bacterial_blight": "Use copper-based bactericide. Avoid excessive nitrogen.",
    "curl_virus": "Control whitefly vectors. Remove infected plants. Use virus-resistant seeds.",
    "fussarium_wilt": "No chemical cure. Use resistant varieties. Solarize soil.",
    "Black_Measles": "Apply potassium silicate. Prune dead wood. Improve drainage.",
    "Isariopsis_Leaf_Spot": "Apply mancozeb or copper fungicide. Remove infected leaves.",
    "Bacterial_spot": "Apply copper hydroxide. Avoid overhead irrigation.",
    "Bacterial_Leaf_Blight": "Use copper bactericide. Drain fields properly.",
    "Brown_Spot": "Apply propiconazole fungicide. Balanced potassium fertilization.",
    "Leaf_Blast": "Apply tricyclazole or isoprothiolane. Avoid excessive nitrogen.",
    "Leaf_scald": "Use disease-free seeds. Apply iprodione fungicide.",
    "Sheath_Blight": "Apply validamycin or hexaconazole. Reduce plant density.",
    "Leaf_scorch": "Apply copper fungicide. Remove infected leaves. Avoid drought stress.",
    "Mosaic_Virus": "Control aphid and mealybug vectors. Remove infected plants.",
    "RedRot": "Use disease-free setts. Apply carbendazim fungicide.",
    "Rust": "Apply propiconazole or tebuconazole. Remove infected tissue.",
    "Yellow": "Identify and treat for mosaic virus or nutrient deficiency.",
    "Early_blight": "Apply chlorothalonil or mancozeb. Remove lower infected leaves.",
    "Late_blight": "Apply metalaxyl + mancozeb. Harvest early if outbreak is severe.",
    "Leaf_Mold": "Improve ventilation. Apply chlorothalonil fungicide.",
    "mosaic_virus": "No cure. Remove infected plants. Control insect vectors.",
    "Septoria_leaf_spot": "Apply copper or chlorothalonil fungicide. Avoid leaf wetness.",
    "Spider_mites": "Apply acaricide or neem oil. Increase humidity around plants.",
    "Target_Spot": "Apply azoxystrobin. Remove and destroy infected debris.",
    "YellowLeaf_Curl_Virus": "Control whitefly. Remove infected plants. Use resistant varieties.",
    "Aphid": "Apply imidacloprid or neem oil. Introduce natural predators.",
    "Black_Rust": "Apply propiconazole. Plant resistant wheat varieties.",
    "Blast": "Apply tricyclazole. Use blast-resistant seeds.",
    "Fusarium_Head_Blight": "Apply tebuconazole at flowering stage. Avoid dense planting.",
    "Mildew": "Apply triadimefon or sulfur fungicide. Improve air circulation.",
    "Mite": "Apply abamectin or spiromesifen acaricide.",
    "Septoria": "Apply propiconazole at flag leaf stage.",
    "Smut": "Treat seeds with carboxin fungicide before sowing.",
    "Stem_fly": "Apply chlorpyrifos. Use early sowing. Remove crop residues.",
    "Tan_spot": "Apply propiconazole. Use disease-free seeds. Rotate crops.",
    "Common_Root_Rot": "Use trichoderma-treated seeds. Avoid waterlogging.",
}


def get_treatment(disease_name: str) -> str:
    """Extract treatment hint from disease class name."""
    if "healthy" in disease_name.lower() or "Healthy" in disease_name:
        return TREATMENTS["healthy"]
    for key, treatment in TREATMENTS.items():
        if key.lower() in disease_name.lower():
            return treatment
    return "Consult your local agricultural extension officer for treatment advice."


def load_crop_models():
    global _crop_model, _crop_encoder
    if _crop_model is None:
        import joblib
        _crop_model   = joblib.load(CROP_MODEL_PATH)
        _crop_encoder = joblib.load(CROP_ENCODER_PATH)


def load_disease_model():
    global _disease_model
    if _disease_model is None:
        import tensorflow as tf
        _disease_model = tf.keras.models.load_model(DISEASE_MODEL_PATH)


def load_soil_models():
    global _soil_model, _soil_encoders
    if _soil_model is None:
        import joblib
        _soil_model    = joblib.load(SOIL_MODEL_PATH)
        _soil_encoders = joblib.load(SOIL_ENCODERS_PATH)


# ── Health check ───────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Shramic AI Service"})


# ── 1. Crop Recommendation ─────────────────────────────────────────────────────
@app.route("/api/ai/crop-recommend", methods=["POST"])
def crop_recommend():
    """
    Input JSON: { N, P, K, temperature, humidity, ph, rainfall }
    Output JSON: { recommended_crop, confidence, alternatives }
    """
    try:
        load_crop_models()
        data = request.get_json(force=True)

        required = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        features = np.array([[
            float(data["N"]),
            float(data["P"]),
            float(data["K"]),
            float(data["temperature"]),
            float(data["humidity"]),
            float(data["ph"]),
            float(data["rainfall"]),
        ]])

        proba      = _crop_model.predict_proba(features)[0]
        top3_idx   = np.argsort(proba)[::-1][:3]
        crop_names = _crop_encoder.classes_

        recommended = crop_names[top3_idx[0]]
        confidence  = round(float(proba[top3_idx[0]]) * 100, 2)
        alternatives = [
            {"crop": crop_names[i], "confidence": round(float(proba[i]) * 100, 2)}
            for i in top3_idx[1:]
        ]

        return jsonify({
            "recommended_crop": recommended,
            "confidence": confidence,
            "alternatives": alternatives,
            "input_summary": {
                "N": data["N"], "P": data["P"], "K": data["K"],
                "temperature": data["temperature"], "humidity": data["humidity"],
                "ph": data["ph"], "rainfall": data["rainfall"],
            }
        })

    except FileNotFoundError:
        return jsonify({"error": "Crop model not found. Check CROP_MODEL_PATH."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 2. Plant Disease Detection ─────────────────────────────────────────────────
@app.route("/api/ai/disease-detect", methods=["POST"])
def disease_detect():
    """
    Input: multipart/form-data with 'image' file
    Output JSON: { disease, plant, severity, treatment, confidence }
    """
    try:
        load_disease_model()

        if "image" not in request.files:
            return jsonify({"error": "No image file provided. Use key 'image'."}), 400

        file        = request.files["image"]
        img_bytes   = file.read()

        import tensorflow as tf
        from PIL import Image

        img   = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((224, 224))
        arr   = np.array(img) / 255.0
        batch = np.expand_dims(arr, axis=0)

        preds      = _disease_model.predict(batch)[0]
        top_idx    = int(np.argmax(preds))
        confidence = round(float(preds[top_idx]) * 100, 2)

        # Use DISEASE_CLASSES list; fallback to index string if model has more/fewer classes
        if top_idx < len(DISEASE_CLASSES):
            class_name = DISEASE_CLASSES[top_idx]
        else:
            class_name = f"Class_{top_idx}"

        parts     = class_name.split("_", 1)
        plant     = parts[0] if len(parts) > 0 else "Unknown"
        condition = parts[1].replace("_", " ") if len(parts) > 1 else class_name

        # Simple severity heuristic
        if confidence > 85:
            severity = "High"
        elif confidence > 60:
            severity = "Medium"
        else:
            severity = "Low"

        treatment = get_treatment(class_name)

        return jsonify({
            "disease":    condition,
            "plant":      plant,
            "severity":   severity,
            "confidence": confidence,
            "treatment":  treatment,
            "class_raw":  class_name,
        })

    except FileNotFoundError:
        return jsonify({"error": "Disease model not found. Check DISEASE_MODEL_PATH."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 3. Soil & Yield Recommendation ────────────────────────────────────────────
@app.route("/api/ai/soil-recommend", methods=["POST"])
def soil_recommend():
    """
    Input JSON: { crop, season, state, area, fertilizer, pesticide }
    Output JSON: { predicted_yield, fertilizer_suggestion, advice }
    Soil N/P/K lookup is done via state_soil_data.csv at startup.
    """
    try:
        load_soil_models()
        data = request.get_json(force=True)

        required = ["crop", "season", "state", "area"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        # Encode categorical fields using saved encoders
        encoders = _soil_encoders  # dict of LabelEncoders keyed by column name

        crop_enc    = encoders["crop"].transform([data["crop"]])[0]
        season_enc  = encoders["season"].transform([data["season"]])[0]
        state_enc   = encoders["state"].transform([data["state"]])[0]

        area       = float(data.get("area", 100))
        fertilizer = float(data.get("fertilizer", 500))
        pesticide  = float(data.get("pesticide", 10))

        features = np.array([[crop_enc, season_enc, state_enc, area, fertilizer, pesticide]])
        predicted_yield = float(_soil_model.predict(features)[0])

        # Fertilizer advice (simple heuristic)
        if predicted_yield < 1.0:
            fert_advice = "Low yield predicted. Increase nitrogen (N) by 20%, add organic compost."
            advice = "Consider soil testing. Low yields may indicate pH imbalance or nutrient deficiency."
        elif predicted_yield < 3.0:
            fert_advice = "Moderate yield. Maintain current N-P-K ratio. Add micronutrients (Zn, Fe)."
            advice = "Ensure adequate irrigation and pest management during critical growth stages."
        else:
            fert_advice = "Good yield expected. Reduce fertilizer by 10% to avoid over-application."
            advice = "Maintain current practices. Monitor for disease and pest outbreaks."

        return jsonify({
            "predicted_yield":        round(predicted_yield, 4),
            "unit":                   "tonnes/hectare",
            "fertilizer_suggestion":  fert_advice,
            "advice":                 advice,
            "input": {
                "crop": data["crop"], "season": data["season"],
                "state": data["state"], "area": area,
            }
        })

    except ValueError as e:
        return jsonify({"error": f"Encoding error — unseen label: {str(e)}"}), 400
    except FileNotFoundError:
        return jsonify({"error": "Soil model not found. Check SOIL_MODEL_PATH."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Starting Shramic AI Service on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
