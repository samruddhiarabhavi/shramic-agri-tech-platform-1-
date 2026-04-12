/**
 * Shramic Agri Tech Platform — Backend (Node.js + Express)
 * All routes merged into one file for simplicity.
 * Features: Auth, Jobs, Workers, Equipment, Marketplace,
 *           Bookings, Payments, Calendar, Community, Schemes,
 *           AI proxy to Flask service, Socket.io real-time.
 */

require("dotenv").config();
const express     = require("express");
const http        = require("http");
const cors        = require("cors");
const mysql       = require("mysql2/promise");
const bcrypt      = require("bcryptjs");
const jwt         = require("jsonwebtoken");
const multer      = require("multer");
const axios       = require("axios");
const FormData    = require("form-data");
const { Server }  = require("socket.io");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: "*" } });

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload (memory storage for AI forwarding)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── DB Pool ────────────────────────────────────────────────────────────────────
const db = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASS     || "",
  database: process.env.DB_NAME     || "shramic_db",
  waitForConnections: true,
  connectionLimit: 10,
});

const AI_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

// ── Auth middleware ────────────────────────────────────────────────────────────
function auth(roles = []) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "shramic_secret_2024");
      if (roles.length && !roles.includes(payload.role))
        return res.status(403).json({ error: "Forbidden" });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role = "farmer", phone, location, state } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "name, email, password required" });

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, phone, location, state) VALUES (?,?,?,?,?,?,?)",
      [name, email, hash, role, phone || null, location || null, state || null]
    );

    // Auto-create worker profile
    if (role === "worker") {
      await db.query("INSERT INTO worker_profiles (user_id) VALUES (?)", [result.insertId]);
    }

    const token = jwt.sign(
      { id: result.insertId, email, role, name },
      process.env.JWT_SECRET || "shramic_secret_2024",
      { expiresIn: "7d" }
    );
    res.status(201).json({ token, user: { id: result.insertId, name, email, role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "shramic_secret_2024",
      { expiresIn: "7d" }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
app.get("/api/auth/me", auth(), async (req, res) => {
  const [rows] = await db.query("SELECT id,name,email,role,phone,location,state,avatar_url,created_at FROM users WHERE id=?", [req.user.id]);
  res.json(rows[0] || {});
});

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/dashboard/stats", auth(), async (req, res) => {
  try {
    const uid  = req.user.id;
    const role = req.user.role;
    let stats  = {};

    if (role === "farmer") {
      const [[jobs]]        = await db.query("SELECT COUNT(*) AS c FROM jobs WHERE farmer_id=?", [uid]);
      const [[apps]]        = await db.query("SELECT COUNT(*) AS c FROM job_applications ja JOIN jobs j ON ja.job_id=j.id WHERE j.farmer_id=?", [uid]);
      const [[bookings]]    = await db.query("SELECT COUNT(*) AS c FROM bookings WHERE farmer_id=?", [uid]);
      const [[payments]]    = await db.query("SELECT IFNULL(SUM(amount),0) AS total FROM payments WHERE payer_id=?", [uid]);
      stats = { jobs_posted: jobs.c, applications_received: apps.c, equipment_booked: bookings.c, total_spent: payments.total };
    } else if (role === "worker") {
      const [[applied]]  = await db.query("SELECT COUNT(*) AS c FROM job_applications WHERE worker_id=?", [uid]);
      const [[accepted]] = await db.query("SELECT COUNT(*) AS c FROM job_applications WHERE worker_id=? AND status='accepted'", [uid]);
      const [[earned]]   = await db.query("SELECT IFNULL(SUM(amount),0) AS total FROM payments WHERE receiver_id=?", [uid]);
      const [profile]    = await db.query("SELECT is_available, rating FROM worker_profiles WHERE user_id=?", [uid]);
      stats = { jobs_applied: applied.c, jobs_accepted: accepted.c, total_earned: earned.total, is_available: profile[0]?.is_available, rating: profile[0]?.rating };
    }

    const [[openJobs]]    = await db.query("SELECT COUNT(*) AS c FROM jobs WHERE status='open'");
    const [[workers]]     = await db.query("SELECT COUNT(*) AS c FROM worker_profiles WHERE is_available=1");
    stats.platform_open_jobs      = openJobs.c;
    stats.platform_available_workers = workers.c;

    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  JOBS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/jobs", auth(), async (req, res) => {
  const { type, state, status = "open" } = req.query;
  let q = "SELECT j.*, u.name AS farmer_name, u.phone AS farmer_phone FROM jobs j JOIN users u ON j.farmer_id=u.id WHERE j.status=?";
  const params = [status];
  if (type)  { q += " AND j.job_type=?";  params.push(type); }
  if (state) { q += " AND j.state=?";     params.push(state); }
  q += " ORDER BY j.created_at DESC";
  const [rows] = await db.query(q, params);
  res.json(rows);
});

app.post("/api/jobs", auth(["farmer","admin"]), async (req, res) => {
  try {
    const { title, description, job_type, location, state, district, wage_per_day, workers_needed, start_date, end_date } = req.body;
    const [r] = await db.query(
      "INSERT INTO jobs (farmer_id,title,description,job_type,location,state,district,wage_per_day,workers_needed,start_date,end_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [req.user.id, title, description, job_type, location, state, district, wage_per_day, workers_needed||1, start_date, end_date]
    );
    res.status(201).json({ id: r.insertId, message: "Job posted" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/jobs/:id", auth(), async (req, res) => {
  const [rows] = await db.query("SELECT j.*,u.name AS farmer_name,u.phone FROM jobs j JOIN users u ON j.farmer_id=u.id WHERE j.id=?", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.delete("/api/jobs/:id", auth(["farmer","admin"]), async (req, res) => {
  await db.query("DELETE FROM jobs WHERE id=? AND farmer_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Deleted" });
});

// Job applications
app.post("/api/jobs/:id/apply", auth(["worker"]), async (req, res) => {
  try {
    const { cover_note } = req.body;
    await db.query("INSERT INTO job_applications (job_id,worker_id,cover_note) VALUES (?,?,?)",
      [req.params.id, req.user.id, cover_note]);
    res.status(201).json({ message: "Applied successfully" });
  } catch (e) { res.status(409).json({ error: "Already applied" }); }
});

app.get("/api/jobs/:id/applications", auth(["farmer","admin"]), async (req, res) => {
  const [rows] = await db.query(
    `SELECT ja.*, u.name, u.phone, wp.skills, wp.experience_years, wp.rating, wp.daily_wage
     FROM job_applications ja JOIN users u ON ja.worker_id=u.id
     LEFT JOIN worker_profiles wp ON wp.user_id=u.id WHERE ja.job_id=?`, [req.params.id]);
  res.json(rows);
});

app.patch("/api/jobs/:id/applications/:appId", auth(["farmer"]), async (req, res) => {
  const { status } = req.body;
  await db.query("UPDATE job_applications SET status=? WHERE id=?", [status, req.params.appId]);
  res.json({ message: "Updated" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  WORKER PROFILES
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/workers", auth(), async (req, res) => {
  const { state, skill, available } = req.query;
  let q = `SELECT u.id,u.name,u.phone,u.location,u.state,wp.*
           FROM worker_profiles wp JOIN users u ON wp.user_id=u.id WHERE 1=1`;
  const p = [];
  if (available === "true") { q += " AND wp.is_available=1"; }
  if (state)  { q += " AND u.state=?"; p.push(state); }
  if (skill)  { q += " AND JSON_CONTAINS(wp.skills, JSON_QUOTE(?))"; p.push(skill); }
  q += " ORDER BY wp.rating DESC";
  const [rows] = await db.query(q, p);
  res.json(rows);
});

app.get("/api/workers/me", auth(["worker"]), async (req, res) => {
  const [rows] = await db.query("SELECT * FROM worker_profiles WHERE user_id=?", [req.user.id]);
  res.json(rows[0] || {});
});

app.put("/api/workers/me", auth(["worker"]), async (req, res) => {
  const { skills, experience_years, preferred_state, preferred_district, daily_wage, bio } = req.body;
  await db.query(
    `UPDATE worker_profiles SET skills=?,experience_years=?,preferred_state=?,preferred_district=?,daily_wage=?,bio=? WHERE user_id=?`,
    [JSON.stringify(skills), experience_years, preferred_state, preferred_district, daily_wage, bio, req.user.id]
  );
  res.json({ message: "Profile updated" });
});

// Toggle availability + socket broadcast
app.patch("/api/workers/availability", auth(["worker"]), async (req, res) => {
  const { is_available, lat, lng } = req.body;
  await db.query("UPDATE worker_profiles SET is_available=?,lat=?,lng=? WHERE user_id=?",
    [is_available, lat || null, lng || null, req.user.id]);
  io.emit("worker_availability_update", { worker_id: req.user.id, is_available, lat, lng });
  res.json({ message: "Availability updated" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  EQUIPMENT
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/equipment", auth(), async (req, res) => {
  const { type, state } = req.query;
  let q = "SELECT e.*,u.name AS owner_name,u.phone FROM equipment e JOIN users u ON e.owner_id=u.id WHERE e.is_available=1";
  const p = [];
  if (type)  { q += " AND e.type=?";  p.push(type); }
  if (state) { q += " AND e.state=?"; p.push(state); }
  const [rows] = await db.query(q, p);
  res.json(rows);
});

app.post("/api/equipment", auth(), async (req, res) => {
  const { name, type, description, rent_per_day, location, state } = req.body;
  const [r] = await db.query("INSERT INTO equipment (owner_id,name,type,description,rent_per_day,location,state) VALUES (?,?,?,?,?,?,?)",
    [req.user.id, name, type, description, rent_per_day, location, state]);
  res.status(201).json({ id: r.insertId });
});

app.post("/api/equipment/:id/book", auth(["farmer"]), async (req, res) => {
  try {
    const { start_date, end_date, notes } = req.body;
    const [eq] = await db.query("SELECT * FROM equipment WHERE id=?", [req.params.id]);
    if (!eq.length) return res.status(404).json({ error: "Equipment not found" });

    const days   = Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1;
    const amount = days * eq[0].rent_per_day;

    const [r] = await db.query("INSERT INTO bookings (equipment_id,farmer_id,start_date,end_date,total_amount,notes) VALUES (?,?,?,?,?,?)",
      [req.params.id, req.user.id, start_date, end_date, amount, notes]);

    // Mock payment record
    await db.query("INSERT INTO payments (payer_id,receiver_id,amount,type,reference_id,status,transaction_id) VALUES (?,?,?,?,?,?,?)",
      [req.user.id, eq[0].owner_id, amount, "equipment_booking", r.insertId, "success", `TXN${Date.now()}`]);

    res.status(201).json({ id: r.insertId, total_amount: amount, message: "Booked successfully" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/bookings/my", auth(), async (req, res) => {
  const [rows] = await db.query(
    `SELECT b.*,e.name AS equipment_name,e.type FROM bookings b JOIN equipment e ON b.equipment_id=e.id WHERE b.farmer_id=?`,
    [req.user.id]);
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════════════
//  MARKETPLACE
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/marketplace", auth(), async (req, res) => {
  const { category, state } = req.query;
  let q = "SELECT m.*,u.name AS seller_name,u.phone FROM marketplace m JOIN users u ON m.seller_id=u.id WHERE 1=1";
  const p = [];
  if (category) { q += " AND m.category=?"; p.push(category); }
  if (state)    { q += " AND m.state=?";    p.push(state); }
  q += " ORDER BY m.created_at DESC";
  const [rows] = await db.query(q, p);
  res.json(rows);
});

app.post("/api/marketplace", auth(), async (req, res) => {
  const { title, category, description, price, unit, stock, state, contact } = req.body;
  const [r] = await db.query("INSERT INTO marketplace (seller_id,title,category,description,price,unit,stock,state,contact) VALUES (?,?,?,?,?,?,?,?,?)",
    [req.user.id, title, category, description, price, unit, stock, state, contact]);
  res.status(201).json({ id: r.insertId });
});

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/calendar", auth(), async (req, res) => {
  const [rows] = await db.query("SELECT * FROM calendar_events WHERE user_id=? ORDER BY event_date ASC", [req.user.id]);
  res.json(rows);
});

app.post("/api/calendar", auth(), async (req, res) => {
  const { title, event_type, event_date, notes } = req.body;
  const [r] = await db.query("INSERT INTO calendar_events (user_id,title,event_type,event_date,notes) VALUES (?,?,?,?,?)",
    [req.user.id, title, event_type, event_date, notes]);
  res.status(201).json({ id: r.insertId });
});

app.delete("/api/calendar/:id", auth(), async (req, res) => {
  await db.query("DELETE FROM calendar_events WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Deleted" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  COMMUNITY POSTS
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/community", auth(), async (req, res) => {
  const [rows] = await db.query(
    "SELECT cp.*,u.name AS author FROM community_posts cp JOIN users u ON cp.user_id=u.id ORDER BY cp.created_at DESC LIMIT 50");
  res.json(rows);
});

app.post("/api/community", auth(), async (req, res) => {
  const { title, content, video_url, category } = req.body;
  const [r] = await db.query("INSERT INTO community_posts (user_id,title,content,video_url,category) VALUES (?,?,?,?,?)",
    [req.user.id, title, content, video_url, category]);
  res.status(201).json({ id: r.insertId });
});

// ══════════════════════════════════════════════════════════════════════════════
//  GOVERNMENT SCHEMES
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/schemes", auth(), async (req, res) => {
  const [rows] = await db.query("SELECT * FROM schemes ORDER BY id");
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════════════
//  MARKET PRICES — Live from data.gov.in (Agmarknet) + smart fallback
// ══════════════════════════════════════════════════════════════════════════════

// Baseline MSP/reference prices (updated Apr 2026)
const BASE_PRICES = {
  Rice: 2300, Wheat: 2275, Cotton: 6620, Maize: 2090, Soybean: 4300,
  Tomato: 950, Onion: 1600, Potato: 1050, Sugarcane: 370, Groundnut: 5850,
  Mustard: 5650, Turmeric: 14000, Chilli: 9000, Garlic: 4500, Bajra: 2500,
};
const MARKETS = {
  Rice:'APMC Hyderabad', Wheat:'APMC Ludhiana', Cotton:'APMC Ahmedabad',
  Maize:'APMC Bengaluru', Soybean:'APMC Indore', Tomato:'APMC Pune',
  Onion:'APMC Lasalgaon', Potato:'APMC Agra', Sugarcane:'FRP Kolhapur',
  Groundnut:'APMC Rajkot', Mustard:'APMC Jaipur', Turmeric:'APMC Nizamabad',
  Chilli:'APMC Guntur', Garlic:'APMC Neemuch', Bajra:'APMC Jodhpur',
};

// Cache prices for 30 min to avoid hammering the API
let priceCache = null;
let priceCacheTime = 0;

async function fetchLivePrices() {
  // Return cache if fresh (30 min)
  if (priceCache && Date.now() - priceCacheTime < 30 * 60 * 1000) return priceCache;

  try {
    // data.gov.in Agmarknet API — free public API key (demo key, register at data.gov.in for production)
    const apiKey = process.env.DATAGOV_API_KEY || "579b464db66ec23d9505900024a9a4aab3e440b8";
    const crops  = Object.keys(BASE_PRICES).slice(0, 10).join(",");
    const url    = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=50&filters%5BCommodity%5D=${encodeURIComponent("Rice")}`;

    const resp = await axios.get(url, { timeout: 5000 });
    const records = resp.data?.records || [];

    if (records.length > 0) {
      // Group by commodity, take highest-volume market
      const grouped = {};
      records.forEach(r => {
        const crop = r.Commodity || r.commodity;
        const modal = parseFloat(r.Modal_Price || r.modal_price || 0);
        const min   = parseFloat(r.Min_Price   || r.min_price   || 0);
        const max   = parseFloat(r.Max_Price   || r.max_price   || 0);
        if (!grouped[crop] || modal > grouped[crop].price) {
          grouped[crop] = { crop, price: modal, min, max, market: r.Market || r.market || '' };
        }
      });

      const prices = Object.values(grouped).map(item => {
        const base   = BASE_PRICES[item.crop] || item.price;
        const pct    = base > 0 ? ((item.price - base) / base * 100).toFixed(1) : 0;
        const change = pct > 0 ? `+${pct}%` : `${pct}%`;
        return { ...item, change, unit: '₹/quintal' };
      });

      priceCache     = { updated_at: new Date(), source: 'live', prices };
      priceCacheTime = Date.now();
      return priceCache;
    }
  } catch (_) {
    // Fall through to smart mock
  }

  // Smart fallback: simulate realistic daily movement (±3%) from base
  const prices = Object.entries(BASE_PRICES).map(([crop, base]) => {
    // Deterministic "daily" variation using date seed so prices change day to day
    const seed   = new Date().toISOString().slice(0, 10) + crop;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    const pct    = ((hash % 300) / 100).toFixed(1);  // -3.00 to +3.00
    const change = parseFloat(pct) >= 0 ? `+${pct}%` : `${pct}%`;
    const price  = Math.round(base * (1 + parseFloat(pct) / 100));
    const min    = Math.round(price * 0.94);
    const max    = Math.round(price * 1.06);
    return { crop, price, min, max, unit: '₹/quintal', change, market: MARKETS[crop] || 'APMC India' };
  });

  priceCache     = { updated_at: new Date(), source: 'indicative', prices };
  priceCacheTime = Date.now();
  return priceCache;
}

app.get("/api/market-prices", auth(), async (req, res) => {
  try {
    const data = await fetchLivePrices();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  AI WAGE SUGGESTION — Smart formula based on job type, location, season
// ══════════════════════════════════════════════════════════════════════════════
app.post("/api/ai/wage-suggest", auth(), async (req, res) => {
  const { job_type, state, season, workers_needed = 1 } = req.body;

  // Base wages per job type (₹/day) — sourced from MGNREGA + market rates
  const BASE = {
    sowing:      450, harvesting:  650, irrigation:  400,
    spraying:    550, ploughing:   700, transplanting: 500,
    weeding:     400, other:       450,
  };

  // State multipliers (cost of living adjustment)
  const STATE_MUL = {
    'Punjab': 1.35, 'Haryana': 1.30, 'Maharashtra': 1.25, 'Gujarat': 1.20,
    'Karnataka': 1.15, 'Tamil Nadu': 1.15, 'Andhra Pradesh': 1.10,
    'Telangana': 1.10, 'Kerala': 1.40, 'West Bengal': 1.0,
    'Uttar Pradesh': 0.95, 'Bihar': 0.90, 'Madhya Pradesh': 0.95,
    'Rajasthan': 1.0, 'Odisha': 0.90, 'Chhattisgarh': 0.90,
    'Jharkhand': 0.90, 'Assam': 0.95, 'Himachal Pradesh': 1.20,
  };

  // Season multiplier — peak seasons command higher wages
  const SEASON_MUL = {
    Kharif: 1.15, Rabi: 1.10, harvest: 1.25, Summer: 0.95,
    'Whole Year': 1.0,
  };

  const base       = BASE[job_type] || BASE.other;
  const stateMul   = STATE_MUL[state] || 1.0;
  const seasonMul  = SEASON_MUL[season] || 1.0;
  const groupDisc  = workers_needed >= 5 ? 0.92 : workers_needed >= 3 ? 0.96 : 1.0;

  const suggested  = Math.round(base * stateMul * seasonMul * groupDisc / 50) * 50; // round to ₹50
  const low        = Math.round(suggested * 0.85 / 50) * 50;
  const high       = Math.round(suggested * 1.15 / 50) * 50;

  res.json({
    suggested_wage: suggested,
    range: { low, high },
    breakdown: {
      base_wage:     base,
      state_factor:  stateMul,
      season_factor: seasonMul,
      group_discount: workers_needed >= 3 ? `${Math.round((1-groupDisc)*100)}% group discount` : null,
    },
    note: `Based on MGNREGA rates + market data for ${state}. Adjust based on skill level.`,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  WORKER TRACKING — Get all available workers with coords
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/workers/tracking", auth(["farmer","admin"]), async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id,u.name,u.phone,wp.lat,wp.lng,wp.is_available,wp.skills,wp.rating,wp.daily_wage
     FROM worker_profiles wp JOIN users u ON wp.user_id=u.id
     WHERE wp.is_available=1 AND wp.lat IS NOT NULL AND wp.lng IS NOT NULL`
  );
  res.json(rows);
});

// Worker updates own location (called from mobile/browser)
app.patch("/api/workers/location", auth(["worker"]), async (req, res) => {
  const { lat, lng } = req.body;
  await db.query("UPDATE worker_profiles SET lat=?,lng=? WHERE user_id=?", [lat, lng, req.user.id]);
  io.emit("worker_location_update", { worker_id: req.user.id, name: req.user.name, lat, lng });
  res.json({ message: "Location updated" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  USER PROFILE UPDATE
// ══════════════════════════════════════════════════════════════════════════════
app.put("/api/auth/profile", auth(), async (req, res) => {
  const { name, phone, location, state } = req.body;
  await db.query(
    "UPDATE users SET name=?,phone=?,location=?,state=? WHERE id=?",
    [name, phone, location, state, req.user.id]
  );
  res.json({ message: "Profile updated" });
});


app.get("/api/payments/my", auth(), async (req, res) => {
  const [rows] = await db.query(
    "SELECT p.*,u.name AS receiver_name FROM payments p LEFT JOIN users u ON p.receiver_id=u.id WHERE p.payer_id=? ORDER BY p.created_at DESC",
    [req.user.id]);
  res.json(rows);
});

app.post("/api/payments", auth(), async (req, res) => {
  const { receiver_id, amount, type, reference_id } = req.body;
  const txn = `TXN${Date.now()}`;
  const [r] = await db.query(
    "INSERT INTO payments (payer_id,receiver_id,amount,type,reference_id,status,transaction_id) VALUES (?,?,?,?,?,'success',?)",
    [req.user.id, receiver_id, amount, type, reference_id, txn]);
  res.status(201).json({ id: r.insertId, transaction_id: txn, status: "success" });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AI PROXY ROUTES (forward to Flask)
// ══════════════════════════════════════════════════════════════════════════════

// Crop recommendation — save to DB
app.post("/api/ai/crop-recommend", auth(), async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_URL}/api/ai/crop-recommend`, req.body);

    // Save to DB
    await db.query(
      "INSERT INTO crop_recommendations (user_id,nitrogen,phosphorus,potassium,temperature,humidity,ph,rainfall,recommended_crop,confidence) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [req.user.id, req.body.N, req.body.P, req.body.K, req.body.temperature, req.body.humidity, req.body.ph, req.body.rainfall, data.recommended_crop, data.confidence]
    ).catch(() => {}); // non-blocking

    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "AI service error: " + (e.response?.data?.error || e.message) });
  }
});

// Disease detection — forward image
app.post("/api/ai/disease-detect", auth(), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const form = new FormData();
    form.append("image", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });

    const { data } = await axios.post(`${AI_URL}/api/ai/disease-detect`, form, { headers: form.getHeaders() });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "AI service error: " + (e.response?.data?.error || e.message) });
  }
});

// Soil / yield recommendation — save to DB
app.post("/api/ai/soil-recommend", auth(), async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_URL}/api/ai/soil-recommend`, req.body);

    await db.query(
      "INSERT INTO soil_reports (user_id,crop,season,state,area,fertilizer_used,pesticide_used,predicted_yield,recommendation) VALUES (?,?,?,?,?,?,?,?,?)",
      [req.user.id, req.body.crop, req.body.season, req.body.state, req.body.area, req.body.fertilizer||0, req.body.pesticide||0, data.predicted_yield, data.advice]
    ).catch(() => {});

    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "AI service error: " + (e.response?.data?.error || e.message) });
  }
});

// AI history
app.get("/api/ai/history", auth(), async (req, res) => {
  const [crops] = await db.query("SELECT * FROM crop_recommendations WHERE user_id=? ORDER BY created_at DESC LIMIT 10", [req.user.id]);
  const [soils] = await db.query("SELECT * FROM soil_reports WHERE user_id=? ORDER BY created_at DESC LIMIT 10", [req.user.id]);
  res.json({ crop_history: crops, soil_history: soils });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SOCKET.IO — Real-time availability
// ══════════════════════════════════════════════════════════════════════════════
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("worker_location_update", (data) => {
    // data = { worker_id, lat, lng }
    socket.broadcast.emit("worker_location_update", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Shramic Backend running on http://localhost:${PORT}`));