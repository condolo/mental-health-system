'use strict';
const jwt = require('jsonwebtoken');

/* ── User auth (any logged-in user) ── */
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No token — access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/* ── Admin only ── */
auth.adminOnly = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = auth;
