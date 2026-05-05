'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const Entry  = require('../models/Entry');
const User   = require('../models/User');

/* ── POST /api/entries  — save / update today's entry ── */
router.post('/', auth, async (req, res) => {
  try {
    const data     = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    let entry = await Entry.findOne({ userId: req.user.id, dateString: todayStr });

    if (entry) {
      Object.assign(entry, data);
    } else {
      entry = new Entry({ userId: req.user.id, dateString: todayStr, ...data });
    }

    if (data.completed) entry.completedAt = new Date();
    await entry.save();

    /* Update user stats if just completed */
    if (data.completed) {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { entryCount: 1 }, lastActive: new Date() },
        { new: true }
      );
      await user.checkAndPromote();
    }

    res.json(entry);
  } catch (e) {
    console.error('POST /entries', e.message);
    res.status(500).json({ error: 'Could not save entry.' });
  }
});

/* ── GET /api/entries/today ── */
router.get('/today', auth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const entry    = await Entry.findOne({ userId: req.user.id, dateString: todayStr }).select('-userId');
    res.json(entry || null);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/entries  — last 90 days ── */
router.get('/', auth, async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(90)
      .select('-userId');
    res.json(entries);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
