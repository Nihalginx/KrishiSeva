// routes/auth.js  ─── Register & Login
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db/setup');
const router  = express.Router();

// ── Helper: issue token ──
function signToken(farmer) {
  return jwt.sign(
    { id: farmer.id, name: farmer.name, phone: farmer.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ────────────────────────────────────────────
//  POST /api/auth/register
// ────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, phone, email, password, village, district, state, land_acres, crops } = req.body;

  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Name, phone and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const existing = db.prepare('SELECT id FROM farmers WHERE phone = ?').get(phone);
  if (existing)
    return res.status(409).json({ error: 'A farmer with this phone number is already registered.' });

  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(`
      INSERT INTO farmers (name, phone, email, password_hash, village, district, state, land_acres, crops)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, phone, email || null, hash,
      village || null, district || null,
      state   || 'Maharashtra',
      land_acres || 0,
      JSON.stringify(crops || [])
    );

    const farmer = db.prepare('SELECT id, name, phone, email, village, district, state, land_acres, crops FROM farmers WHERE id = ?')
                     .get(result.lastInsertRowid);
    farmer.crops = JSON.parse(farmer.crops);

    return res.status(201).json({
      message : 'Registration successful!',
      token   : signToken(farmer),
      farmer
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ────────────────────────────────────────────
//  POST /api/auth/login
// ────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password)
    return res.status(400).json({ error: 'Phone and password are required.' });

  const farmer = db.prepare(`
    SELECT id, name, phone, email, village, district, state, land_acres, crops, password_hash
    FROM farmers WHERE phone = ?
  `).get(phone);

  if (!farmer)
    return res.status(401).json({ error: 'No account found with this phone number.' });

  const valid = bcrypt.compareSync(password, farmer.password_hash);
  if (!valid)
    return res.status(401).json({ error: 'Incorrect password.' });

  delete farmer.password_hash;
  farmer.crops = JSON.parse(farmer.crops || '[]');

  return res.json({
    message : 'Login successful!',
    token   : signToken(farmer),
    farmer
  });
});

// ────────────────────────────────────────────
//  GET /api/auth/me  (protected)
// ────────────────────────────────────────────
const authMiddleware = require('../middleware/auth');
router.get('/me', authMiddleware, (req, res) => {
  const farmer = db.prepare(`
    SELECT id, name, phone, email, village, district, state, land_acres, crops, created_at
    FROM farmers WHERE id = ?
  `).get(req.farmer.id);

  if (!farmer) return res.status(404).json({ error: 'Farmer not found.' });

  farmer.crops = JSON.parse(farmer.crops || '[]');
  return res.json({ farmer });
});

// ────────────────────────────────────────────
//  PUT /api/auth/profile  (protected)
// ────────────────────────────────────────────
router.put('/profile', authMiddleware, (req, res) => {
  const { name, email, village, district, state, land_acres, crops } = req.body;

  db.prepare(`
    UPDATE farmers
    SET name=?, email=?, village=?, district=?, state=?, land_acres=?, crops=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name, email, village, district, state,
    land_acres, JSON.stringify(crops || []),
    req.farmer.id
  );

  return res.json({ message: 'Profile updated successfully.' });
});

module.exports = router;
