'use strict';
const router       = require('express').Router();
const auth         = require('../middleware/auth');
const Availability = require('../models/Availability');
const Session      = require('../models/Session');
const User         = require('../models/User');

// ── USER: list available (unbooked, future) slots ─────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const slots = await Availability.find({
      isBooked: false,
      date: { $gte: today }
    })
      .sort({ date: 1, startTime: 1 })
      .select('-createdBy -bookedBy');

    // Group by date for easier frontend rendering
    const grouped = {};
    slots.forEach(s => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });

    res.json({ grouped, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load availability' });
  }
});

// ── USER: book a session slot ─────────────────────────────────────────────
router.post('/:id/book', auth, async (req, res) => {
  try {
    const slot = await Availability.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.isBooked) return res.status(409).json({ error: 'This slot has just been booked. Please choose another.' });

    const { type } = req.body; // 'online' or 'in-person'
    if (!['online', 'in-person'].includes(type)) return res.status(400).json({ error: 'Invalid session type' });
    if (slot.type !== 'both' && slot.type !== type) {
      return res.status(400).json({ error: `This slot is only available for ${slot.type} sessions` });
    }

    // Check user doesn't already have a confirmed session on this date
    const existing = await Session.findOne({ userId: req.user.id, status: 'confirmed' })
      .populate('availabilityId', 'date');
    if (existing && existing.availabilityId && existing.availabilityId.date === slot.date) {
      return res.status(409).json({ error: 'You already have a session booked on this date' });
    }

    // Mark slot as booked
    slot.isBooked = true;
    slot.bookedBy = req.user.id;
    await slot.save();

    // Create session
    const session = await Session.create({
      userId:         req.user.id,
      availabilityId: slot._id,
      status:         'confirmed',
      type,
      meetingLink:    type === 'online' ? (slot.meetingLink || '') : ''
    });

    // Notify user
    const user = await User.findById(req.user.id);
    user.notifications.push({
      message: `✅ Session confirmed for ${slot.date} at ${slot.startTime}. Code: ${session.confirmationCode}`,
      type: 'event'
    });
    await user.save();

    res.status(201).json({
      session: {
        _id:              session._id,
        confirmationCode: session.confirmationCode,
        type:             session.type,
        meetingLink:      session.meetingLink,
        date:             slot.date,
        startTime:        slot.startTime,
        endTime:          slot.endTime,
        duration:         slot.duration,
        location:         slot.location
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not book session' });
  }
});

// ── USER: cancel a booked session ─────────────────────────────────────────
router.delete('/:sessionId/cancel', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id:    req.params.sessionId,
      userId: req.user.id,
      status: 'confirmed'
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'cancelled';
    await session.save();

    // Free the slot
    await Availability.findByIdAndUpdate(session.availabilityId, {
      isBooked: false,
      bookedBy: null
    });

    res.json({ message: 'Session cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel session' });
  }
});

// ── USER: my sessions ─────────────────────────────────────────────────────
router.get('/my-sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .sort({ bookedAt: -1 })
      .populate('availabilityId', 'date startTime endTime duration type location');

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Could not load sessions' });
  }
});

// ── ADMIN: create availability slot ──────────────────────────────────────
router.post('/admin', auth.adminOnly, async (req, res) => {
  try {
    const { date, startTime, endTime, duration, type, location, meetingLink } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'date, startTime, endTime are required' });

    const slot = await Availability.create({
      date, startTime, endTime,
      duration:    duration    || 60,
      type:        type        || 'both',
      location:    location    || '',
      meetingLink: meetingLink || '',
      createdBy:   req.user.id
    });

    res.status(201).json({ slot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create slot' });
  }
});

// ── ADMIN: get all slots (booked + available) ─────────────────────────────
router.get('/admin', auth.adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const slots = await Availability.find({ date: { $gte: today } })
      .sort({ date: 1, startTime: 1 })
      .populate('bookedBy', 'name');

    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: 'Could not load slots' });
  }
});

// ── ADMIN: delete a slot (only if not booked) ─────────────────────────────
router.delete('/admin/:id', auth.adminOnly, async (req, res) => {
  try {
    const slot = await Availability.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.isBooked) return res.status(409).json({ error: 'Cannot delete a booked slot. Cancel the session first.' });

    await slot.deleteOne();
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete slot' });
  }
});

// ── ADMIN: update session notes / meeting link ────────────────────────────
router.patch('/admin/sessions/:id', auth.adminOnly, async (req, res) => {
  try {
    const { notes, meetingLink, status } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (notes       !== undefined) session.notes       = notes;
    if (meetingLink !== undefined) session.meetingLink = meetingLink;
    if (status      !== undefined && ['confirmed','cancelled','completed'].includes(status)) {
      session.status = status;
      // If cancelled by admin, free the slot
      if (status === 'cancelled') {
        await Availability.findByIdAndUpdate(session.availabilityId, { isBooked: false, bookedBy: null });
        const user = await User.findById(session.userId);
        if (user) {
          user.notifications.push({ message: '❌ Your session has been cancelled by the therapist. Please rebook.', type: 'system' });
          await user.save();
        }
      }
    }
    await session.save();
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: 'Could not update session' });
  }
});

// ── ADMIN: all upcoming sessions ──────────────────────────────────────────
router.get('/admin/sessions', auth.adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sessions = await Session.find({ status: 'confirmed' })
      .populate('userId', 'name email')
      .populate('availabilityId', 'date startTime endTime duration type location')
      .sort({ 'availabilityId.date': 1 });

    // Filter future sessions
    const upcoming = sessions.filter(s => s.availabilityId && s.availabilityId.date >= today);

    res.json({ sessions: upcoming });
  } catch (err) {
    res.status(500).json({ error: 'Could not load sessions' });
  }
});

module.exports = router;
