"""
Shramic Agri Tech Platform — AI Service (Flask)
Render-ready version:
  - All paths are relative to this file
  - PORT read from environment variable (Render sets this)
  - Models downloaded from URLs on first boot if not present
  - Gunicorn-compatible (no use_reloader)
"""

import os, io, csv, warnings, requests
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ── Base directory (same folder as this file) ──────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Model / data paths (all relative) ─────────────────────────────────────────
CROP_MODEL_PATH    = os.path.join(BASE_DIR, "crop_recommendation", "model.pkl")
CROP_ENCODER_PATH  = os.path.join(BASE_DIR, "crop_recommendation", "label_encoder.pkl")
DISEASE_MODEL_PATH = os.path.join(BASE_DIR, "plant_disease", "models", "best_plant_disease_model.h5")
YIELD_CSV          = os.path.join(BASE_DIR, "crop_yield.csv")
SOIL_CSV           = os.path.join(BASE_DIR, "state_soil_data.csv")

# ── Optional: download models from URLs on cold start ─────────────────────────
# Set these environment variables in Render's dashboard if your models are hosted
# e.g. on Google Drive (direct download link) or any public URL.
# Leave blank if you are committing models directly to your repo.
MODEL_URLS = {
    CROP_MODEL_PATH:    os.environ.get("CROP_MODEL_URL", ""),
    CROP_ENCODER_PATH:  os.environ.get("CROP_ENCODER_URL", ""),
    DISEASE_MODEL_PATH: os.environ.get("DISEASE_MODEL_URL", ""),
}

def _maybe_download(path: str, url: str):
    """Download a file from `url` to `path` if path doesn't exist and url is set."""
    if os.path.exists(path):
        return
    if not url:
        return
    print(f"⬇️  Downloading model: {os.path.basename(path)} ...")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅  Downloaded: {os.path.basename(path)}")
    except Exception as e:
        print(f"❌  Failed to download {os.path.basename(path)}: {e}")

# Download any missing models at startup
for _path, _url in MODEL_URLS.items():
    _maybe_download(_path, _url)

# ── Lazy model holders ─────────────────────────────────────────────────────────
_crop_model    = None
_crop_encoder  = None
_disease_model = None

# ── Pre-load CSV data at startup ───────────────────────────────────────────────
YIELD_DATA = []
SOIL_DATA  = {}

