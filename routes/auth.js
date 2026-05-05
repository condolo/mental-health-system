'use strict';
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../middleware/auth');

const sign = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

const safeUser = (user) => ({
  id:                   user._id,
  name:                 user.name,
  email:                user.email,
  role:                 user.role,
  isActive:             user.isActive,
  entryCount:           user.entryCount,
  discountCode:         user.discountCode,
  unreadNotifications:  user.notifications.filter(n => !n.read).length,
  createdAt:            user.createdAt
});

/* ── POST /api/auth/register ── */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are all required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (await User.findOne({ email }))
      return res.status(409).json({ error: 'This email is already registered.' });

    const user = await new User({ name, email, password }).save();
    res.status(201).json({ token: sign(user), user: safeUser(user) });
  } catch (e) {
    console.error('/register', e.message);
    res.status(500).json({ error: 'Server error — please try again.' });
  }
});

/* ── POST /api/auth/login ── */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password.' });

    user.lastActive = new Date();
    await user.save();
    res.json({ token: sign(user), user: safeUser(user) });
  } catch (e) {
    console.error('/login', e.message);
    res.status(500).json({ error: 'Server error — please try again.' });
  }
});

/* ── GET /api/auth/me ── */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(safeUser(user));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/auth/notifications ── */
router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    res.json(user.notifications.sort((a, b) => b.createdAt - a.createdAt).slice(0, 30));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── PATCH /api/auth/notifications/read ── */
router.patch('/notifications/read', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user.id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── POST /api/auth/setup  (creates admin — one-time only) ── */
router.post('/setup', async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) return res.status(409).json({ error: 'Admin already exists.' });

    const admin = await new User({
      name:     process.env.ADMIN_NAME     || 'Admin',
      email:    process.env.ADMIN_EMAIL    || 'admin@app.com',
      password: process.env.ADMIN_PASSWORD || 'Admin1234!',
      role:     'admin'
    }).save();

    res.status(201).json({ message: 'Admin created.', email: admin.email });
  } catch (e) {
    console.error('/setup', e.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
