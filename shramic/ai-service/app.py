"""
Shramic Agri Tech Platform — AI Service (Flask)
Fixed version:
  - Soil recommendation now uses CSV data directly (bypasses broken pickle)
  - Crop recommendation loads your .pkl model
  - Disease detection loads your .h5 model
  - All models loaded lazily on first request
"""

import os, io, csv, warnings
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

warnings.filterwarnings("ignore")  # suppress sklearn version warnings

app = Flask(__name__)
CORS(app)

# ── Model / data paths ─────────────────────────────────────────────────────────
# Paths from your actual folder structure
CROP_MODEL_PATH    = r"C:\Users\HP\Downloads\shramic-agri-tech-platform (1)\shramic\ai-service\crop_recommendation\model.pkl"
CROP_ENCODER_PATH  = r"C:\Users\HP\Downloads\shramic-agri-tech-platform (1)\shramic\ai-service\crop_recommendation\label_encoder.pkl"
DISEASE_MODEL_PATH = r"C:\Users\HP\Downloads\shramic-agri-tech-platform (1)\shramic\ai-service\plant_disease\models\best_plant_disease_model.h5"

# CSV-based soil data (bundled in this folder — no pickle needed)
SCRIPT_DIR        = os.path.dirname(os.path.abspath(__file__))
YIELD_CSV         = os.path.join(SCRIPT_DIR, "crop_yield.csv")
SOIL_CSV          = os.path.join(SCRIPT_DIR, "state_soil_data.csv")

# ── Lazy model holders ─────────────────────────────────────────────────────────
_crop_model    = None
_crop_encoder  = None
_disease_model = None

# ── Pre-load CSV data at startup (fast, no version issues) ─────────────────────
YIELD_DATA = []   # list of dicts from crop_yield.csv
SOIL_DATA  = {}   # state -> {N, P, K, pH}

