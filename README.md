# 🌾 Shramic Agri Tech Platform

Full-stack agricultural platform with AI advisory, job matching, equipment booking, and more.

## Architecture

```
shramic/
├── ai-service/        Flask (Python) — AI models: crop, disease, soil
├── backend/           Node.js + Express — REST API + Socket.io
├── frontend/          React + Vite + Tailwind CSS
└── database/          MySQL schema
```

---

## Prerequisites

| Tool      | Version   |
|-----------|-----------|
| Node.js   | 18+       |
| Python    | 3.9–3.11  |
| MySQL     | 8.0+      |
| npm       | 9+        |
| pip       | 23+       |

---

## Step 1 — Database Setup

```bash
# Open MySQL shell
mysql -u root -p

# Run the schema
source path/to/shramic/database/schema.sql
# OR
mysql -u root -p < database/schema.sql
```

---

## Step 2 — Backend (Node.js)

```bash
cd backend
npm install

# Edit .env — set your MySQL password
notepad .env

# Start
npm run dev        # development (nodemon)
# or
npm start          # production
```

Backend runs on **http://localhost:4000**

---

## Step 3 — AI Service (Python / Flask)

```bash
cd ai-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Verify model paths in app.py match your system:
# CROP_MODEL_PATH, DISEASE_MODEL_PATH, SOIL_MODEL_PATH, etc.

# Start
python app.py
```

AI service runs on **http://localhost:5001**

---

## Step 4 — Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## Default Login

| Field    | Value              |
|----------|--------------------|
| Email    | admin@shramic.in   |
| Password | Admin@123          |

---

## API Reference (Postman)

### Auth
```
POST /api/auth/register   { name, email, password, role, phone, state }
POST /api/auth/login      { email, password }
GET  /api/auth/me         (Bearer token)
```

### Jobs
```
GET    /api/jobs?status=open&type=harvesting&state=Karnataka
POST   /api/jobs          { title, job_type, wage_per_day, location, state, ... }
POST   /api/jobs/:id/apply
GET    /api/jobs/:id/applications
PATCH  /api/jobs/:id/applications/:appId  { status: "accepted" }
```

### Workers
```
GET   /api/workers?available=true&state=Karnataka&skill=harvesting
PUT   /api/workers/me        { skills, experience_years, daily_wage, bio }
PATCH /api/workers/availability  { is_available: true, lat, lng }
```

### AI
```
POST /api/ai/crop-recommend
Body: { N, P, K, temperature, humidity, ph, rainfall }

POST /api/ai/disease-detect
Body: multipart/form-data  field: image (file)

POST /api/ai/soil-recommend
Body: { crop, season, state, area, fertilizer, pesticide }
```

### Equipment
```
GET  /api/equipment?type=tractor&state=Punjab
POST /api/equipment          { name, type, rent_per_day, location, state }
POST /api/equipment/:id/book { start_date, end_date, notes }
GET  /api/bookings/my
```

### Other
```
GET  /api/market-prices
GET  /api/schemes
GET  /api/calendar
POST /api/calendar   { title, event_type, event_date, notes }
GET  /api/community
POST /api/community  { title, content, category, video_url }
GET  /api/payments/my
GET  /api/dashboard/stats
```

---

## Environment Variables

### backend/.env
```
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=shramic_db
JWT_SECRET=change_this_to_a_long_random_string
AI_SERVICE_URL=http://localhost:5001
```

---

## ML Model Paths (ai-service/app.py)

Update these 5 constants at the top of `app.py`:

```python
CROP_MODEL_PATH    = r"C:\...\crop_recommendation\model.pkl"
CROP_ENCODER_PATH  = r"C:\...\crop_recommendation\label_encoder.pkl"
DISEASE_MODEL_PATH = r"C:\...\plant_disease\models\best_plant_disease_model.h5"
SOIL_MODEL_PATH    = r"C:\...\soil\yield_model.pkl"
SOIL_ENCODERS_PATH = r"C:\...\soil\yield_encoders.pkl"
```

---

## Features Checklist

- [x] Login / Register (Farmer & Worker roles)
- [x] Dashboard with live stats
- [x] Job posting & applications
- [x] Worker profiles & availability toggle (Socket.io)
- [x] Equipment listing & booking
- [x] Nursery & Input marketplace
- [x] AI Crop Recommendation (N,P,K → crop)
- [x] AI Plant Disease Detection (image → disease + treatment)
- [x] AI Soil & Yield Analysis (crop/season/state → yield)
- [x] Government Schemes dashboard
- [x] Market price feed (mock)
- [x] Agriculture calendar
- [x] Community knowledge posts
- [x] Mock payment system
- [x] JWT authentication + role-based access
- [x] MySQL with full schema
- [x] Real-time availability via Socket.io

---

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 18, Vite, Tailwind CSS  |
| Backend  | Node.js, Express, Socket.io   |
| Database | MySQL 8                       |
| AI       | Python, Flask, TensorFlow, scikit-learn |
| Auth     | JWT (jsonwebtoken + bcryptjs) |