def _load_csv_data():
    global YIELD_DATA, SOIL_DATA
    if os.path.exists(YIELD_CSV):
        with open(YIELD_CSV, newline="", encoding="utf-8-sig") as f:
            YIELD_DATA = [
                {k: v.strip() for k, v in row.items()}
                for row in csv.DictReader(f)
            ]
    if os.path.exists(SOIL_CSV):
        with open(SOIL_CSV, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                SOIL_DATA[row["state"].strip()] = {
                    "N":  float(row.get("N",  75)),
                    "P":  float(row.get("P",  35)),
                    "K":  float(row.get("K",  30)),
                    "pH": float(row.get("pH", 6.8)),
                }

_load_csv_data()
print(f"✅ Loaded {len(YIELD_DATA)} yield records, {len(SOIL_DATA)} states")

# ── Disease classes ────────────────────────────────────────────────────────────
DISEASE_CLASSES = [
    "Apple_Apple_Black_rot","Apple_Apple_Cedar_apple_rust","Apple_Apple_healthy",
    "Apple_Apple_scab","Cherry_Cherry_Healthy","Cherry_Cherry_Powdery_mildew",
    "Citrus_Citrus_Black_spot","Citrus_Citrus_canker","Citrus_Citrus_greening",
    "Citrus_Citrus_Healthy","Corn_Corn_cercospora_gray_leaf_spot","Corn_Corn_Common_rust",
    "Corn_Corn_healthy","Corn_Corn_Northern_Leaf_Blight","Cotton_Cotton_bacterial_blight",
    "Cotton_Cotton_curl_virus","Cotton_Cotton_fussarium_wilt","Cotton_Cotton_healthy",
    "Grape_Grape_Black_Measles","Grape_Grape_Black_rot","Grape_Grape_Healthy",
    "Grape_Grape_Isariopsis_Leaf_Spot","Peach_Peach_Bacterial_spot","Peach_Peach_Healthy",
    "Pepper_bell_Pepper_bell_Bacterial_spot","Pepper_bell_pepper_bell_healthy",
    "Potato_Potato_Early_blight","Potato_Potato_healthy","Potato_Potato_Late_blight",
    "Rice_Rice_Bacterial_Leaf_Blight","Rice_Rice_Brown_Spot","Rice_Rice_Healthy",
    "Rice_Rice_Leaf_Blast","Rice_Rice_Leaf_scald","Rice_Rice_Sheath_Blight",
    "Strawberry_Strawberry_Healthy","Strawberry_Strawberry_Leaf_scorch",
    "Sugarcane_Sugarcane_Healthy","Sugarcane_Sugarcane_Mosaic_Virus",
    "Sugarcane_Sugarcane_RedRot","Sugarcane_Sugarcane_Rust","Sugarcane_Sugarcane_Yellow",
    "Tomato_Tomato_Bacterial_spot","Tomato_Tomato_Early_blight","Tomato_Tomato_healthy",
    "Tomato_Tomato_Late_blight","Tomato_Tomato_Leaf_Mold","Tomato_Tomato_mosaic_virus",
    "Tomato_Tomato_Septoria_leaf_spot","Tomato_Tomato_Spider_mites",
    "Tomato_Tomato_Target_Spot","Tomato_Tomato_YellowLeaf_Curl_Virus",
    "Wheat_Wheat_Aphid","Wheat_Wheat_Black_Rust","Wheat_Wheat_Blast",
    "Wheat_Wheat_Brown_Rust","Wheat_Wheat_Common_Root_Rot","Wheat_Wheat_Fusarium_Head_Blight",
    "Wheat_Wheat_Healthy","Wheat_Wheat_Leaf_Blight","Wheat_Wheat_Mildew",
    "Wheat_Wheat_Mite","Wheat_Wheat_Septoria","Wheat_Wheat_Smut",
    "Wheat_Wheat_Stem_fly","Wheat_Wheat_Tan_spot","Wheat_Wheat_Yellow_Rust",
]

TREATMENTS = {
    "healthy": {
        "summary": "Your plant is healthy! No disease detected.",
        "immediate": "No immediate action needed.",
        "steps": [
            "Continue regular watering — avoid waterlogging",
            "Apply balanced NPK fertilizer as per crop schedule",
            "Monitor weekly for early signs of pest or disease",
            "Remove any dead or yellowing leaves to maintain airflow",
        ],
        "prevention": "Spray neem oil (5ml/litre) once every 15 days as a preventive measure.",
        "products": [],
    },
    "Black_rot": {
        "summary": "Black Rot — A fungal disease that causes dark, sunken spots on fruits and leaves.",
        "immediate": "Remove and burn all infected leaves and fruits immediately. Do not compost them.",
        "steps": [
            "Spray Copper Oxychloride (3g per litre of water) on all plant surfaces",
            "Repeat spraying every 7–10 days for 3–4 weeks",
            "Improve air circulation by pruning dense branches",
            "Avoid overhead irrigation — use drip or base watering",
            "After harvest, remove all crop debris from the field",
        ],
        "prevention": "In next season, use disease-resistant varieties and treat seeds with Thiram (2g/kg seed) before sowing.",
        "products": ["Copper Oxychloride (Blitox 50)", "Mancozeb (Dithane M-45)", "Captan 50WP"],
    },
    "Cedar_apple_rust": {
        "summary": "Cedar Apple Rust — Orange powdery spots on leaves caused by a fungus that spreads from cedar trees.",
        "immediate": "Remove and destroy all infected leaves. Do not leave them on the ground.",
        "steps": [
            "Spray Myclobutanil (1ml per litre) or Mancozeb (2.5g per litre) immediately",
            "Start spraying when leaves first appear in spring — repeat every 10 days",
            "Remove any nearby cedar or juniper trees if possible (they spread this disease)",
            "Apply 3–4 sprays during the infection season",
        ],
        "prevention": "Plant rust-resistant apple varieties. Apply protective fungicide spray before rainy season starts.",
        "products": ["Myclobutanil (Rally)", "Mancozeb (Dithane M-45)", "Propiconazole (Tilt)"],
    },
    "scab": {
        "summary": "Apple/Potato Scab — Dark, rough, corky patches on fruit or leaves caused by a fungus in wet conditions.",
        "immediate": "Collect and destroy all fallen infected leaves and fruits from the ground.",
        "steps": [
            "Spray Captan (2.5g per litre) or Mancozeb (2g per litre) on the entire plant",
            "Begin spraying at bud break and repeat every 7 days during rainy weather",
            "Prune the tree to improve sunlight and air movement inside the canopy",
            "Avoid wetting leaves during evening irrigation",
            "Do 5–6 sprays during the active growing season",
        ],
        "prevention": "Use scab-resistant varieties next season. Apply lime sulfur spray during dormant season.",
        "products": ["Captan 50WP", "Mancozeb (Dithane M-45)", "Sulfur 80WP"],
    },
    "Powdery_mildew": {
        "summary": "Powdery Mildew — White powdery coating on leaves and stems. Weakens the plant and reduces yield.",
        "immediate": "Remove heavily infected leaves and dispose them away from the field.",
        "steps": [
            "Mix 1 tablespoon of baking soda + 1 teaspoon of neem oil in 1 litre of water and spray — safe and effective",
            "Or spray Sulfur 80WP (2g per litre) on all infected parts",
            "Spray in the morning so leaves dry by afternoon",
            "Repeat every 7 days for 3–4 weeks",
            "Avoid applying excess nitrogen fertilizer — it makes plants more vulnerable",
        ],
        "prevention": "Ensure proper spacing between plants for airflow. Avoid overhead watering in the evening.",
        "products": ["Sulfur 80WP (Thiovit)", "Hexaconazole (Contaf)", "Propiconazole (Tilt)", "Karathane (Dinocap)"],
    },
    "bacterial_blight": {
        "summary": "Bacterial Blight — Water-soaked spots that turn brown/black. Spreads fast in wet, humid weather.",
        "immediate": "Stop overhead irrigation immediately. Remove and burn infected plant parts.",
        "steps": [
            "Spray Copper Hydroxide (3g per litre) or Streptomycin Sulfate (1g per 10 litres) on all plants",
            "Repeat spraying every 10 days for 3–4 applications",
            "Avoid working in the field when plants are wet — disease spreads through contact",
            "Disinfect all cutting tools with bleach solution (1:10) between plants",
            "Drain standing water from the field",
        ],
        "prevention": "Use certified disease-free seeds. Treat seeds with Streptomycin before sowing. Practice 3-year crop rotation.",
        "products": ["Copper Hydroxide (Kocide)", "Streptomycin + Tetracycline (Plantomycin)", "Copper Oxychloride"],
    },
    "curl_virus": {
        "summary": "Leaf Curl Virus — Leaves curl upward and turn yellow. Spread by whiteflies. Cannot be cured once infected.",
        "immediate": "Remove and destroy all infected plants immediately to stop spread. Do not compost.",
        "steps": [
            "Spray Imidacloprid (0.5ml per litre) to kill whiteflies that spread the virus",
            "Or use yellow sticky traps to catch whiteflies — hang 10 traps per acre",
            "Spray neem oil (5ml per litre) every week as a repellent",
            "Plant healthy seedlings only — check for whiteflies before transplanting",
            "Install insect-proof nets around nursery beds",
        ],
        "prevention": "Use virus-resistant varieties (e.g., TH-2, Arka Rakshak for tomato). Avoid planting near infected fields.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Yellow Sticky Traps", "Neem Oil"],
    },
    "fussarium_wilt": {
        "summary": "Fusarium Wilt — Plant wilts suddenly, leaves turn yellow from bottom up. Roots turn dark brown inside.",
        "immediate": "Remove and burn wilted plants immediately. Do not replant the same crop in that spot for 3 years.",
        "steps": [
            "Drench soil with Carbendazim (1g per litre) or Trichoderma viride (10g per litre) around the plant base",
            "Dig up infected plants with roots — check for brown discoloration inside the stem",
            "Solarize the infected soil — cover with transparent plastic sheet for 6 weeks in summer",
            "Add well-decomposed farmyard manure (5 tonnes/acre) to improve soil health",
            "Do not use the same field for the same crop for at least 3 years",
        ],
        "prevention": "Use Fusarium-resistant varieties. Treat seeds with Trichoderma (4g/kg seed) before sowing. Avoid waterlogging.",
        "products": ["Trichoderma viride (biocontrol)", "Carbendazim (Bavistin)", "Thiophanate Methyl"],
    },
    "Early_blight": {
        "summary": "Early Blight — Dark brown spots with yellow rings (like a target) on older leaves. Caused by Alternaria fungus.",
        "immediate": "Remove all infected lower leaves immediately and destroy them.",
        "steps": [
            "Spray Mancozeb (2.5g per litre) or Chlorothalonil (2g per litre) on all plant surfaces",
            "Start from the bottom of the plant and spray upward",
            "Repeat every 7–10 days — do at least 4–5 sprays",
            "Do not spray during midday heat — spray early morning or late evening",
            "Mulch the soil around plants to prevent soil splash onto leaves",
        ],
        "prevention": "Rotate crops — avoid planting tomato/potato in the same field for 2 years. Use certified seeds.",
        "products": ["Mancozeb (Dithane M-45)", "Chlorothalonil (Kavach)", "Azoxystrobin (Amistar)", "Iprodione"],
    },
    "Late_blight": {
        "summary": "Late Blight — Water-soaked gray patches on leaves that turn brown fast. VERY destructive.",
        "immediate": "URGENT: Stop all irrigation immediately. Remove and burn infected plants.",
        "steps": [
            "Spray Metalaxyl + Mancozeb (Ridomil Gold, 2.5g per litre) IMMEDIATELY on entire field",
            "Repeat every 5–7 days — this is critical",
            "If disease is severe, harvest remaining healthy crop early to save it",
            "Remove all infected plant debris from field and burn",
            "Do not allow water runoff from infected field to other fields",
        ],
        "prevention": "Never plant susceptible varieties in rainy season without protective spraying.",
        "products": ["Metalaxyl + Mancozeb (Ridomil Gold MZ)", "Cymoxanil + Mancozeb (Curzate M)", "Dimethomorph (Acrobat)"],
    },
    "Leaf_Blast": {
        "summary": "Rice Leaf Blast — Diamond-shaped gray spots with brown border. Can cause 70–80% yield loss.",
        "immediate": "Stop applying nitrogen fertilizer immediately. Spray fungicide within 24 hours.",
        "steps": [
            "Spray Tricyclazole (0.6g per litre) or Isoprothiolane (1.5ml per litre) immediately",
            "Repeat spraying after 10 days",
            "Maintain thin layer of water in field (2–3 cm)",
            "Avoid applying urea at this stage",
        ],
        "prevention": "Use blast-resistant varieties (IR-64, Pusa Basmati 1121). Balanced fertilization.",
        "products": ["Tricyclazole (Bim)", "Isoprothiolane (Fuji-One)", "Propiconazole (Tilt)", "Azoxystrobin (Amistar)"],
    },
    "Brown_Spot": {
        "summary": "Brown Spot — Oval brown spots on rice/crop leaves. Caused by nutrient deficiency + fungus.",
        "immediate": "Apply potassium fertilizer (MOP, 15 kg/acre) immediately.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Mancozeb (2.5g per litre) on all leaves",
            "Apply potassium fertilizer to the field",
            "Repeat fungicide spray after 10–12 days",
            "Ensure proper water management — avoid water stress",
        ],
        "prevention": "Improve soil fertility before planting. Apply balanced NPK.",
        "products": ["Propiconazole (Tilt)", "Mancozeb (Dithane M-45)", "Iprodione (Rovral)"],
    },
    "Bacterial_Leaf_Blight": {
        "summary": "Bacterial Leaf Blight (BLB) — Yellowing from leaf tip/edges inward. Major rice disease.",
        "immediate": "Drain field water immediately. Stop nitrogen fertilizer.",
        "steps": [
            "Spray Copper Hydroxide (3g per litre) on entire crop",
            "Or spray Streptomycin Sulfate (1g per 10 litres) + Copper Oxychloride (3g per litre)",
            "Repeat every 10 days for 2–3 applications",
            "Drain standing water from field",
        ],
        "prevention": "Use BLB-resistant varieties (IR-64, Swarna Sub-1). Avoid excess nitrogen.",
        "products": ["Copper Hydroxide (Kocide)", "Streptomycin + Copper (Blitox + Plantomycin)", "Bismerthiazol"],
    },
    "Sheath_Blight": {
        "summary": "Sheath Blight — Oval greenish-gray patches on leaf sheaths. Spreads fast in dense crops.",
        "immediate": "Reduce plant density — thin out crowded areas. Drain excess water.",
        "steps": [
            "Spray Validamycin (2.5ml per litre) or Hexaconazole (1ml per litre) at the base of plants",
            "Start spraying when disease first appears at tillering stage",
            "Repeat every 10 days for 2–3 sprays",
        ],
        "prevention": "Reduce seed rate — avoid dense planting. Balanced NPK — reduce nitrogen.",
        "products": ["Validamycin (Sheathmar)", "Hexaconazole (Contaf)", "Propiconazole (Tilt)"],
    },
    "Mosaic_Virus": {
        "summary": "Mosaic Virus — Yellow-green mottled pattern on leaves. Spread by aphids. Cannot be cured.",
        "immediate": "Remove and destroy all infected plants to prevent spread.",
        "steps": [
            "Kill aphids/thrips: spray Imidacloprid (0.5ml per litre) or Dimethoate (2ml per litre)",
            "Remove infected plants with roots — bag them in plastic before carrying out",
            "Use yellow sticky traps (10 per acre)",
            "Spray neem oil (5ml per litre) every week on healthy plants",
        ],
        "prevention": "Use virus-free certified planting material. Control insects from day 1.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)", "Yellow Sticky Traps"],
    },
    "Spider_mites": {
        "summary": "Spider Mites — Tiny insects causing yellow stippling on leaves. Fine webs under leaves.",
        "immediate": "Spray water forcefully under the leaves to knock off mites.",
        "steps": [
            "Spray Abamectin (1ml per litre) or Spiromesifen (1ml per litre) under the leaves",
            "Repeat after 7 days with a different chemical",
            "Increase humidity around plants",
        ],
        "prevention": "Avoid water stress. Keep the field free of dust.",
        "products": ["Abamectin (Vertimec)", "Spiromesifen (Oberon)", "Dicofol (Kelthane)", "Fenazaquin (Magister)"],
    },
    "Aphid": {
        "summary": "Aphid Infestation — Small insects on young shoots. Cause leaf curling and yellowing. Spread viruses.",
        "immediate": "Spray a strong jet of water on affected parts to dislodge aphids.",
        "steps": [
            "Spray Imidacloprid (0.5ml per litre) or Thiamethoxam (0.2g per litre) on entire plant",
            "Repeat after 10–12 days if aphids return",
            "Mix neem oil (5ml) + soap solution (2ml) per litre for organic control",
        ],
        "prevention": "Avoid excess nitrogen fertilizer. Plant marigolds as border crop.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)", "Neem Oil (Econeem)"],
    },
    "Rust": {
        "summary": "Rust Disease — Orange/brown powdery pustules on leaves. Can cause 30–50% yield loss.",
        "immediate": "Remove and burn infected leaves.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Tebuconazole (1ml per litre) immediately",
            "Cover all leaf surfaces — top and bottom",
            "Repeat every 10–14 days for 3 applications",
        ],
        "prevention": "Plant rust-resistant varieties. Apply protective fungicide at flag leaf stage.",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb (Dithane M-45)", "Hexaconazole"],
    },
    "Leaf_scorch": {
        "summary": "Leaf Scorch — Edges and tips of leaves turn brown and dry.",
        "immediate": "Water the plants deeply but less frequently.",
        "steps": [
            "Spray Copper Fungicide (3g per litre) if caused by fungus",
            "Irrigate properly — avoid letting soil dry out completely",
            "Remove badly scorched leaves",
        ],
        "prevention": "Avoid planting in very salty soils. Ensure consistent irrigation.",
        "products": ["Copper Oxychloride (Blitox)", "Mancozeb (Dithane M-45)", "Propiconazole (Tilt)"],
    },
    "RedRot": {
        "summary": "Red Rot of Sugarcane — Internal red coloring inside the stalk. One of the most serious sugarcane diseases.",
        "immediate": "Remove and burn all infected stools including roots.",
        "steps": [
            "Drench soil with Carbendazim (1g per litre) around remaining healthy plants",
            "Treat seed setts in hot water at 50°C for 2 hours before planting",
            "Remove and burn all infected crop debris after harvest",
        ],
        "prevention": "Use resistant varieties (Co-0238, CoJ-64). Always use healthy certified seed setts.",
        "products": ["Carbendazim (Bavistin)", "Thiophanate Methyl", "Trichoderma viride (biocontrol)"],
    },
    "Septoria_leaf_spot": {
        "summary": "Septoria Leaf Spot — Small brown spots with yellow halos. Very common in tomato and wheat.",
        "immediate": "Remove all infected lower leaves and destroy them.",
        "steps": [
            "Spray Chlorothalonil (2g per litre) or Mancozeb (2.5g per litre) on entire plant",
            "Repeat every 7–10 days for 4–5 sprays",
            "Water at the base of plants — avoid wetting leaves",
        ],
        "prevention": "Use certified disease-free seeds. Rotate crops.",
        "products": ["Chlorothalonil (Kavach)", "Mancozeb (Dithane M-45)", "Azoxystrobin (Amistar)", "Copper Oxychloride"],
    },
    "Target_Spot": {
        "summary": "Target Spot — Brown circular spots with rings (like a bullseye) on leaves.",
        "immediate": "Remove heavily spotted leaves. Improve air circulation by pruning.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Difenoconazole (1ml per litre) on infected plants",
            "Repeat every 10 days for 3 applications",
        ],
        "prevention": "Maintain proper plant spacing. Use drip irrigation.",
        "products": ["Azoxystrobin (Amistar)", "Difenoconazole (Score)", "Chlorothalonil (Kavach)"],
    },
    "YellowLeaf_Curl_Virus": {
        "summary": "Tomato Yellow Leaf Curl Virus (TYLCV) — Leaves curl upward, turn yellow. No cure.",
        "immediate": "Remove and destroy all infected plants immediately.",
        "steps": [
            "Spray Imidacloprid (0.5ml per litre) on all remaining healthy plants",
            "Hang yellow sticky traps (10–15 per acre)",
            "Install 50-mesh insect-proof net in nursery",
        ],
        "prevention": "Buy TYLCV-resistant varieties (Arka Rakshak, TH-2, Naveen).",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Yellow Sticky Traps", "Reflective Silver Mulch"],
    },
    "Black_Rust": {
        "summary": "Black/Stem Rust of Wheat — Black powdery pustules on stems. One of the most dangerous wheat diseases.",
        "immediate": "Spray fungicide immediately when first pustules appear.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Tebuconazole (1ml per litre) immediately",
            "Repeat after 10–14 days",
            "Harvest as early as possible if infection is severe",
        ],
        "prevention": "Plant rust-resistant wheat varieties (HD-2967, PBW-502).",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb + Carboxin (Vitavax)"],
    },
    "Fusarium_Head_Blight": {
        "summary": "Fusarium Head Blight (Scab) — Wheat/maize heads turn pink/orange at flowering.",
        "immediate": "Do not harvest infected grain for food or animal feed without testing for mycotoxins.",
        "steps": [
            "Spray Tebuconazole (1ml per litre) at early flowering stage",
            "Repeat after 5–7 days if rainy weather continues",
            "Dry grain immediately after harvest to below 14% moisture",
        ],
        "prevention": "Spray protective fungicide at heading stage regardless.",
        "products": ["Tebuconazole (Folicur)", "Metconazole (Caramba)", "Thiophanate Methyl + Mancozeb"],
    },
    "Leaf_Mold": {
        "summary": "Tomato Leaf Mold — Pale yellow patches on top of leaves, olive-green mold underneath.",
        "immediate": "Open all vents and doors to reduce humidity — this is the most important step.",
        "steps": [
            "Spray Chlorothalonil (2g per litre) or Mancozeb (2.5g per litre) on both sides of leaves",
            "Improve ventilation in greenhouse/poly-house",
            "Repeat spray every 7 days for 3–4 applications",
        ],
        "prevention": "Maintain humidity below 85% in greenhouse. Use resistant varieties.",
        "products": ["Chlorothalonil (Kavach)", "Mancozeb (Dithane M-45)", "Copper Oxychloride", "Difenoconazole (Score)"],
    },
    "Smut": {
        "summary": "Wheat/Bajra Smut — Grain heads replaced by black powdery mass. Entire head destroyed.",
        "immediate": "Cut and burn infected heads before the black powder spreads.",
        "steps": [
            "Remove all infected heads immediately and burn in a pit",
            "Do not use seed from this crop next season",
            "For next season: treat seed with Carboxin + Thiram (Vitavax Power, 2g/kg seed)",
        ],
        "prevention": "Always treat seeds before sowing. Use certified disease-free seeds.",
        "products": ["Carboxin + Thiram (Vitavax Power)", "Tebuconazole seed treatment (Raxil)", "Carbendazim (Bavistin)"],
    },
    "Common_Root_Rot": {
        "summary": "Common Root Rot — Roots turn brown/black and rot. Caused by soil fungi.",
        "immediate": "Improve drainage immediately. Avoid all irrigation until soil dries.",
        "steps": [
            "Drench soil with Trichoderma viride solution (10g per litre) around the plant base",
            "Or drench with Carbendazim (1g per litre) if disease is severe",
            "Add well-decomposed FYM to improve soil biological activity",
        ],
        "prevention": "Treat seeds with Trichoderma (4g/kg) before sowing. Improve soil drainage.",
        "products": ["Trichoderma viride (Multiplex)", "Carbendazim (Bavistin)", "Thiophanate Methyl", "Pseudomonas fluorescens"],
    },
    "Blast": {
        "summary": "Wheat Blast — Light brown lesions on wheat ears causing shriveled grains. Can cause 100% yield loss.",
        "immediate": "Report to your local agriculture department immediately — wheat blast is a quarantine disease in India.",
        "steps": [
            "Spray Tricyclazole (0.6g per litre) or Propiconazole (1ml per litre) immediately",
            "Repeat every 7 days",
            "Harvest early if blast is severe",
        ],
        "prevention": "Plant resistant varieties. Apply protective fungicide at booting and heading stages.",
        "products": ["Tricyclazole (Bim)", "Propiconazole (Tilt)", "Azoxystrobin + Propiconazole (Amistar Top)"],
    },
    "Mildew": {
        "summary": "Downy/Powdery Mildew — White or gray fuzzy coating on leaves.",
        "immediate": "Remove and destroy infected plant parts. Improve air circulation.",
        "steps": [
            "Spray Metalaxyl + Mancozeb (Ridomil MZ, 2.5g per litre) for downy mildew",
            "For powdery mildew: spray Sulfur 80WP (2g per litre) or Hexaconazole (1ml per litre)",
            "Repeat every 10 days for 3–4 applications",
        ],
        "prevention": "Use resistant varieties. Maintain proper plant spacing.",
        "products": ["Metalaxyl + Mancozeb (Ridomil Gold MZ)", "Sulfur 80WP (Thiovit)", "Hexaconazole (Contaf)"],
    },
    "Mite": {
        "summary": "Mite Infestation — Tiny spider-like insects causing silvery streaks or bronzing.",
        "immediate": "Spray water forcefully under all leaves. Increase irrigation frequency.",
        "steps": [
            "Spray Abamectin (1ml per litre) or Fenazaquin (1ml per litre) under all leaves",
            "Repeat after 7 days with a DIFFERENT chemical",
        ],
        "prevention": "Avoid water stress. Do not over-use pyrethroids.",
        "products": ["Abamectin (Vertimec)", "Fenazaquin (Magister)", "Spiromesifen (Oberon)", "Hexythiazox (Niseran)"],
    },
    "Septoria": {
        "summary": "Septoria Leaf Blotch of Wheat — Tan/brown blotches reducing grain size significantly.",
        "immediate": "Apply fungicide at first sign of infection — especially at flag leaf stage.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Epoxiconazole (1ml per litre) at flag leaf stage",
            "Repeat after 14 days if rainy weather continues",
        ],
        "prevention": "Use Septoria-tolerant varieties. Apply fungicide preventively during wet spring weather.",
        "products": ["Propiconazole (Tilt)", "Epoxiconazole (Opus)", "Tebuconazole (Folicur)"],
    },
    "Stem_fly": {
        "summary": "Wheat Stem Fly — Maggots bore into wheat stems causing 'dead heart'. Most damage at seedling stage.",
        "immediate": "Pull out and examine affected tillers.",
        "steps": [
            "Spray Chlorpyrifos (2.5ml per litre) or Dimethoate (2ml per litre) on entire crop",
            "Remove and destroy dead heart tillers",
        ],
        "prevention": "Sow wheat early. Use seed treatment with Imidacloprid (5ml/kg seed).",
        "products": ["Chlorpyrifos (Durban)", "Dimethoate (Rogor)", "Imidacloprid seed treatment (Gaucho)"],
    },
    "Tan_spot": {
        "summary": "Tan Spot of Wheat — Tan/light brown oval spots with yellow halo on leaves.",
        "immediate": "Remove infected lower leaves. Scout field for severity.",
        "steps": [
            "Spray Propiconazole (1ml per litre) when spots first appear on lower leaves",
            "Repeat after 14 days in wet weather",
        ],
        "prevention": "Use disease-free certified seed. Bury crop residue. Rotate crops.",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb (Dithane M-45)"],
    },
    "Black_Measles": {
        "summary": "Grape Black Measles (Esca) — Dark streaks inside wood, patches on leaves. A serious vine disease.",
        "immediate": "Prune out all infected wood 20–30 cm below visible symptoms. Seal all pruning wounds.",
        "steps": [
            "Apply wound sealant (Bordeaux paste) on all cut surfaces immediately",
            "Remove and burn all infected prunings",
        ],
        "prevention": "Prune in dry weather. Seal all wounds immediately.",
        "products": ["Bordeaux Paste (wound sealant)", "Thiophanate Methyl", "Trichoderma viride"],
    },
    "Isariopsis_Leaf_Spot": {
        "summary": "Grape Isariopsis Leaf Spot — Dark brown spots on upper leaf surface, gray mold underneath.",
        "immediate": "Remove and destroy all fallen infected leaves from the ground.",
        "steps": [
            "Spray Mancozeb (2.5g per litre) or Copper Oxychloride (3g per litre) on leaves",
            "Improve airflow by pruning — thin out dense canopy",
        ],
        "prevention": "Remove fallen leaves. Improve vineyard ventilation.",
        "products": ["Mancozeb (Dithane M-45)", "Copper Oxychloride (Blitox)", "Zineb (Indofil Z-78)"],
    },
    "Bacterial_spot": {
        "summary": "Bacterial Spot — Dark water-soaked spots on leaves and fruits. Very common in tomato and peach.",
        "immediate": "Remove infected leaves and fruits. Switch to drip irrigation immediately.",
        "steps": [
            "Spray Copper Hydroxide (3g per litre) on all plants",
            "Repeat every 7–10 days for 4–5 applications",
            "Disinfect pruning tools with 10% bleach solution",
        ],
        "prevention": "Use disease-free certified transplants. Avoid overhead irrigation.",
        "products": ["Copper Hydroxide (Kocide 3000)", "Copper Oxychloride + Streptomycin", "Kasugamycin (Kasu-B)"],
    },
    "Leaf_scald": {
        "summary": "Rice Leaf Scald — Long tan/brown streaks from leaf tip inward. Caused by Microdochium fungus.",
        "immediate": "Use certified disease-free seeds. This disease is mostly seed-borne.",
        "steps": [
            "Spray Iprodione (1.5ml per litre) or Propiconazole (1ml per litre) on affected crop",
            "Repeat after 10–12 days",
        ],
        "prevention": "Use certified treated seed. Treat seed with Carbendazim (2g/kg) before sowing.",
        "products": ["Iprodione (Rovral)", "Propiconazole (Tilt)", "Carbendazim (Bavistin)"],
    },
    "canker": {
        "summary": "Bacterial/Fungal Canker — Sunken, dark, dead areas on bark. Gum may ooze from infected area.",
        "immediate": "Prune infected branches 10–15 cm below the diseased area.",
        "steps": [
            "Apply Bordeaux paste on all cut surfaces immediately",
            "Spray Copper Oxychloride (3g per litre) on entire tree",
            "Remove and burn all pruned material",
        ],
        "prevention": "Avoid pruning wounds in wet weather. Seal all wounds with Bordeaux paste.",
        "products": ["Bordeaux Paste", "Copper Oxychloride (Blitox)", "Carbendazim (Bavistin)"],
    },
    "greening": {
        "summary": "Citrus Greening (Huanglongbing/HLB) — Blotchy yellow leaves, lopsided bitter fruits. NO CURE EXISTS.",
        "immediate": "Confirm with your agriculture officer before removing trees.",
        "steps": [
            "Remove and destroy all infected trees — bury or burn them completely",
            "Spray Imidacloprid (0.5ml per litre) on remaining healthy trees",
            "Do not plant new citrus within 100 metres of infected area",
        ],
        "prevention": "Use certified disease-free grafted plants only. Control psyllid insects from day 1.",
        "products": ["Imidacloprid (Confidor/Gaucho)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)"],
    },
    "cercospora_gray_leaf_spot": {
        "summary": "Cercospora Gray Leaf Spot of Maize — Rectangular gray/tan lesions on leaves.",
        "immediate": "Scout field — if more than 50% of plants show symptoms on upper leaves, spray immediately.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Propiconazole (1ml per litre) on entire crop",
            "Timing is critical — spray at tasseling/silking stage",
            "Repeat after 14 days if weather remains humid",
        ],
        "prevention": "Use resistant hybrid varieties. Practice crop rotation.",
        "products": ["Azoxystrobin (Amistar)", "Propiconazole (Tilt)", "Pyraclostrobin (Headline)"],
    },
    "Common_rust": {
        "summary": "Common Rust of Maize — Cinnamon-brown powdery pustules on both sides of leaves.",
        "immediate": "Scout field for severity. Spray immediately if more than 50% leaf area affected.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Azoxystrobin (1ml per litre) if infection is heavy",
            "Repeat after 14 days",
        ],
        "prevention": "Plant rust-resistant hybrid varieties. Avoid late planting.",
        "products": ["Propiconazole (Tilt)", "Azoxystrobin (Amistar)", "Mancozeb (Dithane M-45)"],
    },
    "Northern_Leaf_Blight": {
        "summary": "Northern Leaf Blight (NLB) of Maize — Long gray-green cigar-shaped lesions. Can cause 30–50% yield loss.",
        "immediate": "Apply fungicide at tasseling stage — this is the most important timing.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Propiconazole (1ml per litre) at tasseling stage",
            "Repeat after 14 days",
        ],
        "prevention": "Plant NLB-resistant hybrid varieties. Practice crop rotation.",
        "products": ["Azoxystrobin (Amistar)", "Propiconazole (Tilt)", "Pyraclostrobin (Headline)"],
    },
}

