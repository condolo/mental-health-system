'use strict';
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const Event   = require('../models/Event');
const Booking = require('../models/Booking');
const User    = require('../models/User');
const Entry   = require('../models/Entry');

/* ════════════════════════════════════════════
   All routes require admin role
   ════════════════════════════════════════════ */

/* ── GET /api/admin/stats  — ANONYMOUS aggregates only, zero private data ── */
router.get('/stats', auth.adminOnly, async (req, res) => {
  try {
    const Message = require('../models/Message');
    const Session = require('../models/Session');

    const [totalUsers, activeUsers, totalEntries, upcomingEvents, totalBookings, unreadChats, upcomingSessions] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Entry.countDocuments({ completed: true }),
      Event.countDocuments({ status: { $in: ['upcoming','live'] } }),
      Booking.countDocuments({ status: 'confirmed' }),
      Message.countDocuments({ sender: 'user', read: false }),
      Session.countDocuments({ status: 'confirmed' })
    ]);

    /* Daily check-in counts for last 7 days (no personal data) */
    const since7 = new Date(); since7.setDate(since7.getDate() - 7);
    const weeklyActivity = await Entry.aggregate([
      { $match: { completed: true, date: { $gte: since7 } } },
      { $group: { _id: '$dateString', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    /* Daily ACTIVE USERS for last 7 days — based on lastActive field */
    const dailyActiveUsers = await (async () => {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const start = new Date(dateStr); start.setHours(0, 0, 0, 0);
        const end   = new Date(dateStr); end.setHours(23, 59, 59, 999);
        const count = await User.countDocuments({ role: 'user', lastActive: { $gte: start, $lte: end } });
        result.push({ date: dateStr, count });
      }
      return result;
    })();

    /* Anonymous aggregate scores */
    const [agg] = await Entry.aggregate([
      { $match: { completed: true } },
      { $group: { _id: null, avgStress: { $avg: '$stressLevel' }, avgMood: { $avg: { $ifNull: ['$mood.score', 5] } }, avgOverall: { $avg: '$overallScore' } } }
    ]);

    res.json({
      totalUsers, activeUsers, totalEntries, upcomingEvents,
      totalBookings, unreadChats, upcomingSessions,
      weeklyActivity, dailyActiveUsers,
      aggregates: agg || {}
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/admin/profile  — get therapist profile ── */
router.get('/profile', auth.adminOnly, async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select(
      'name email profileTitle profileBio profileSpecializations profileLanguages profilePhotoUrl profileLocation profilePublicEmail profilePublic'
    );
    res.json(admin);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── PATCH /api/admin/profile  — update therapist profile ── */
router.patch('/profile', auth.adminOnly, async (req, res) => {
  try {
    const allowed = ['profileTitle','profileBio','profileSpecializations','profileLanguages',
      'profilePhotoUrl','profileLocation','profilePublicEmail','profilePublic','name'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const admin = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select(
      'name email profileTitle profileBio profileSpecializations profileLanguages profilePhotoUrl profileLocation profilePublicEmail profilePublic'
    );
    res.json(admin);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/admin/therapist-profile  — PUBLIC route for users ── */
router.get('/therapist-profile', async (req, res) => {
  try {
    const therapist = await User.findOne({ role: 'admin', profilePublic: true }).select(
      'name profileTitle profileBio profileSpecializations profileLanguages profilePhotoUrl profileLocation profilePublicEmail'
    );
    if (!therapist) return res.json(null);
    res.json(therapist);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── POST /api/admin/events  — create event + notify all users ── */
router.post('/events', auth.adminOnly, async (req, res) => {
  try {
    const data = { ...req.body, createdBy: req.user.id };
    if (data.type === 'premium' && data.price) {
      data.discountedPrice = Math.round(data.price * (1 - (data.discountPercent || 20) / 100));
    }

    const event = await new Event(data).save();

    /* Build notification message */
    const dateLabel = new Date(event.eventDate).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const priceLabel = event.type === 'premium'
      ? `Premium — $${event.price} (Active users pay $${event.discountedPrice})`
      : 'Free to attend';

    const notifMsg = `📅 New ${event.category.replace('-',' ')}: "${event.title}" — ${dateLabel} with ${event.therapistName}. ${priceLabel}. Open the Events tab to book your spot!`;

    /* Push notification to every user */
    await User.updateMany(
      { role: 'user' },
      { $push: { notifications: { message: notifMsg, eventId: event._id, type: 'event' } } }
    );

    event.notificationSent = true;
    await event.save();

    res.status(201).json(event);
  } catch (e) {
    console.error('POST /admin/events', e.message);
    res.status(500).json({ error: 'Could not create event.' });
  }
});

/* ── GET /api/admin/events ── */
router.get('/events', auth.adminOnly, async (req, res) => {
  try {
    const events = await Event.find().sort({ eventDate: -1 });
    const withBookings = await Promise.all(events.map(async e => ({
      ...e.toObject(),
      bookingCount: await Booking.countDocuments({ eventId: e._id, status: 'confirmed' })
    })));
    res.json(withBookings);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── PATCH /api/admin/events/:id  — update title, status, link etc ── */
router.patch('/events/:id', auth.adminOnly, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/admin/events/:id/bookings  — names/emails only, NO journal data ── */
router.get('/events/:id/bookings', auth.adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ eventId: req.params.id, status: 'confirmed' })
      .populate('userId', 'name email')   // ← ONLY name + email, never journal data
      .sort({ bookedAt: -1 });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── POST /api/admin/notify-all  — broadcast system message ── */
router.post('/notify-all', auth.adminOnly, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });
    await User.updateMany({ role: 'user' }, { $push: { notifications: { message: message.trim(), type: 'system' } } });
    res.json({ ok: true, message: 'Notification sent to all users.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
