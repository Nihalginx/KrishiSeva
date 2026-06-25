// db/setup.js  ─── SQLite schema + initial data
'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './db/krishiseva.db';

// Ensure directory exists
const dir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// ── WAL mode for better concurrent reads ──
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ════════════════════════════════════════════
//  SCHEMA
// ════════════════════════════════════════════
db.exec(`
  /* ── Farmers (users) ── */
  CREATE TABLE IF NOT EXISTS farmers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    phone         TEXT    UNIQUE NOT NULL,
    email         TEXT    UNIQUE,
    password_hash TEXT    NOT NULL,
    village       TEXT,
    district      TEXT,
    state         TEXT    DEFAULT 'Maharashtra',
    land_acres    REAL    DEFAULT 0,
    crops         TEXT    DEFAULT '[]',   -- JSON array of crop names
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  );

  /* ── Market listings ── */
  CREATE TABLE IF NOT EXISTS listings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id    INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    crop         TEXT    NOT NULL,
    quantity_kg  REAL    NOT NULL,
    price_per_kg REAL    NOT NULL,
    quality      TEXT    DEFAULT 'A',    -- A / B / C
    location     TEXT,
    description  TEXT,
    status       TEXT    DEFAULT 'active', -- active | sold | expired
    created_at   TEXT    DEFAULT (datetime('now')),
    expires_at   TEXT
  );

  /* ── Mandi (market) prices ── */
  CREATE TABLE IF NOT EXISTS mandi_prices (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    crop       TEXT    NOT NULL,
    price_per_quintal REAL NOT NULL,
    change_pct REAL    DEFAULT 0,
    mandi_name TEXT    DEFAULT 'Pune APMC',
    updated_at TEXT    DEFAULT (datetime('now'))
  );

  /* ── Farm tasks ── */
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id   INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    description TEXT,
    due_date    TEXT,
    priority    TEXT    DEFAULT 'normal',  -- urgent | normal | low
    status      TEXT    DEFAULT 'pending', -- pending | done
    field_name  TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  /* ── Farm alerts ── */
  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id   INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL,          -- disease | weather | market | irrigation
    severity    TEXT    DEFAULT 'medium',  -- high | medium | low
    title       TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    is_read     INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  /* ── Crop health scans ── */
  CREATE TABLE IF NOT EXISTS crop_health (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id   INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    crop        TEXT    NOT NULL,
    field_name  TEXT,
    health_pct  INTEGER NOT NULL,          -- 0–100
    disease     TEXT,                      -- detected disease if any
    notes       TEXT,
    scanned_at  TEXT    DEFAULT (datetime('now'))
  );

  /* ── Chat history ── */
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id   INTEGER REFERENCES farmers(id) ON DELETE SET NULL,
    messages    TEXT    NOT NULL DEFAULT '[]',  -- JSON array
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );

  /* ── Buyers directory ── */
  CREATE TABLE IF NOT EXISTS buyers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    company       TEXT,
    crops_wanted  TEXT DEFAULT '[]',       -- JSON array
    min_quantity_kg REAL DEFAULT 100,
    price_offered REAL,
    location      TEXT,
    contact       TEXT,
    verified      INTEGER DEFAULT 0,
    created_at    TEXT DEFAULT (datetime('now'))
  );
`);

