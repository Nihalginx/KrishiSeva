// routes/chat.js  ─── KrishiBot AI proxy (Anthropic API kept server-side)
'use strict';

const express = require('express');
const fetch   = require('node-fetch');
const db      = require('../db/setup');
const auth    = require('../middleware/auth');
const router  = express.Router();

const SYSTEM_PROMPT = `You are KrishiBot, a warm, expert AI agricultural advisor built specifically for Indian farmers.

Your capabilities:
• Diagnose crop diseases and pest infestations from image descriptions and symptom text
• Predict disease outbreak risk based on weather, humidity, season and crop stage
• Recommend specific Indian-market pesticides with product names, doses, application timing and pre-harvest intervals
• Advise on organic alternatives alongside chemical options
• Provide fertilizer schedules for all major Indian crops (wheat, rice, cotton, soybean, sugarcane, tomato, onion, maize, groundnut, chilli)
• Give weather-based spray advisories (do not spray if rain expected in 4 hours)
• Explain government schemes (PM-KISAN, KCC, Soil Health Card, MSP)

Response style:
- Warm, respectful tone — treat the farmer as an expert in their own field
- Simple, practical language — avoid overly technical jargon
- Concise (4–6 sentences max per response)
- Structure advice as: 1) What it is 2) Why it matters 3) What to do TODAY
- When recommending pesticides, always mention: product name, dose, timing, and pre-harvest interval
- Mention organic alternatives when available
- End EVERY response with one concrete action the farmer should take TODAY

If an image is shared: describe what disease/deficiency/pest symptoms the image might show based on context, and give immediate advice.`;

// ── POST /api/chat  (public — can chat without login, but saves history if logged in) ──
router.post('/', async (req, res) => {
  // Optional auth
  let farmerId = null;
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      farmerId = decoded.id;
    } catch { /* unauthenticated — still allow chat */ }
  }

  const { messages, session_id } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'messages array is required.' });

  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'Content-Type'      : 'application/json',
        'x-api-key'         : process.env.ANTHROPIC_API_KEY,
        'anthropic-version' : '2023-06-01'
      },
      body: JSON.stringify({
        model      : 'claude-sonnet-4-20250514',
        max_tokens : 1024,
        system     : SYSTEM_PROMPT,
        messages
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(502).json({ error: 'AI service error: ' + data.error.message });
    }

    const reply = data.content?.map(b => b.text || '').join('\n') || '';

    // Save to chat history if farmer is logged in
    if (farmerId) {
      const allMsgs = [...messages, { role: 'assistant', content: reply }];
      if (session_id) {
        const session = db.prepare('SELECT id FROM chat_sessions WHERE id=? AND farmer_id=?').get(session_id, farmerId);
        if (session) {
          db.prepare("UPDATE chat_sessions SET messages=?, updated_at=datetime('now') WHERE id=?")
            .run(JSON.stringify(allMsgs), session_id);
        }
      } else {
        db.prepare("INSERT INTO chat_sessions (farmer_id, messages) VALUES (?, ?)").run(farmerId, JSON.stringify(allMsgs));
      }
    }

    // Auto-generate alert if AI detects a disease
    if (farmerId && reply.toLowerCase().match(/detected|found|outbreak|infected|infected|disease|urgent|immediately/)) {
      const cropMatch = reply.match(/\b(wheat|rice|paddy|cotton|soybean|tomato|onion|maize|corn|potato|chilli)\b/i);
      if (cropMatch) {
        db.prepare(`
          INSERT INTO alerts (farmer_id, type, severity, title, message)
          VALUES (?, 'disease', 'medium', ?, ?)
        `).run(farmerId, `AI detected possible crop issue — ${cropMatch[1]}`, reply.slice(0, 300));
      }
    }

    return res.json({ reply, usage: data.usage });

  } catch (err) {
    console.error('Chat route error:', err);
    return res.status(500).json({ error: 'Failed to connect to AI service.' });
  }
});

// ── GET /api/chat/history  (protected) ──
router.get('/history', auth, (req, res) => {
  const sessions = db.prepare(`
    SELECT id, created_at, updated_at,
           json_extract(messages, '$[0].content') as first_msg
    FROM chat_sessions WHERE farmer_id=? ORDER BY updated_at DESC LIMIT 20
  `).all(req.farmer.id);
  return res.json({ sessions });
});

// ── GET /api/chat/history/:id  (protected) ──
router.get('/history/:id', auth, (req, res) => {
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id=? AND farmer_id=?')
                    .get(req.params.id, req.farmer.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });
  session.messages = JSON.parse(session.messages);
  return res.json({ session });
});

// ── DELETE /api/chat/history/:id  (protected) ──
router.delete('/history/:id', auth, (req, res) => {
  db.prepare('DELETE FROM chat_sessions WHERE id=? AND farmer_id=?').run(req.params.id, req.farmer.id);
  return res.json({ message: 'Chat history deleted.' });
});

module.exports = router;