def get_treatment(class_name: str) -> dict:
    name_lower = class_name.lower()
    if "healthy" in name_lower:
        return TREATMENTS["healthy"]
    for key, treatment in TREATMENTS.items():
        if key.lower() == name_lower:
            return treatment
    best_key, best_len = None, 0
    for key in TREATMENTS:
        k = key.lower()
        if k in name_lower and len(k) > best_len:
            best_key, best_len = key, len(k)
    if best_key:
        return TREATMENTS[best_key]
    return {
        "summary":   f"Disease detected: {class_name.replace('_',' ')}. Consult your local Krishi Vigyan Kendra (KVK).",
        "immediate": "Remove infected plant parts and isolate from healthy plants immediately.",
        "steps": [
            "Take a clear photo and visit your nearest KVK or agri shop",
            "Apply Copper Oxychloride (Blitox, 3g per litre) as a safe first step",
            "Avoid overhead irrigation — water at the base of plants only",
            "Remove and destroy all visibly infected leaves and stems",
            "Monitor remaining plants daily for spread",
        ],
        "prevention": "Use certified disease-free seeds next season. Practice crop rotation.",
        "products": ["Copper Oxychloride (Blitox 50)", "Mancozeb (Dithane M-45)", "Neem Oil (Econeem Plus)"],
    }