// ════════════════════════════════════════════
//  SEED DATA
// ════════════════════════════════════════════
function seed() {
  const alreadySeeded = db.prepare('SELECT COUNT(*) as c FROM farmers').get().c > 0;
  if (alreadySeeded) return;

  console.log('🌱 Seeding database...');

  // Demo farmer
  const hash = bcrypt.hashSync('farmer123', 10);
  const farmerId = db.prepare(`
    INSERT INTO farmers (name, phone, email, password_hash, village, district, state, land_acres, crops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Rajesh Patil', '9876543210', 'rajesh@example.com', hash,
    'Shirur', 'Pune', 'Maharashtra', 4.2,
    JSON.stringify(['wheat', 'tomato', 'onion', 'soybean'])
  ).lastInsertRowid;

  // Mandi prices
  const prices = [
    ['Wheat',   2240, 2.1,  'Pune APMC'],
    ['Paddy',   2183, -0.3, 'Pune APMC'],
    ['Maize',   1890, -0.8, 'Nashik APMC'],
    ['Cotton',  6750, 3.4,  'Aurangabad APMC'],
    ['Soybean', 4320, 1.2,  'Latur APMC'],
    ['Onion',   1450, 5.7,  'Lasalgaon APMC'],
    ['Tomato',   820, -1.2, 'Pune APMC'],
    ['Sugarcane',3150, 0.5,  'Kolhapur APMC'],
    ['Groundnut',5200, 2.8, 'Solapur APMC'],
  ];
  const insertPrice = db.prepare(
    'INSERT INTO mandi_prices (crop, price_per_quintal, change_pct, mandi_name) VALUES (?, ?, ?, ?)'
  );
  prices.forEach(p => insertPrice.run(...p));

  // Tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (farmer_id, title, description, due_date, priority, status, field_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  [
    [farmerId, 'Morning irrigation',          'Water the wheat plot via drip system', '2025-03-28', 'normal',  'done',    'Field A1'],
    [farmerId, 'Apply urea top dressing',     'Spread 30 kg/ha urea on wheat',         '2025-03-28', 'normal',  'done',    'Wheat Plot'],
    [farmerId, 'Spray fungicide for rust',    'Apply Tebuconazole 1mL/L on soybean',   '2025-03-28', 'urgent',  'pending', 'Field B3'],
    [farmerId, 'Soil test — tomato field',    'Collect 3 samples, send to lab',         '2025-03-28', 'normal',  'pending', 'Field C2'],
    [farmerId, 'Submit onion listing',        'List 500 kg @ ₹1450/q on market',       '2025-03-28', 'normal',  'done',    'Store'],
    [farmerId, 'Check drip irrigation tubes', 'Inspect for blockages in row 3',         '2025-03-29', 'low',     'pending', 'Field A2'],
  ].forEach(t => insertTask.run(...t));

  // Alerts
  const insertAlert = db.prepare(`
    INSERT INTO alerts (farmer_id, type, severity, title, message)
    VALUES (?, ?, ?, ?, ?)
  `);
  [
    [farmerId, 'disease',    'high',   'Soybean Rust Detected',
     'AI scan detected soybean rust pustules on Field B3 leaves. Immediate fungicide application recommended. Use Tebuconazole 25.9% EC at 1 mL/L.'],
    [farmerId, 'irrigation', 'medium', 'Irrigation Due — Field A1',
     'Soil moisture sensor reads 28% on wheat field A1. Recommend watering within the next 24 hours.'],
    [farmerId, 'market',     'low',    'Onion Price Opportunity',
     'Onion prices surged 5.7% today at Lasalgaon APMC. ₹1,450/quintal. Good window to sell your stored stock.'],
    [farmerId, 'weather',    'medium', 'Heavy Rain Expected in 3 Days',
     'IMD forecast: 45–60 mm rainfall expected in Pune district between Apr 1–3. Hold off foliar sprays.'],
  ].forEach(a => insertAlert.run(...a));

  // Crop health
  const insertHealth = db.prepare(`
    INSERT INTO crop_health (farmer_id, crop, field_name, health_pct, disease, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  [
    [farmerId, 'wheat',   'Field A1', 82, null,            'Healthy. Minor aphid pressure — monitor weekly.'],
    [farmerId, 'tomato',  'Field C2', 64, 'Early Blight',  'Early blight detected. Apply Mancozeb 2g/L.'],
    [farmerId, 'onion',   'Field D1', 91, null,            'Excellent health. Ready for harvest in 2 weeks.'],
    [farmerId, 'soybean', 'Field B3', 43, 'Soybean Rust',  'Severe rust outbreak. Urgent treatment required.'],
  ].forEach(h => insertHealth.run(...h));

  // Buyers
  const insertBuyer = db.prepare(`
    INSERT INTO buyers (name, company, crops_wanted, min_quantity_kg, price_offered, location, contact, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['Suresh Mehta',    'Mehta Agro Exports',   JSON.stringify(['onion','tomato']), 500,  1480, 'Mumbai',    '9811001100', 1],
    ['Prakash Desai',   'Desai Food Processing', JSON.stringify(['wheat','maize']),  1000, 2260, 'Pune',      '9822002200', 1],
    ['Anita Sharma',    'FreshMart Direct',     JSON.stringify(['tomato','onion']), 200,   850, 'Nashik',    '9833003300', 1],
    ['Ravi Industries', 'Ravi Soya Ltd',        JSON.stringify(['soybean']),         2000, 4350, 'Latur',     '9844004400', 1],
    ['Global Grains Co','Global Grains',        JSON.stringify(['wheat','paddy']),  5000, 2280, 'Aurangabad','9855005500', 0],
  ].forEach(b => insertBuyer.run(...b));

  console.log(`✅ Seeded: farmer #${farmerId} (phone: 9876543210, pass: farmer123)`);
}

seed();

module.exports = db;
