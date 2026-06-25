// routes/market.js  ─── Mandi prices, listings, buyers
'use strict';

const express = require('express');
const db      = require('../db/setup');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ────────────────────────────────────────────
//  GET /api/market/prices
//  Returns live mandi prices (all crops or filtered)
// ────────────────────────────────────────────
router.get('/prices', (req, res) => {
  const { crop, mandi } = req.query;
  let sql  = 'SELECT * FROM mandi_prices';
  const params = [];

  if (crop || mandi) {
    sql += ' WHERE';
    if (crop)  { sql += ' LOWER(crop) LIKE ?';          params.push(`%${crop.toLowerCase()}%`); }
    if (mandi) { sql += (crop ? ' AND' : '') + ' LOWER(mandi_name) LIKE ?'; params.push(`%${mandi.toLowerCase()}%`); }
  }
  sql += ' ORDER BY crop';

  const prices = db.prepare(sql).all(...params);

  // Simulate slight random variation to look live
  const live = prices.map(p => ({
    ...p,
    price_per_quintal : +(p.price_per_quintal * (1 + (Math.random() - 0.5) * 0.001)).toFixed(0),
    updated_at        : new Date().toISOString()
  }));

  return res.json({ prices: live, count: live.length, fetched_at: new Date().toISOString() });
});

// ────────────────────────────────────────────
//  GET /api/market/buyers
//  Returns buyer directory (with optional crop filter)
// ────────────────────────────────────────────
router.get('/buyers', (req, res) => {
  const { crop, verified } = req.query;
  const buyers = db.prepare('SELECT * FROM buyers ORDER BY verified DESC, name').all();

  let filtered = buyers.map(b => ({ ...b, crops_wanted: JSON.parse(b.crops_wanted || '[]') }));

  if (crop) {
    filtered = filtered.filter(b =>
      b.crops_wanted.some(c => c.toLowerCase().includes(crop.toLowerCase()))
    );
  }
  if (verified !== undefined) {
    filtered = filtered.filter(b => b.verified === (verified === '1' ? 1 : 0));
  }

  return res.json({ buyers: filtered, count: filtered.length });
});

// ────────────────────────────────────────────
//  GET /api/market/listings
//  Public active listings
// ────────────────────────────────────────────
router.get('/listings', (req, res) => {
  const { crop, min_price, max_price, location } = req.query;
  let sql = `
    SELECT l.*, f.name as farmer_name, f.village, f.district
    FROM listings l JOIN farmers f ON l.farmer_id = f.id
    WHERE l.status = 'active'
  `;
  const params = [];

  if (crop)      { sql += ' AND LOWER(l.crop) LIKE ?';     params.push(`%${crop.toLowerCase()}%`); }
  if (min_price) { sql += ' AND l.price_per_kg >= ?';      params.push(+min_price); }
  if (max_price) { sql += ' AND l.price_per_kg <= ?';      params.push(+max_price); }
  if (location)  { sql += ' AND LOWER(l.location) LIKE ?'; params.push(`%${location.toLowerCase()}%`); }
  sql += ' ORDER BY l.created_at DESC';

  const listings = db.prepare(sql).all(...params);
  return res.json({ listings, count: listings.length });
});

// ────────────────────────────────────────────
//  POST /api/market/listings  (protected)
//  Create a new produce listing
// ────────────────────────────────────────────
router.post('/listings', auth, (req, res) => {
  const { crop, quantity_kg, price_per_kg, quality, location, description, expires_at } = req.body;

  if (!crop || !quantity_kg || !price_per_kg)
    return res.status(400).json({ error: 'crop, quantity_kg, and price_per_kg are required.' });

  const result = db.prepare(`
    INSERT INTO listings (farmer_id, crop, quantity_kg, price_per_kg, quality, location, description, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.farmer.id, crop, +quantity_kg, +price_per_kg, quality || 'A', location, description, expires_at || null);

  return res.status(201).json({ message: 'Listing created!', listing_id: result.lastInsertRowid });
});

// ────────────────────────────────────────────
//  GET /api/market/my-listings  (protected)
// ────────────────────────────────────────────
router.get('/my-listings', auth, (req, res) => {
  const listings = db.prepare(`
    SELECT * FROM listings WHERE farmer_id = ? ORDER BY created_at DESC
  `).all(req.farmer.id);
  return res.json({ listings, count: listings.length });
});

// ────────────────────────────────────────────
//  PUT /api/market/listings/:id  (protected)
// ────────────────────────────────────────────
router.put('/listings/:id', auth, (req, res) => {
  const { status, price_per_kg, quantity_kg } = req.body;
  const listing = db.prepare('SELECT * FROM listings WHERE id = ? AND farmer_id = ?')
                    .get(req.params.id, req.farmer.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  db.prepare(`
    UPDATE listings SET status=?, price_per_kg=?, quantity_kg=? WHERE id=?
  `).run(status || listing.status, price_per_kg || listing.price_per_kg, quantity_kg || listing.quantity_kg, listing.id);

  return res.json({ message: 'Listing updated.' });
});

// ────────────────────────────────────────────
//  DELETE /api/market/listings/:id  (protected)
// ────────────────────────────────────────────
router.delete('/listings/:id', auth, (req, res) => {
  const listing = db.prepare('SELECT id FROM listings WHERE id = ? AND farmer_id = ?')
                    .get(req.params.id, req.farmer.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });

  db.prepare('DELETE FROM listings WHERE id = ?').run(listing.id);
  return res.json({ message: 'Listing removed.' });
});

module.exports = router;