def _load_csv_data():
    global YIELD_DATA, SOIL_DATA
    # Yield data
    if os.path.exists(YIELD_CSV):
        with open(YIELD_CSV, newline="", encoding="utf-8-sig") as f:
            YIELD_DATA = [
                {k: v.strip() for k, v in row.items()}
                for row in csv.DictReader(f)
            ]
    # Soil / N-P-K by state
    if os.path.exists(SOIL_CSV):
        with open(SOIL_CSV, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                SOIL_DATA[row["state"].strip()] = {
                    "N": float(row.get("N", 75)),
                    "P": float(row.get("P", 35)),
                    "K": float(row.get("K", 30)),
                    "pH": float(row.get("pH", 6.8)),
                }

_load_csv_data()
print(f"✅ Loaded {len(YIELD_DATA)} yield records, {len(SOIL_DATA)} states")

# ── Disease classes (67 from your training data) ────────────────────────────────
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
        "summary": "Late Blight — Water-soaked gray patches on leaves that turn brown fast. White mold visible under leaves. VERY destructive — can destroy entire crop in days.",
        "immediate": "URGENT: Stop all irrigation immediately. Remove and burn infected plants. Alert neighboring farmers.",
        "steps": [
            "Spray Metalaxyl + Mancozeb (Ridomil Gold, 2.5g per litre) IMMEDIATELY on entire field",
            "Repeat every 5–7 days — this is critical",
            "If disease is severe, harvest remaining healthy crop early to save it",
            "Remove all infected plant debris from field and burn",
            "Do not allow water runoff from infected field to other fields",
            "Drain all standing water — the fungus spreads fast in wet conditions",
        ],
        "prevention": "Never plant susceptible varieties in rainy season without protective spraying. Use resistant varieties (e.g., Kufri Jyoti for potato).",
        "products": ["Metalaxyl + Mancozeb (Ridomil Gold MZ)", "Cymoxanil + Mancozeb (Curzate M)", "Dimethomorph (Acrobat)"],
    },
    "Leaf_Blast": {
        "summary": "Rice Leaf Blast — Diamond-shaped gray spots with brown border on rice leaves. Can cause 70–80% yield loss if not controlled.",
        "immediate": "Stop applying nitrogen fertilizer immediately — it makes blast worse. Spray fungicide within 24 hours.",
        "steps": [
            "Spray Tricyclazole (0.6g per litre) or Isoprothiolane (1.5ml per litre) immediately",
            "Repeat spraying after 10 days",
            "Maintain thin layer of water in field (2–3 cm) — helps reduce blast severity",
            "Avoid applying urea at this stage",
            "Scout field daily — blast spreads very fast in cool, humid nights",
        ],
        "prevention": "Use blast-resistant varieties (IR-64, Pusa Basmati 1121). Balanced fertilization — do not over-apply nitrogen.",
        "products": ["Tricyclazole (Bim)", "Isoprothiolane (Fuji-One)", "Propiconazole (Tilt)", "Azoxystrobin (Amistar)"],
    },
    "Brown_Spot": {
        "summary": "Brown Spot — Oval brown spots on rice/crop leaves. Caused by nutrient deficiency + fungus. Common in poor soils.",
        "immediate": "Apply potassium fertilizer (MOP, 15 kg/acre) immediately — deficiency makes this disease worse.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Mancozeb (2.5g per litre) on all leaves",
            "Apply potassium fertilizer to the field — brown spot is worse in potassium-deficient soil",
            "Repeat fungicide spray after 10–12 days",
            "Ensure proper water management — avoid water stress",
        ],
        "prevention": "Improve soil fertility before planting. Apply balanced NPK. Use certified seeds treated with Thiram (2g/kg).",
        "products": ["Propiconazole (Tilt)", "Mancozeb (Dithane M-45)", "Iprodione (Rovral)"],
    },
    "Bacterial_Leaf_Blight": {
        "summary": "Bacterial Leaf Blight (BLB) — Yellowing from leaf tip/edges inward. Water-soaked margins that turn yellow then white. Major rice disease.",
        "immediate": "Drain field water immediately. Stop nitrogen fertilizer.",
        "steps": [
            "Spray Copper Hydroxide (3g per litre) on entire crop",
            "Or spray Streptomycin Sulfate (1g per 10 litres water) + Copper Oxychloride (3g per litre)",
            "Repeat every 10 days for 2–3 applications",
            "Drain standing water from field — BLB spreads through flood water",
            "Do not enter field when wet — avoid spreading bacteria on boots/tools",
        ],
        "prevention": "Use BLB-resistant varieties (IR-64, Swarna Sub-1). Avoid excess nitrogen. Use certified disease-free seeds.",
        "products": ["Copper Hydroxide (Kocide)", "Streptomycin + Copper (Blitox + Plantomycin)", "Bismerthiazol"],
    },
    "Sheath_Blight": {
        "summary": "Sheath Blight — Oval greenish-gray patches on leaf sheaths near water level. Caused by a soil fungus. Spreads fast in dense crops.",
        "immediate": "Reduce plant density — thin out crowded areas. Drain excess water.",
        "steps": [
            "Spray Validamycin (2.5ml per litre) or Hexaconazole (1ml per litre) at the base of plants",
            "Start spraying when disease first appears at tillering stage",
            "Repeat every 10 days for 2–3 sprays",
            "Reduce nitrogen dose if crop is too lush/green",
            "Maintain 3–5 cm shallow water — avoid deep flooding which spreads the fungus",
        ],
        "prevention": "Reduce seed rate — avoid dense planting. Balanced NPK — reduce nitrogen. Remove infected stubble after harvest.",
        "products": ["Validamycin (Sheathmar)", "Hexaconazole (Contaf)", "Propiconazole (Tilt)", "Tricyclazole"],
    },
    "Mosaic_Virus": {
        "summary": "Mosaic Virus — Yellow-green mottled pattern on leaves. Plant stunted. Spread by aphids and thrips. Cannot be cured.",
        "immediate": "Remove and destroy all infected plants to prevent spread to healthy ones.",
        "steps": [
            "Kill aphids/thrips that spread the virus: spray Imidacloprid (0.5ml per litre) or Dimethoate (2ml per litre)",
            "Remove infected plants with roots — bag them in plastic before carrying out of field",
            "Use yellow sticky traps (10 per acre) to monitor and trap insects",
            "Spray neem oil (5ml per litre) every week as a repellent on healthy plants",
            "Do not touch healthy plants after handling infected ones",
        ],
        "prevention": "Use virus-free certified planting material. Control insects from day 1 of planting. Grow border crops (maize/sorghum) to block insects.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)", "Yellow Sticky Traps"],
    },
    "Spider_mites": {
        "summary": "Spider Mites — Tiny red/yellow insects (barely visible). Cause yellow stippling on leaves. Fine webs under leaves. Thrive in hot, dry weather.",
        "immediate": "Spray water forcefully under the leaves to knock off mites. Do this in the morning.",
        "steps": [
            "Spray Abamectin (1ml per litre) or Spiromesifen (1ml per litre) under the leaves — mites hide there",
            "Make sure to wet the underside of every leaf — that is where they live",
            "Repeat after 7 days with a different chemical (mites develop resistance quickly)",
            "Increase humidity around plants by watering the ground — mites hate humidity",
            "Remove heavily infested leaves and destroy",
        ],
        "prevention": "Avoid water stress. Keep the field free of dust. Avoid over-use of chemical pesticides that kill natural predators of mites.",
        "products": ["Abamectin (Vertimec)", "Spiromesifen (Oberon)", "Dicofol (Kelthane)", "Fenazaquin (Magister)"],
    },
    "Aphid": {
        "summary": "Aphid Infestation — Small green/black insects clustering on young shoots and underside of leaves. Cause leaf curling and yellowing. Spread viruses.",
        "immediate": "Spray a strong jet of water on affected parts to dislodge aphids. Do this 2–3 days in a row.",
        "steps": [
            "Spray Imidacloprid (0.5ml per litre) or Thiamethoxam (0.2g per litre) on entire plant",
            "Focus spray on growing tips and underside of leaves where aphids cluster",
            "Repeat after 10–12 days if aphids return",
            "Mix neem oil (5ml per litre) + soap solution (2ml per litre) for organic control",
            "Release ladybird beetles (natural predators) if available in your area",
        ],
        "prevention": "Avoid excess nitrogen fertilizer — makes plants attractive to aphids. Plant marigolds as border crop to repel aphids.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)", "Neem Oil (Econeem)"],
    },
    "Rust": {
        "summary": "Rust Disease — Orange/brown powdery pustules on leaves. Spreads rapidly through wind. Can cause 30–50% yield loss.",
        "immediate": "Remove and burn infected leaves. Do not leave them in the field.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Tebuconazole (1ml per litre) immediately",
            "Cover all leaf surfaces — top and bottom",
            "Repeat every 10–14 days for 3 applications",
            "Spray in calm weather (no wind) to prevent spread during spraying",
            "Avoid excessive nitrogen fertilizer — makes disease worse",
        ],
        "prevention": "Plant rust-resistant varieties. Apply protective fungicide at flag leaf stage in wheat. Practice crop rotation.",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb (Dithane M-45)", "Hexaconazole"],
    },
    "Leaf_scorch": {
        "summary": "Leaf Scorch — Edges and tips of leaves turn brown and dry. Can be caused by fungus, drought stress, or salt buildup in soil.",
        "immediate": "Water the plants deeply but less frequently. Check if soil is too salty or dry.",
        "steps": [
            "Spray Copper Fungicide (3g per litre) if caused by fungus (Diplocarpon)",
            "Irrigate properly — avoid letting soil dry out completely between watering",
            "If salt buildup — flood-irrigate once to flush salts below root zone",
            "Remove badly scorched leaves to reduce stress on plant",
            "Apply mulch around plants to retain soil moisture",
        ],
        "prevention": "Avoid planting in very salty soils. Ensure consistent irrigation. Apply gypsum to reduce soil salt levels.",
        "products": ["Copper Oxychloride (Blitox)", "Mancozeb (Dithane M-45)", "Propiconazole (Tilt)"],
    },
    "RedRot": {
        "summary": "Red Rot of Sugarcane — Internal red coloring with white patches inside the stalk. Leaves dry from top down. One of the most serious sugarcane diseases.",
        "immediate": "Remove and burn all infected stools (clumps) including roots. Do not use infected cane as seed material.",
        "steps": [
            "Drench soil with Carbendazim (1g per litre) around remaining healthy plants",
            "Treat seed setts in hot water at 50°C for 2 hours before planting to kill the fungus",
            "Remove and burn all infected crop debris after harvest",
            "Do not plant sugarcane in the same field for at least 2 years",
            "Improve field drainage — red rot is worse in waterlogged conditions",
        ],
        "prevention": "Use resistant varieties (Co-0238, CoJ-64). Always use healthy certified seed setts. Treat setts with Carbendazim before planting.",
        "products": ["Carbendazim (Bavistin)", "Thiophanate Methyl", "Trichoderma viride (biocontrol)"],
    },
    "Septoria_leaf_spot": {
        "summary": "Septoria Leaf Spot — Small brown spots with yellow halos on leaves. Starts on lower leaves and moves upward. Very common in tomato and wheat.",
        "immediate": "Remove all infected lower leaves and destroy them. Do not leave them on soil.",
        "steps": [
            "Spray Chlorothalonil (2g per litre) or Mancozeb (2.5g per litre) on entire plant",
            "Begin spraying from the bottom and cover all leaf surfaces",
            "Repeat every 7–10 days for 4–5 sprays during the growing season",
            "Water at the base of plants — avoid wetting leaves",
            "Stake plants (tomato) to improve air circulation",
        ],
        "prevention": "Use certified disease-free seeds. Rotate crops — do not grow tomato in same spot for 2 years. Remove crop debris after harvest.",
        "products": ["Chlorothalonil (Kavach)", "Mancozeb (Dithane M-45)", "Azoxystrobin (Amistar)", "Copper Oxychloride"],
    },
    "Target_Spot": {
        "summary": "Target Spot — Brown circular spots with rings (like a target/bullseye) on leaves. Caused by Corynespora fungus in humid conditions.",
        "immediate": "Remove heavily spotted leaves. Improve air circulation by pruning.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Difenoconazole (1ml per litre) on infected plants",
            "Repeat every 10 days for 3 applications",
            "Reduce humidity around plants by improving spacing and ventilation",
            "Avoid overhead irrigation — water at the base",
            "Destroy all crop debris after harvest to remove fungus source",
        ],
        "prevention": "Maintain proper plant spacing. Use drip irrigation. Apply preventive fungicide during humid weather.",
        "products": ["Azoxystrobin (Amistar)", "Difenoconazole (Score)", "Chlorothalonil (Kavach)"],
    },
    "YellowLeaf_Curl_Virus": {
        "summary": "Tomato Yellow Leaf Curl Virus (TYLCV) — Leaves curl upward, turn yellow. Plant is stunted. Spread by whiteflies. No cure — prevention and removal is the only option.",
        "immediate": "Remove and destroy all infected plants immediately. Every infected plant left behind spreads the virus.",
        "steps": [
            "Spray Imidacloprid (0.5ml per litre) on all remaining healthy plants to kill whiteflies",
            "Hang yellow sticky traps (10–15 per acre) between plants",
            "Install 50-mesh insect-proof net in nursery — most infection happens at seedling stage",
            "Spray neem oil (5ml per litre) every week on healthy plants",
            "Plant border crops of maize (2–3 rows) around the tomato field to block whitefly entry",
        ],
        "prevention": "Buy TYLCV-resistant varieties (Arka Rakshak, TH-2, Naveen). Avoid planting near infected fields or during peak whitefly season.",
        "products": ["Imidacloprid (Confidor)", "Thiamethoxam (Actara)", "Yellow Sticky Traps", "Reflective Silver Mulch"],
    },
    "Black_Rust": {
        "summary": "Black/Stem Rust of Wheat — Black powdery pustules on stems and leaves. One of the most dangerous wheat diseases — can destroy entire crop.",
        "immediate": "Spray fungicide immediately when first pustules appear. This disease spreads very fast.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Tebuconazole (1ml per litre) immediately",
            "Cover all plant surfaces — stems and leaves both",
            "Repeat after 10–14 days",
            "Harvest as early as possible if infection is severe — to save whatever grain remains",
            "Alert your Krishi Vigyan Kendra (KVK) — black rust epidemics affect entire regions",
        ],
        "prevention": "Plant rust-resistant wheat varieties (HD-2967, PBW-502). Apply protective fungicide at flag leaf stage.",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb + Carboxin (Vitavax)"],
    },
    "Fusarium_Head_Blight": {
        "summary": "Fusarium Head Blight (Scab) — Wheat/maize heads turn pink/orange at flowering. Grains shrivel and produce harmful mycotoxins. Do not feed infected grain to animals.",
        "immediate": "Do not harvest infected grain for food or animal feed without testing for mycotoxins.",
        "steps": [
            "Spray Tebuconazole (1ml per litre) at early flowering stage (50% heading) — this is the critical window",
            "Repeat after 5–7 days if rainy weather continues",
            "Harvest promptly when grain is ripe — do not leave in field",
            "Dry grain immediately after harvest to below 14% moisture",
            "Separate infected grain from healthy grain during threshing",
        ],
        "prevention": "Spray protective fungicide at heading stage regardless. Plant resistant varieties. Avoid planting after maize in same field.",
        "products": ["Tebuconazole (Folicur)", "Metconazole (Caramba)", "Thiophanate Methyl + Mancozeb"],
    },
    "Leaf_Mold": {
        "summary": "Tomato Leaf Mold — Pale yellow patches on top of leaves, olive-green/brown mold underneath. Common in humid greenhouses and poly-houses.",
        "immediate": "Open all vents and doors to reduce humidity — this is the most important step.",
        "steps": [
            "Spray Chlorothalonil (2g per litre) or Mancozeb (2.5g per litre) on both sides of leaves",
            "Improve ventilation in greenhouse/poly-house — install exhaust fans if possible",
            "Reduce irrigation frequency — leaf mold thrives in high humidity",
            "Remove and destroy heavily infected leaves",
            "Repeat spray every 7 days for 3–4 applications",
        ],
        "prevention": "Maintain humidity below 85% in greenhouse. Use resistant varieties (Arka Vikas). Allow good spacing between plants.",
        "products": ["Chlorothalonil (Kavach)", "Mancozeb (Dithane M-45)", "Copper Oxychloride", "Difenoconazole (Score)"],
    },
    "Smut": {
        "summary": "Wheat/Bajra Smut — Grain heads replaced by black powdery mass (fungal spores). Entire head destroyed. Seed-borne disease.",
        "immediate": "Cut and burn infected heads before the black powder spreads — do not thresh infected crop normally.",
        "steps": [
            "Remove all infected heads immediately and burn them in a pit away from the field",
            "Do not use seed from this crop next season",
            "For next season: treat seed with Carboxin + Thiram (Vitavax Power, 2g/kg seed) before sowing",
            "For loose smut of wheat: dip seed in hot water at 52°C for 10 minutes, then dry in shade",
        ],
        "prevention": "Always treat seeds before sowing. Use certified disease-free seeds. Avoid saving seed from infected crops.",
        "products": ["Carboxin + Thiram (Vitavax Power)", "Tebuconazole seed treatment (Raxil)", "Carbendazim (Bavistin)"],
    },
    "Common_Root_Rot": {
        "summary": "Common Root Rot — Roots turn brown/black and rot. Plant wilts and dies. Caused by soil fungi, worsened by waterlogging.",
        "immediate": "Improve drainage immediately. Avoid all irrigation until soil dries somewhat.",
        "steps": [
            "Drench soil with Trichoderma viride solution (10g per litre) around the plant base",
            "Or drench with Carbendazim (1g per litre) if disease is severe",
            "Remove badly infected plants to stop spread",
            "Add well-decomposed FYM (farmyard manure) to improve soil biological activity",
            "Avoid waterlogging — improve field drainage channels",
        ],
        "prevention": "Treat seeds with Trichoderma (4g/kg) before sowing. Improve soil drainage. Avoid planting in heavy clay soils without drainage.",
        "products": ["Trichoderma viride (Multiplex)", "Carbendazim (Bavistin)", "Thiophanate Methyl", "Pseudomonas fluorescens"],
    },
    "Blast": {
        "summary": "Wheat Blast — Light brown lesions on wheat ears causing shriveled, unfilled grains. Spreads fast in warm, humid weather. Can cause 100% yield loss.",
        "immediate": "Report to your local agriculture department immediately — wheat blast is a quarantine disease in India.",
        "steps": [
            "Spray Tricyclazole (0.6g per litre) or Propiconazole (1ml per litre) immediately",
            "Repeat every 7 days — continue as long as humid weather persists",
            "Harvest early if blast is severe — to save remaining grain",
            "Do not save seed from infected crop",
            "After harvest, burn or bury all crop residue — do not leave in field",
        ],
        "prevention": "Plant resistant varieties. Apply protective fungicide at booting and heading stages. Avoid late planting.",
        "products": ["Tricyclazole (Bim)", "Propiconazole (Tilt)", "Azoxystrobin + Propiconazole (Amistar Top)"],
    },
    "Mildew": {
        "summary": "Downy/Powdery Mildew — White or gray fuzzy coating on leaves. Stunts plant growth and reduces grain quality.",
        "immediate": "Remove and destroy infected plant parts. Improve air circulation.",
        "steps": [
            "Spray Metalaxyl + Mancozeb (Ridomil MZ, 2.5g per litre) for downy mildew",
            "For powdery mildew: spray Sulfur 80WP (2g per litre) or Hexaconazole (1ml per litre)",
            "Spray in cool morning hours — avoid spraying in rain or strong sun",
            "Repeat every 10 days for 3–4 applications",
            "Reduce plant density to improve airflow",
        ],
        "prevention": "Use resistant varieties. Maintain proper plant spacing. Avoid excess nitrogen fertilizer.",
        "products": ["Metalaxyl + Mancozeb (Ridomil Gold MZ)", "Sulfur 80WP (Thiovit)", "Hexaconazole (Contaf)", "Dimethomorph"],
    },
    "Mite": {
        "summary": "Mite Infestation — Tiny spider-like insects on underside of leaves. Cause silvery streaks or bronzing. Worst in hot, dry weather.",
        "immediate": "Spray water forcefully under all leaves to dislodge mites. Increase irrigation frequency.",
        "steps": [
            "Spray Abamectin (1ml per litre) or Fenazaquin (1ml per litre) under all leaves — mites live there",
            "Spray in the evening when temperature is lower — mites are more exposed",
            "Repeat after 7 days with a DIFFERENT chemical (never repeat same chemical — mites resist quickly)",
            "Increase humidity around plants by watering the ground between rows",
            "Remove dusty conditions — dust on plants attracts and protects mites",
        ],
        "prevention": "Avoid water stress. Do not over-use pyrethroids which kill natural mite predators. Keep field paths watered to reduce dust.",
        "products": ["Abamectin (Vertimec)", "Fenazaquin (Magister)", "Spiromesifen (Oberon)", "Hexythiazox (Niseran)"],
    },
    "Septoria": {
        "summary": "Septoria Leaf Blotch of Wheat — Tan/brown blotches with yellow margins on wheat leaves. Reduces grain size significantly.",
        "immediate": "Apply fungicide at first sign of infection — especially at flag leaf stage.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Epoxiconazole (1ml per litre) at flag leaf stage",
            "This is the most critical timing — protect the flag leaf and ear",
            "Repeat after 14 days if rainy weather continues",
            "Scout field regularly — Septoria spreads fast in wet, cool weather",
        ],
        "prevention": "Use Septoria-tolerant varieties. Apply fungicide preventively during wet spring weather. Practice crop rotation.",
        "products": ["Propiconazole (Tilt)", "Epoxiconazole (Opus)", "Tebuconazole (Folicur)", "Azoxystrobin + Propiconazole (Amistar Top)"],
    },
    "Stem_fly": {
        "summary": "Wheat Stem Fly — Maggots of a fly bore into wheat stems causing 'dead heart' (central shoot dies). Most damage at seedling stage.",
        "immediate": "Pull out and examine affected tillers — you will see a small maggot inside the dead tiller.",
        "steps": [
            "Spray Chlorpyrifos (2.5ml per litre) or Dimethoate (2ml per litre) on entire crop",
            "Early sowing (October–November) avoids peak fly season — most important prevention",
            "Remove and destroy dead heart tillers to reduce fly population",
            "Repeat spray if new damage appears after 10 days",
        ],
        "prevention": "Sow wheat early. Avoid late planting. Use seed treatment with Imidacloprid (5ml/kg seed) to protect seedlings.",
        "products": ["Chlorpyrifos (Durban)", "Dimethoate (Rogor)", "Imidacloprid seed treatment (Gaucho)", "Lambda-cyhalothrin"],
    },
    "Tan_spot": {
        "summary": "Tan Spot of Wheat — Tan/light brown oval spots with yellow halo on leaves. Reduces photosynthesis and grain filling.",
        "immediate": "Remove infected lower leaves. Scout field for severity before deciding on spray.",
        "steps": [
            "Spray Propiconazole (1ml per litre) when spots first appear on lower leaves",
            "Critical timing is flag leaf and ear emergence — protect these stages",
            "Repeat after 14 days in wet weather",
            "Use certified disease-free seed next season",
            "Plow under crop residue after harvest — fungus survives on stubble",
        ],
        "prevention": "Use disease-free certified seed. Bury crop residue. Rotate crops. Apply fungicide at flag leaf stage.",
        "products": ["Propiconazole (Tilt)", "Tebuconazole (Folicur)", "Mancozeb (Dithane M-45)"],
    },
    "Black_Measles": {
        "summary": "Grape Black Measles (Esca) — Dark streaks inside wood, red/yellow patches on leaves, dark spots on berries. A serious vine disease.",
        "immediate": "Prune out all infected wood 20–30 cm below visible symptoms. Seal all pruning wounds immediately.",
        "steps": [
            "Apply wound sealant (Bordeaux paste or pruning paint) on all cut surfaces immediately after pruning",
            "Spray Potassium Silicate (2g per litre) on leaves to strengthen plant",
            "Remove and burn all infected prunings — do not leave in vineyard",
            "Avoid pruning in wet weather — wounds get infected easily",
            "Drench soil with Trichoderma to improve root health",
        ],
        "prevention": "Prune in dry weather. Seal all wounds immediately. Avoid water stress. Use disease-free planting material.",
        "products": ["Bordeaux Paste (wound sealant)", "Thiophanate Methyl", "Trichoderma viride", "Potassium Silicate"],
    },
    "Isariopsis_Leaf_Spot": {
        "summary": "Grape Isariopsis Leaf Spot — Dark brown spots on upper leaf surface, gray mold underneath. Causes early leaf drop and weakens vines.",
        "immediate": "Remove and destroy all fallen infected leaves from the ground.",
        "steps": [
            "Spray Mancozeb (2.5g per litre) or Copper Oxychloride (3g per litre) on leaves",
            "Cover both upper and lower leaf surfaces",
            "Begin spraying after flowering — repeat every 10–14 days",
            "Improve airflow by pruning — thin out dense canopy",
        ],
        "prevention": "Remove fallen leaves. Improve vineyard ventilation. Apply protective spray before monsoon season.",
        "products": ["Mancozeb (Dithane M-45)", "Copper Oxychloride (Blitox)", "Zineb (Indofil Z-78)"],
    },
    "Bacterial_spot": {
        "summary": "Bacterial Spot — Dark water-soaked spots on leaves and fruits. Fruits get rough, cracked, sunken spots. Very common in tomato and peach.",
        "immediate": "Remove infected leaves and fruits. Switch to drip irrigation immediately.",
        "steps": [
            "Spray Copper Hydroxide (3g per litre) on all plants",
            "Repeat every 7–10 days for 4–5 applications",
            "Never work in the field when plants are wet — bacteria spread on hands and tools",
            "Disinfect pruning tools with 10% bleach solution between plants",
            "Avoid nitrogen fertilizer in excess — makes disease worse",
        ],
        "prevention": "Use disease-free certified transplants. Avoid overhead irrigation. Use copper-based protective spray preventively in rainy season.",
        "products": ["Copper Hydroxide (Kocide 3000)", "Copper Oxychloride + Streptomycin", "Kasugamycin (Kasu-B)"],
    },
    "Leaf_scald": {
        "summary": "Rice Leaf Scald — Long tan/brown streaks from leaf tip inward, with wavy margins. Caused by Microdochium fungus.",
        "immediate": "Use certified disease-free seeds. This disease is mostly seed-borne.",
        "steps": [
            "Spray Iprodione (1.5ml per litre) or Propiconazole (1ml per litre) on affected crop",
            "Repeat after 10–12 days",
            "Ensure balanced nutrition — avoid excess nitrogen",
            "Maintain proper water management — avoid both waterlogging and drought stress",
        ],
        "prevention": "Use certified treated seed. Treat seed with Carbendazim (2g/kg) before sowing. Plant resistant varieties.",
        "products": ["Iprodione (Rovral)", "Propiconazole (Tilt)", "Carbendazim (Bavistin)", "Mancozeb (Dithane M-45)"],
    },
    "canker": {
        "summary": "Bacterial/Fungal Canker — Sunken, dark, dead areas on bark of stems and branches. Gum may ooze from infected area.",
        "immediate": "Prune infected branches 10–15 cm below the diseased area. Sterilize pruning tools before each cut.",
        "steps": [
            "Apply Bordeaux paste (mixture of copper sulfate + lime) on all cut surfaces immediately",
            "Spray Copper Oxychloride (3g per litre) on entire tree",
            "Remove and burn all pruned material",
            "Apply Carbendazim paste on wound after pruning",
            "Repeat copper spray after 14 days",
        ],
        "prevention": "Avoid pruning wounds in wet weather. Seal all wounds with Bordeaux paste. Use certified disease-free planting material.",
        "products": ["Bordeaux Paste", "Copper Oxychloride (Blitox)", "Carbendazim (Bavistin)", "Thiophanate Methyl"],
    },
    "greening": {
        "summary": "Citrus Greening (Huanglongbing/HLB) — Blotchy yellow leaves, small lopsided bitter fruits. Caused by bacteria spread by psyllid insects. NO CURE EXISTS.",
        "immediate": "Confirm with your agriculture officer before removing trees. Once confirmed — remove and destroy immediately.",
        "steps": [
            "Remove and destroy all infected trees — bury or burn them completely",
            "Spray Imidacloprid (0.5ml per litre) on remaining healthy trees to kill psyllid vectors",
            "Apply Imidacloprid as soil drench for better systemic protection",
            "Monitor all remaining trees every month",
            "Do not plant new citrus within 100 metres of infected area",
        ],
        "prevention": "Use certified disease-free grafted plants only. Control psyllid insects with regular Imidacloprid spray from day 1.",
        "products": ["Imidacloprid (Confidor/Gaucho)", "Thiamethoxam (Actara)", "Dimethoate (Rogor)"],
    },
    "cercospora_gray_leaf_spot": {
        "summary": "Cercospora Gray Leaf Spot of Maize — Rectangular gray/tan lesions on leaves, parallel to leaf veins. Reduces grain filling.",
        "immediate": "Scout field — if more than 50% of plants show symptoms on upper leaves, spray immediately.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Propiconazole (1ml per litre) on entire crop",
            "Timing is critical — spray at tasseling/silking stage for best results",
            "Repeat after 14 days if weather remains humid",
            "Practice crop rotation — do not grow maize in same field continuously",
        ],
        "prevention": "Use resistant hybrid varieties. Practice crop rotation. Till soil after harvest to bury infected debris.",
        "products": ["Azoxystrobin (Amistar)", "Propiconazole (Tilt)", "Pyraclostrobin (Headline)", "Mancozeb"],
    },
    "Common_rust": {
        "summary": "Common Rust of Maize — Cinnamon-brown powdery pustules on both sides of leaves. Spreads through wind. Usually manageable.",
        "immediate": "Scout field for severity. Mild infection — monitor. Severe infection (>50% leaf area) — spray immediately.",
        "steps": [
            "Spray Propiconazole (1ml per litre) or Azoxystrobin (1ml per litre) if infection is heavy",
            "Repeat after 14 days",
            "Mild infections in field maize usually do not need spraying — monitor instead",
            "Seed maize and sweet corn are more sensitive — spray earlier",
        ],
        "prevention": "Plant rust-resistant hybrid varieties. Avoid late planting when rust pressure is highest. Apply fungicide preventively on seed maize.",
        "products": ["Propiconazole (Tilt)", "Azoxystrobin (Amistar)", "Mancozeb (Dithane M-45)"],
    },
    "Northern_Leaf_Blight": {
        "summary": "Northern Leaf Blight (NLB) of Maize — Long gray-green to tan cigar-shaped lesions on leaves. Can cause 30–50% yield loss in severe cases.",
        "immediate": "Apply fungicide at tasseling stage — this is the most important timing.",
        "steps": [
            "Spray Azoxystrobin (1ml per litre) or Propiconazole (1ml per litre) at tasseling stage",
            "Repeat after 14 days",
            "Remove severely infected lower leaves to slow spread",
            "Harvest promptly when grain is ripe to reduce losses",
        ],
        "prevention": "Plant NLB-resistant hybrid varieties. Practice crop rotation. Plow crop residue after harvest.",
        "products": ["Azoxystrobin (Amistar)", "Propiconazole (Tilt)", "Pyraclostrobin (Headline)", "Trifloxystrobin"],
    },
}