# ── Lazy loaders ───────────────────────────────────────────────────────────────
def load_crop_models():
    global _crop_model, _crop_encoder
    if _crop_model is None:
        import joblib
        _crop_model   = joblib.load(CROP_MODEL_PATH)
        _crop_encoder = joblib.load(CROP_ENCODER_PATH)

def load_disease_model():
    global _disease_model
    if _disease_model is None:
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        import tensorflow as tf
        _disease_model = tf.keras.models.load_model(DISEASE_MODEL_PATH)

# ── Health check ───────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({
        "status":        "ok",
        "yield_records": len(YIELD_DATA),
        "states":        len(SOIL_DATA),
        "crop_model":    os.path.exists(CROP_MODEL_PATH),
        "disease_model": os.path.exists(DISEASE_MODEL_PATH),
    })

# ══════════════════════════════════════════════════════════════════════════════
#  1. CROP RECOMMENDATION  POST /api/ai/crop-recommend
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/ai/crop-recommend", methods=["POST"])
def crop_recommend():
    try:
        load_crop_models()
        data    = request.get_json(force=True)
        required = ["N","P","K","temperature","humidity","ph","rainfall"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        features = np.array([[
            float(data["N"]), float(data["P"]), float(data["K"]),
            float(data["temperature"]), float(data["humidity"]),
            float(data["ph"]), float(data["rainfall"]),
        ]])
        proba = _crop_model.predict_proba(features)[0]
        top3  = np.argsort(proba)[::-1][:3]
        names = _crop_encoder.classes_

        return jsonify({
            "recommended_crop": names[top3[0]],
            "confidence":       round(float(proba[top3[0]]) * 100, 2),
            "alternatives": [
                {"crop": names[i], "confidence": round(float(proba[i]) * 100, 2)}
                for i in top3[1:]
            ],
            "input_summary": data
        })
    except FileNotFoundError:
        return jsonify({"error": "Crop model not found. Upload model files and set paths correctly."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  2. DISEASE DETECTION  POST /api/ai/disease-detect
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/ai/disease-detect", methods=["POST"])
def disease_detect():
    try:
        load_disease_model()

        if "image" not in request.files:
            return jsonify({"error": "No image file. Use field name 'image'."}), 400

        from PIL import Image

        img_bytes = request.files["image"].read()
        img  = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((128, 128))
        arr  = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        preds       = _disease_model.predict(arr, verbose=0)[0]
        top_idx     = int(np.argmax(preds))
        confidence  = round(float(preds[top_idx]) * 100, 2)

        class_name = DISEASE_CLASSES[top_idx] if top_idx < len(DISEASE_CLASSES) else f"Unknown_Class_{top_idx}"
        parts      = class_name.split("_", 1)
        plant      = parts[0]
        condition  = parts[1].replace("_", " ") if len(parts) > 1 else class_name
        severity   = "High" if confidence > 85 else "Medium" if confidence > 60 else "Low"

        top3_idx = np.argsort(preds)[::-1][:3]
        top3 = [
            {"class": (DISEASE_CLASSES[i] if i < len(DISEASE_CLASSES) else f"Class_{i}").replace("_", " "),
             "confidence": round(float(preds[i]) * 100, 2)}
            for i in top3_idx
        ]

        return jsonify({
            "disease":       condition,
            "plant":         plant,
            "severity":      severity,
            "confidence":    confidence,
            "treatment":     get_treatment(class_name),
            "class_raw":     class_name,
            "model_classes": len(preds),
            "top3":          top3,
        })
    except FileNotFoundError:
        return jsonify({"error": "Disease model not found. Upload model files and set paths correctly."}), 500
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  3. SOIL & YIELD RECOMMENDATION  POST /api/ai/soil-recommend
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/ai/soil-recommend", methods=["POST"])
def soil_recommend():
    try:
        data     = request.get_json(force=True)
        required = ["crop", "season", "state", "area"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        crop_in   = data["crop"].strip()
        season_in = data["season"].strip()
        state_in  = data["state"].strip()
        area      = float(data.get("area", 100))

        matches, all_state_matches = [], []
        for row in YIELD_DATA:
            rc, rs, rt = row.get("crop","").strip().lower(), row.get("season","").strip().lower(), row.get("state","").strip().lower()
            crop_ok  = crop_in.lower() in rc or rc in crop_in.lower()
            state_ok = state_in.lower() == rt
            if state_ok:
                all_state_matches.append(row)
            if crop_ok and state_ok:
                matches.append(row)

        def avg_yield(rows):
            ys = [float(r.get("yield",0)) for r in rows if r.get("yield","")]
            ys = [y for y in ys if y > 0]
            return round(sum(ys[-5:]) / len(ys[-5:]), 4) if ys else None

        predicted_yield = avg_yield(matches)
        source_note = (
            f"Based on {len(matches)} historical records for {crop_in} in {state_in} (last 5 seasons averaged)."
            if predicted_yield else
            f"No direct records for '{crop_in}' in {state_in}. Showing {state_in} state average yield."
        )
        if not predicted_yield:
            predicted_yield = avg_yield(all_state_matches) or 1.5

        soil = SOIL_DATA.get(state_in, {"N":75,"P":35,"K":30,"pH":6.8})
        N, P, K, pH = soil["N"], soil["P"], soil["K"], soil["pH"]

        def status(val, low, high):
            return "Low" if val < low else "High" if val > high else "Adequate"

        n_s, p_s, k_s = status(N,60,120), status(P,20,50), status(K,20,50)
        ph_s = "Acidic" if pH < 6.0 else "Alkaline" if pH > 7.5 else "Optimal"

        crop_lower = crop_in.lower()
        if any(x in crop_lower for x in ["rice","paddy"]):
            base_n, base_p, base_k = 120, 60, 60
            water_need, duration_days = "High (standing water)", 120
            companions = ["Azolla (nitrogen fixer)", "Green manure (Sesbania)"]
            harvest_tips = "Harvest when 80% of grains turn golden. Cut 2cm above water level."
        elif "wheat" in crop_lower:
            base_n, base_p, base_k = 120, 60, 40
            water_need, duration_days = "Moderate (4-5 irrigations)", 120
            companions = ["Mustard (border crop)", "Lentil (rotation)"]
            harvest_tips = "Harvest at golden-yellow stage. Moisture should be below 14%."
        elif any(x in crop_lower for x in ["maize","corn"]):
            base_n, base_p, base_k = 150, 75, 40
            water_need, duration_days = "Moderate-High (6-7 irrigations)", 90
            companions = ["Beans (nitrogen fixer)", "Pumpkin (ground cover)"]
            harvest_tips = "Harvest when husks are dry and kernels dent. Test with thumbnail."
        elif "cotton" in crop_lower:
            base_n, base_p, base_k = 100, 50, 50
            water_need, duration_days = "Moderate (8-10 irrigations)", 180
            companions = ["Cowpea (nitrogen)", "Sorghum (border)"]
            harvest_tips = "Pick bolls as they open. Avoid picking during dew or rain."
        elif "sugarcane" in crop_lower:
            base_n, base_p, base_k = 250, 60, 120
            water_need, duration_days = "Very High (fortnightly)", 365
            companions = ["Potato (intercrop early)", "Onion (intercrop)"]
            harvest_tips = "Harvest at 10-12 months. Brix reading should be 18-20%."
        elif "potato" in crop_lower:
            base_n, base_p, base_k = 180, 90, 120
            water_need, duration_days = "Moderate (8-10 irrigations)", 90
            companions = ["Beans", "Horseradish (pest repellent)"]
            harvest_tips = "Harvest when vines die back. Cure for 1-2 weeks before storage."
        elif "tomato" in crop_lower:
            base_n, base_p, base_k = 100, 60, 100
            water_need, duration_days = "High (drip preferred)", 120
            companions = ["Basil (pest repellent)", "Marigold (nematode control)"]
            harvest_tips = "Harvest when fully colored. Pick every 2-3 days for continued production."
        elif any(x in crop_lower for x in ["soya","soybean"]):
            base_n, base_p, base_k = 30, 60, 40
            water_need, duration_days = "Moderate (5-6 irrigations)", 100
            companions = ["Maize (3:1 intercrop)", "Sorghum"]
            harvest_tips = "Harvest when pods rattle and leaves turn yellow. Moisture < 13%."
        elif any(x in crop_lower for x in ["groundnut","peanut"]):
            base_n, base_p, base_k = 25, 50, 50
            water_need, duration_days = "Moderate (6-8 irrigations)", 120
            companions = ["Pearl millet (border)", "Castor (trap crop)"]
            harvest_tips = "Harvest when inner pod walls show dark veins."
        elif "onion" in crop_lower:
            base_n, base_p, base_k = 100, 50, 60
            water_need, duration_days = "Moderate (10-12 irrigations)", 150
            companions = ["Carrot", "Chamomile"]
            harvest_tips = "Harvest when tops fall over naturally. Cure in dry shade for 2-3 weeks."
        else:
            base_n, base_p, base_k = 80, 40, 40
            water_need, duration_days = "Moderate", 90
            companions = ["Legumes (nitrogen fixers)"]
            harvest_tips = "Monitor crop maturity indicators. Harvest at optimal moisture content."

        rec_n = max(0, base_n - (N - 80)) if n_s == "High" else base_n + 20 if n_s == "Low" else base_n
        rec_p = max(0, base_p - 10)       if p_s == "High" else base_p + 15 if p_s == "Low" else base_p
        rec_k = max(0, base_k - 10)       if k_s == "High" else base_k + 15 if k_s == "Low" else base_k

        urea_kg = round(rec_n / 0.46)
        dap_kg  = round(rec_p / 0.46)
        mop_kg  = round(rec_k / 0.60)

        if duration_days <= 100:
            schedule = [
                {"time": "At sowing (Day 0)",     "application": f"Apply full DAP ({dap_kg} kg/ha) + full MOP ({mop_kg} kg/ha) + 1/3 Urea ({urea_kg//3} kg/ha)."},
                {"time": "30 days after sowing",  "application": f"Top dress 1/3 Urea ({urea_kg//3} kg/ha). Apply zinc sulfate 25 kg/ha if deficient."},
                {"time": "55 days after sowing",  "application": f"Top dress remaining 1/3 Urea ({urea_kg//3} kg/ha). Foliar spray micronutrients if yellowing observed."},
            ]
        else:
            schedule = [
                {"time": "At sowing / planting (Day 0)", "application": f"Basal: Full DAP ({dap_kg} kg/ha) + Full MOP ({mop_kg} kg/ha) + 1/4 Urea ({urea_kg//4} kg/ha)."},
                {"time": "30 days after sowing",         "application": f"Top dress 1/4 Urea ({urea_kg//4} kg/ha). Apply micronutrients (Zinc sulfate 25 kg/ha)."},
                {"time": "60 days after sowing",         "application": f"Top dress 1/4 Urea ({urea_kg//4} kg/ha). Apply additional MOP (20 kg/ha) if yellowing observed."},
                {"time": "90 days after sowing",         "application": f"Top dress remaining 1/4 Urea ({urea_kg//4} kg/ha). Foliar boron spray (0.2%) if required."},
            ]

        ph_correction = ""
        if ph_s == "Acidic":
            lime_t = round(max(1, (6.5 - pH) * 2), 1)
            ph_correction = f"Apply {lime_t} tonnes/ha agricultural lime (CaCO₃) 2 weeks before sowing to raise pH from {pH} to ~6.5."
        elif ph_s == "Alkaline":
            gyp_kg = round(max(200, (pH - 7.0) * 500))
            ph_correction = f"Apply {gyp_kg} kg/ha gypsum (CaSO₄) + elemental sulfur 50 kg/ha to reduce pH from {pH} toward 7.0."

        if predicted_yield < 1.0:
            advice, yield_category = "⚠️ Low yield expected. Priority: apply farmyard manure 10 t/ha. Test for micronutrient deficiencies.", "Low"
        elif predicted_yield < 2.5:
            advice, yield_category = "📈 Moderate yield expected. Improve with timely irrigation and certified seeds.", "Moderate"
        elif predicted_yield < 6.0:
            advice, yield_category = "✅ Good yield expected. Maintain agronomic best practices. Scout weekly for pests.", "Good"
        else:
            advice, yield_category = "🌟 Excellent yield potential. Focus on post-harvest management — proper drying, storage, and market timing.", "Excellent"

        total_fert_cost = round(urea_kg * area * 6 + dap_kg * area * 27 + mop_kg * area * 17)

        return jsonify({
            "predicted_yield":   predicted_yield,
            "yield_category":    yield_category,
            "unit":              "tonnes/hectare",
            "total_production":  round(predicted_yield * area, 2),
            "source_note":       source_note,
            "soil_profile": {"N":N,"P":P,"K":K,"pH":pH,"N_status":n_s,"P_status":p_s,"K_status":k_s,"pH_status":ph_s},
            "fertilizer_recommendation": {
                "Urea_kg_per_ha": urea_kg, "DAP_kg_per_ha": dap_kg, "MOP_kg_per_ha": mop_kg,
                "N_kg_per_ha": round(rec_n), "P_kg_per_ha": round(rec_p), "K_kg_per_ha": round(rec_k),
                "estimated_cost": f"₹{total_fert_cost:,} for {area} ha",
                "ph_correction":  ph_correction,
            },
            "application_schedule": schedule,
            "crop_info": {"duration_days": duration_days, "water_need": water_need, "companion_crops": companions, "harvest_tips": harvest_tips},
            "advice": advice,
            "input": {"crop": crop_in, "season": season_in, "state": state_in, "area": area},
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting Shramic AI Service on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)