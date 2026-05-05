/* ══════════════════════════════════════════════════════════════
   EMBRACING THE JOURNEY WITHIN — SERVER v2.1
   ══════════════════════════════════════════════════════════════ */
'use strict';
require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app = express();

/* ── Security middleware ── */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

/* ── Rate limiting (100 req / 15 min per IP) ── */
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

/* ── Static files ── */
app.use(express.static(path.join(__dirname)));

/* ── API Routes ── */
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/entries',      require('./routes/entries'));
app.use('/api/events',       require('./routes/events'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/availability', require('./routes/availability'));

/* ── Admin dashboard ── */
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'admin.html'))
);

/* ── SPA fallback (serve index.html for all other routes) ── */
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'index.html'))
);

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

/* ── Start server (MongoDB optional) ── */
const PORT = process.env.PORT || 3000;

function startServer() {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      startServer();
    })
    .catch(err => {
      console.error('⚠️  MongoDB connection failed:', err.message);
      console.log('▶️  Starting in static-only mode (API features unavailable)');
      startServer();
    });
} else {
  console.log('ℹ️  MONGODB_URI not set — running in static-only mode');
  console.log('   The app UI will load and work with localStorage.');
  console.log('   Set MONGODB_URI in your environment to enable full features.');
  startServer();
}