def get_treatment(class_name: str) -> dict:
    """Return full treatment dict for a disease class name."""
    name_lower = class_name.lower()

    # Healthy check
    if "healthy" in name_lower:
        return TREATMENTS["healthy"]

    # Try exact key match first
    for key, treatment in TREATMENTS.items():
        if key.lower() == name_lower:
            return treatment

    # Try substring match — longest key wins to avoid false short matches
    best_key = None
    best_len = 0
    for key in TREATMENTS:
        k = key.lower()
        if k in name_lower and len(k) > best_len:
            best_key = key
            best_len = len(k)

    if best_key:
        return TREATMENTS[best_key]

    # Fallback
    return {
        "summary": f"Disease detected: {class_name.replace('_',' ')}. Consult your local Krishi Vigyan Kendra (KVK) for specific treatment advice.",
        "immediate": "Remove infected plant parts and isolate from healthy plants immediately.",
        "steps": [
            "Take a clear photo of the affected plant and visit your nearest KVK or agri shop",
            "Apply broad-spectrum copper fungicide (Blitox / Copper Oxychloride, 3g per litre of water) as a safe first step",
            "Avoid overhead irrigation — water at the base of plants only",
            "Remove and destroy all visibly infected leaves and stems",
            "Monitor remaining plants daily for spread",
        ],
        "prevention": "Use certified disease-free seeds next season. Practice crop rotation. Maintain proper plant spacing for airflow.",
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
    return jsonify({"status": "ok", "yield_records": len(YIELD_DATA), "states": len(SOIL_DATA)})

# ══════════════════════════════════════════════════════════════════════════════
#  1. CROP RECOMMENDATION  POST /api/ai/crop-recommend
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/ai/crop-recommend", methods=["POST"])
def crop_recommend():
    try:
        load_crop_models()
        data = request.get_json(force=True)
        required = ["N","P","K","temperature","humidity","ph","rainfall"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        features = np.array([[
            float(data["N"]), float(data["P"]), float(data["K"]),
            float(data["temperature"]), float(data["humidity"]),
            float(data["ph"]), float(data["rainfall"]),
        ]])

        proba      = _crop_model.predict_proba(features)[0]
        top3       = np.argsort(proba)[::-1][:3]
        names      = _crop_encoder.classes_

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
        return jsonify({"error": "Crop model not found. Check CROP_MODEL_PATH in app.py"}), 500
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

        # Read and preprocess image
        img_bytes = request.files["image"].read()
        img   = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize((128, 128))
        arr   = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)

        # Predict — suppress verbose output
        preds       = _disease_model.predict(arr, verbose=0)[0]
        num_classes = len(preds)
        top_idx     = int(np.argmax(preds))
        confidence  = round(float(preds[top_idx]) * 100, 2)

        print(f"[Disease] num_classes={num_classes}, top_idx={top_idx}, confidence={confidence}%")

        # Map index to class name safely
        if top_idx < len(DISEASE_CLASSES):
            class_name = DISEASE_CLASSES[top_idx]
        else:
            # Model has different number of classes — use folder-scan order
            print(f"[Disease] WARNING: top_idx {top_idx} >= DISEASE_CLASSES len {len(DISEASE_CLASSES)}")
            class_name = f"Unknown_Class_{top_idx}"

        parts     = class_name.split("_", 1)
        plant     = parts[0]
        condition = parts[1].replace("_", " ") if len(parts) > 1 else class_name
        severity  = "High" if confidence > 85 else "Medium" if confidence > 60 else "Low"

        # Top 3 predictions
        top3_idx = np.argsort(preds)[::-1][:3]
        top3 = []
        for i in top3_idx:
            cn = DISEASE_CLASSES[i] if i < len(DISEASE_CLASSES) else f"Class_{i}"
            top3.append({"class": cn.replace("_", " "), "confidence": round(float(preds[i]) * 100, 2)})

        return jsonify({
            "disease":       condition,
            "plant":         plant,
            "severity":      severity,
            "confidence":    confidence,
            "treatment":     get_treatment(class_name),
            "class_raw":     class_name,
            "model_classes": num_classes,
            "top3":          top3,
        })

    except FileNotFoundError:
        return jsonify({"error": "Disease model not found. Check DISEASE_MODEL_PATH in app.py"}), 500
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[Disease ERROR]\n{tb}")
        # Return full traceback so we can see exact line in browser/frontend
        return jsonify({"error": str(e), "traceback": tb}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  3. SOIL & YIELD RECOMMENDATION  POST /api/ai/soil-recommend
#  Uses CSV data directly — no pickle, no version issues
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/api/ai/soil-recommend", methods=["POST"])
def soil_recommend():
    try:
        data = request.get_json(force=True)
        required = ["crop", "season", "state", "area"]
        missing  = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        crop_in   = data["crop"].strip()
        season_in = data["season"].strip()
        state_in  = data["state"].strip()
        area      = float(data.get("area", 100))
        fert_in   = float(data.get("fertilizer", 0))
        pest_in   = float(data.get("pesticide", 0))

        # ── Step 1: match rows in yield CSV ───────────────────────────────────
        matches = []
        all_state_matches = []
        for row in YIELD_DATA:
            rc = row.get("crop","").strip().lower()
            rs = row.get("season","").strip().lower()
            rt = row.get("state","").strip().lower()
            crop_ok   = crop_in.lower() in rc or rc in crop_in.lower()
            state_ok  = state_in.lower() == rt
            if state_ok:
                all_state_matches.append(row)
            if crop_ok and state_ok:
                matches.append(row)

        # ── Step 2: predicted yield ────────────────────────────────────────────
        def avg_yield(rows):
            ys = []
            for r in rows:
                try:
                    y = float(r.get("yield", 0))
                    if y > 0: ys.append(y)
                except: pass
            return round(sum(ys[-5:]) / len(ys[-5:]), 4) if ys else None

        predicted_yield = avg_yield(matches)
        source_note = ""
        if predicted_yield:
            source_note = f"Based on {len(matches)} historical records for {crop_in} in {state_in} (last 5 seasons averaged)."
        else:
            predicted_yield = avg_yield(all_state_matches) or 1.5
            source_note = f"No direct records for '{crop_in}' in {state_in}. Showing {state_in} state average yield."

        # ── Step 3: soil profile ───────────────────────────────────────────────
        soil = SOIL_DATA.get(state_in, {"N":75,"P":35,"K":30,"pH":6.8})
        N, P, K, pH = soil["N"], soil["P"], soil["K"], soil["pH"]

        def status(val, low, high):
            return "Low" if val < low else "High" if val > high else "Adequate"

        n_s = status(N, 60, 120)
        p_s = status(P, 20, 50)
        k_s = status(K, 20, 50)
        ph_s = "Acidic" if pH < 6.0 else "Alkaline" if pH > 7.5 else "Optimal"

        # ── Step 4: NPK recommendations (kg/ha) ───────────────────────────────
        # Base NPK requirements per crop type
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
        elif any(x in crop_lower for x in ["cotton"]):
            base_n, base_p, base_k = 100, 50, 50
            water_need, duration_days = "Moderate (8-10 irrigations)", 180
            companions = ["Cowpea (nitrogen)", "Sorghum (border)"]
            harvest_tips = "Pick bolls as they open. Avoid picking during dew or rain."
        elif any(x in crop_lower for x in ["sugarcane"]):
            base_n, base_p, base_k = 250, 60, 120
            water_need, duration_days = "Very High (fortnightly)", 365
            companions = ["Potato (intercrop early)", "Onion (intercrop)"]
            harvest_tips = "Harvest at 10-12 months. Brix reading should be 18-20%."
        elif any(x in crop_lower for x in ["potato"]):
            base_n, base_p, base_k = 180, 90, 120
            water_need, duration_days = "Moderate (8-10 irrigations)", 90
            companions = ["Beans", "Horseradish (pest repellent)"]
            harvest_tips = "Harvest when vines die back. Cure for 1-2 weeks before storage."
        elif any(x in crop_lower for x in ["tomato"]):
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
            harvest_tips = "Harvest when inner pod walls show dark veins. Test-dig before full harvest."
        elif any(x in crop_lower for x in ["onion"]):
            base_n, base_p, base_k = 100, 50, 60
            water_need, duration_days = "Moderate (10-12 irrigations)", 150
            companions = ["Carrot", "Chamomile"]
            harvest_tips = "Harvest when tops fall over naturally. Cure in dry shade for 2-3 weeks."
        else:
            base_n, base_p, base_k = 80, 40, 40
            water_need, duration_days = "Moderate", 90
            companions = ["Legumes (nitrogen fixers)"]
            harvest_tips = "Monitor crop maturity indicators. Harvest at optimal moisture content."

        # Adjust for soil status
        rec_n = max(0, base_n - (N - 80)) if n_s == "High" else base_n + 20 if n_s == "Low" else base_n
        rec_p = max(0, base_p - 10) if p_s == "High" else base_p + 15 if p_s == "Low" else base_p
        rec_k = max(0, base_k - 10) if k_s == "High" else base_k + 15 if k_s == "Low" else base_k

        # Convert to fertilizer product quantities
        urea_kg    = round(rec_n / 0.46)   # Urea is 46% N
        dap_kg     = round(rec_p / 0.46)   # DAP is 46% P2O5
        mop_kg     = round(rec_k / 0.60)   # MOP is 60% K2O

        # ── Step 5: fertilizer schedule ───────────────────────────────────────
        schedule = []
        if duration_days <= 100:
            schedule = [
                {"time": "At sowing (Day 0)",          "application": f"Apply full DAP ({dap_kg} kg/ha) + full MOP ({mop_kg} kg/ha) as basal dose. Apply 1/3 Urea ({urea_kg//3} kg/ha)."},
                {"time": f"30 days after sowing",      "application": f"Top dress 1/3 Urea ({urea_kg//3} kg/ha). Apply zinc sulfate 25 kg/ha if deficient."},
                {"time": f"55 days after sowing",      "application": f"Top dress remaining 1/3 Urea ({urea_kg//3} kg/ha). Foliar spray micronutrients if yellowing observed."},
            ]
        else:
            schedule = [
                {"time": "At sowing / planting (Day 0)", "application": f"Basal: Full DAP ({dap_kg} kg/ha) + Full MOP ({mop_kg} kg/ha) + 1/4 Urea ({urea_kg//4} kg/ha). Mix well into soil before planting."},
                {"time": "30 days after sowing",         "application": f"Top dress 1/4 Urea ({urea_kg//4} kg/ha). Apply micronutrients (Zinc sulfate 25 kg/ha)."},
                {"time": "60 days after sowing",         "application": f"Top dress 1/4 Urea ({urea_kg//4} kg/ha). Apply additional MOP (20 kg/ha) if yellowing/tip burn observed."},
                {"time": "90 days after sowing",         "application": f"Top dress remaining 1/4 Urea ({urea_kg//4} kg/ha). Foliar boron spray (0.2%) if required."},
            ]

        # pH correction
        ph_correction = ""
        if ph_s == "Acidic":
            lime_t = round(max(1, (6.5 - pH) * 2), 1)
            ph_correction = f"Apply {lime_t} tonnes/ha agricultural lime (CaCO₃) 2 weeks before sowing to raise pH from {pH} to ~6.5."
        elif ph_s == "Alkaline":
            gyp_kg = round(max(200, (pH - 7.0) * 500))
            ph_correction = f"Apply {gyp_kg} kg/ha gypsum (CaSO₄) + elemental sulfur 50 kg/ha to reduce pH from {pH} toward 7.0."

        # Yield-based overall advice
        if predicted_yield < 1.0:
            advice = "⚠️ Low yield expected. Priority actions: soil organic matter is critical — apply farmyard manure 10 t/ha. Test for micronutrient deficiencies (Zn, Fe, B). Ensure drainage."
            yield_category = "Low"
        elif predicted_yield < 2.5:
            advice = "📈 Moderate yield expected. Improve with timely irrigation at critical stages (flowering, grain filling). Use certified seeds. Apply recommended NPK in split doses."
            yield_category = "Moderate"
        elif predicted_yield < 6.0:
            advice = "✅ Good yield expected. Maintain agronomic best practices. Scout weekly for pests. Ensure irrigation at panicle initiation and grain filling stages."
            yield_category = "Good"
        else:
            advice = "🌟 Excellent yield potential for this region. Focus on post-harvest management — proper drying, storage, and market timing to maximize income."
            yield_category = "Excellent"

        # Total input cost estimate
        urea_cost  = urea_kg * area * 6        # ~₹6/kg
        dap_cost   = dap_kg  * area * 27       # ~₹27/kg
        mop_cost   = mop_kg  * area * 17       # ~₹17/kg
        total_fert_cost = round(urea_cost + dap_cost + mop_cost)

        return jsonify({
            "predicted_yield":   predicted_yield,
            "yield_category":    yield_category,
            "unit":              "tonnes/hectare",
            "total_production":  round(predicted_yield * area, 2),
            "source_note":       source_note,

            "soil_profile": {
                "N": N, "P": P, "K": K, "pH": pH,
                "N_status": n_s, "P_status": p_s,
                "K_status": k_s, "pH_status": ph_s,
            },

            "fertilizer_recommendation": {
                "Urea_kg_per_ha":  urea_kg,
                "DAP_kg_per_ha":   dap_kg,
                "MOP_kg_per_ha":   mop_kg,
                "N_kg_per_ha":     round(rec_n),
                "P_kg_per_ha":     round(rec_p),
                "K_kg_per_ha":     round(rec_k),
                "estimated_cost":  f"₹{total_fert_cost:,} for {area} ha",
                "ph_correction":   ph_correction,
            },

            "application_schedule": schedule,

            "crop_info": {
                "duration_days":  duration_days,
                "water_need":     water_need,
                "companion_crops": companions,
                "harvest_tips":   harvest_tips,
            },

            "advice": advice,

            "input": {
                "crop": crop_in, "season": season_in,
                "state": state_in, "area": area,
            }
        })

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Starting Shramic AI Service on http://localhost:5001")
    # use_reloader=False prevents Flask watchdog from reloading TensorFlow mid-request
    # which causes the disease model to unload and fail
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)