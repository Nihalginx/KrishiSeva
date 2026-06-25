// server.js  ─── KrishiSeva Backend Entry Point
'use strict';

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

// ── Routes ──
const authRoutes      = require('./routes/auth');
const marketRoutes    = require('./routes/market');
const dashboardRoutes = require('./routes/dashboard');
const taskRoutes      = require('./routes/tasks');
const cropRoutes      = require('./routes/crops');
const chatRoutes      = require('./routes/chat');

const app  = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════
//  MIDDLEWARE
// ════════════════════════════════════════════

// CORS — allow frontend origin
app.use(cors({
  origin     : process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));  // 10 MB for base64 images
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max     : 200,
  message : { error: 'Too many requests. Please try again in 15 minutes.' }
});
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max     : 10,
  message : { error: 'Too many AI requests. Please wait a moment.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max     : 20,
  message : { error: 'Too many login attempts. Please try again later.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/chat/', chatLimiter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public'))); 

// ════════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════════
app.use('/api/auth',      authRoutes);
app.use('/api/market',    marketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/crops',     cropRoutes);
app.use('/api/chat',      chatRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status  : 'OK',
    service : 'KrishiSeva API',
    version : '1.0.0',
    uptime  : Math.round(process.uptime()) + 's',
    env     : process.env.NODE_ENV || 'development',
    time    : new Date().toISOString()
  });
});

// ── API 404 ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ── SPA fallback (serves index.html for non-API routes) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    error  : process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ════════════════════════════════════════════
//  START
// ════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     🌾  KrishiSeva Backend  🌾         ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Server  : http://localhost:${PORT}         ║`);
  console.log(`║  Mode    : ${(process.env.NODE_ENV || 'development').padEnd(28)}║`);
  console.log(`║  DB      : ${(process.env.DB_PATH || './db/krishiseva.db').padEnd(28)}║`);
  console.log('╚════════════════════════════════════════╝\n');
  console.log('  API Routes:');
  console.log('  POST  /api/auth/register');
  console.log('  POST  /api/auth/login');
  console.log('  GET   /api/market/prices');
  console.log('  GET   /api/market/buyers');
  console.log('  GET   /api/dashboard/overview  (auth)');
  console.log('  GET   /api/tasks               (auth)');
  console.log('  GET   /api/crops/:crop');
  console.log('  POST  /api/chat\n');
});

module.exports = app;
