// routes/dashboard.js  ─── Farmer dashboard aggregation
'use strict';

const express = require('express');
const db      = require('../db/setup');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ────────────────────────────────────────────
//  GET /api/dashboard/overview
//  Full dashboard summary in one call
// ────────────────────────────────────────────
router.get('/overview', auth, (req, res) => {
  const id = req.farmer.id;

  const farmer    = db.prepare('SELECT id,name,phone,village,district,state,land_acres,crops FROM farmers WHERE id=?').get(id);
  farmer.crops    = JSON.parse(farmer.crops || '[]');

  const tasks     = db.prepare('SELECT * FROM tasks WHERE farmer_id=? ORDER BY priority DESC, due_date').all(id);
  const tasksDone = tasks.filter(t => t.status === 'done').length;

  const alerts    = db.prepare(`
    SELECT * FROM alerts WHERE farmer_id=? ORDER BY
      CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `).all(id);

  const health    = db.prepare('SELECT * FROM crop_health WHERE farmer_id=? ORDER BY scanned_at DESC').all(id);

  // Latest price for each of farmer's crops
  const cropPrices = farmer.crops.reduce((acc, c) => {
    const p = db.prepare('SELECT * FROM mandi_prices WHERE LOWER(crop) = LOWER(?) LIMIT 1').get(c);
    if (p) acc.push(p);
    return acc;
  }, []);

  // Mock weather (replace with real API call if WEATHER_API_KEY set)
  const weather = generateWeather();

  // Earnings simulation (replace with real accounting table)
  const earnings = generateEarnings();

  return res.json({
    farmer,
    weather,
    tasks,
    tasks_summary : { total: tasks.length, done: tasksDone, pending: tasks.length - tasksDone },
    alerts,
    unread_alerts : alerts.filter(a => !a.is_read).length,
    crop_health   : health,
    crop_prices   : cropPrices,
    earnings,
    summary: {
      active_listings : db.prepare("SELECT COUNT(*) as c FROM listings WHERE farmer_id=? AND status='active'").get(id).c,
      total_health_avg: health.length ? Math.round(health.reduce((s,h)=>s+h.health_pct,0)/health.length) : 0,
    }
  });
});

// ────────────────────────────────────────────
//  GET /api/dashboard/weather
// ────────────────────────────────────────────
router.get('/weather', auth, (req, res) => {
  res.json(generateWeather());
});

// ────────────────────────────────────────────
//  GET /api/dashboard/health
// ────────────────────────────────────────────
router.get('/health', auth, (req, res) => {
  const health = db.prepare('SELECT * FROM crop_health WHERE farmer_id=? ORDER BY scanned_at DESC').all(req.farmer.id);
  res.json({ crop_health: health });
});

// ────────────────────────────────────────────
//  POST /api/dashboard/health  (save a scan)
// ────────────────────────────────────────────
router.post('/health', auth, (req, res) => {
  const { crop, field_name, health_pct, disease, notes } = req.body;
  if (!crop || health_pct === undefined)
    return res.status(400).json({ error: 'crop and health_pct are required.' });

  const result = db.prepare(`
    INSERT INTO crop_health (farmer_id, crop, field_name, health_pct, disease, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.farmer.id, crop, field_name, +health_pct, disease || null, notes || null);

  res.status(201).json({ message: 'Health scan saved.', id: result.lastInsertRowid });
});

// ────────────────────────────────────────────
//  GET /api/dashboard/alerts
// ────────────────────────────────────────────
router.get('/alerts', auth, (req, res) => {
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE farmer_id=?
    ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
  `).all(req.farmer.id);
  res.json({ alerts, unread: alerts.filter(a => !a.is_read).length });
});

// ────────────────────────────────────────────
//  PATCH /api/dashboard/alerts/:id/read
// ────────────────────────────────────────────
router.patch('/alerts/:id/read', auth, (req, res) => {
  db.prepare('UPDATE alerts SET is_read=1 WHERE id=? AND farmer_id=?')
    .run(req.params.id, req.farmer.id);
  res.json({ message: 'Alert marked as read.' });
});

// ────────────────────────────────────────────
//  POST /api/dashboard/alerts  (create alert)
// ────────────────────────────────────────────
router.post('/alerts', auth, (req, res) => {
  const { type, severity, title, message } = req.body;
  if (!type || !title || !message)
    return res.status(400).json({ error: 'type, title and message are required.' });

  const result = db.prepare(`
    INSERT INTO alerts (farmer_id, type, severity, title, message) VALUES (?, ?, ?, ?, ?)
  `).run(req.farmer.id, type, severity || 'medium', title, message);

  res.status(201).json({ message: 'Alert created.', id: result.lastInsertRowid });
});

// ────────────────────────────────────────────
//  GET /api/dashboard/earnings
// ────────────────────────────────────────────
router.get('/earnings', auth, (req, res) => {
  res.json({ earnings: generateEarnings() });
});

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function generateWeather() {
  const base = 28;
  const variation = ((Math.random() - 0.5) * 3).toFixed(1);
  return {
    location   : 'Pune, Maharashtra',
    temperature: +(base + +variation).toFixed(1),
    condition  : 'Partly Cloudy',
    humidity   : Math.round(64 + Math.random() * 8),
    wind_kmh   : Math.round(10 + Math.random() * 6),
    wind_dir   : 'NW',
    rain_7day  : 14,
    uv_index   : 7,
    spray_advice: 'Conditions are suitable for foliar spraying today.',
    forecast   : [
      { day: 'Today',    icon: '⛅', high: 29, low: 19, rain: 0  },
      { day: 'Tomorrow', icon: '🌤', high: 31, low: 21, rain: 0  },
      { day: 'Apr 1',    icon: '🌧', high: 25, low: 18, rain: 45 },
      { day: 'Apr 2',    icon: '⛈', high: 23, low: 17, rain: 60 },
      { day: 'Apr 3',    icon: '🌦', high: 26, low: 19, rain: 20 },
    ],
    updated_at: new Date().toISOString()
  };
}

function generateEarnings() {
  const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
  const base   = [42, 38, 55, 61, 58, 84];
  return months.map((m, i) => ({
    month   : m,
    amount_k: +(base[i] + (Math.random() - 0.5) * 3).toFixed(1)
  }));
}

module.exports = router;
