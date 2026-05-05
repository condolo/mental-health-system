'use strict';
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const Event   = require('../models/Event');
const Booking = require('../models/Booking');
const User    = require('../models/User');

/* ── GET /api/events  — all upcoming/live events ── */
router.get('/', auth, async (req, res) => {
  try {
    const events   = await Event.find({ status: { $in: ['upcoming','live'] } }).sort({ eventDate: 1 });
    const bookings = await Booking.find({ userId: req.user.id, status: 'confirmed' });
    const bookedIds = new Set(bookings.map(b => b.eventId.toString()));

    const user = await User.findById(req.user.id).select('isActive discountCode');

    const result = events.map(e => ({
      ...e.toObject(),
      isBooked:   bookedIds.has(e._id.toString()),
      spotsLeft:  Math.max(0, e.capacity - e.bookedCount),
      myDiscount: user.isActive && e.type === 'premium'
        ? { percent: e.discountPercent, price: e.discountedPrice, code: user.discountCode }
        : null
    }));

    res.json(result);
  } catch (e) {
    console.error('GET /events', e.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── POST /api/events/:id/book ── */
router.post('/:id/book', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)                              return res.status(404).json({ error: 'Event not found.' });
    if (event.status === 'cancelled')        return res.status(400).json({ error: 'This event has been cancelled.' });
    if (event.bookedCount >= event.capacity) return res.status(400).json({ error: 'This event is fully booked.' });

    const existing = await Booking.findOne({ userId: req.user.id, eventId: event._id });
    if (existing) return res.status(409).json({ error: 'You have already booked this event.' });

    const user    = await User.findById(req.user.id).select('isActive discountCode');
    const applyDiscount = user.isActive && event.type === 'premium';
    const finalPrice    = applyDiscount
      ? (event.discountedPrice || Math.round(event.price * (1 - event.discountPercent / 100)))
      : event.price;

    const booking = await new Booking({
      userId:          req.user.id,
      eventId:         event._id,
      appliedDiscount: applyDiscount,
      discountCode:    applyDiscount ? user.discountCode : null,
      finalPrice
    }).save();

    await Event.findByIdAndUpdate(event._id, { $inc: { bookedCount: 1 } });

    /* Add confirmation notification to user */
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        notifications: {
          message: `✅ Booking confirmed for "${event.title}" on ${new Date(event.eventDate).toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric' })}. Code: ${booking.confirmationCode}`,
          eventId: event._id,
          type: 'event'
        }
      }
    });

    res.status(201).json({
      booking,
      confirmationCode: booking.confirmationCode,
      savedAmount:      applyDiscount ? event.price - finalPrice : 0,
      message:          applyDiscount
        ? `Booked! Your active-user discount saved you $${(event.price - finalPrice).toFixed(2)} 🎉`
        : 'Booking confirmed!'
    });
  } catch (e) {
    console.error('POST /events/:id/book', e.message);
    res.status(500).json({ error: 'Could not complete booking.' });
  }
});

/* ── DELETE /api/events/:id/book  — cancel booking ── */
router.delete('/:id/book', auth, async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ userId: req.user.id, eventId: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    await Event.findByIdAndUpdate(req.params.id, { $inc: { bookedCount: -1 } });
    res.json({ message: 'Booking cancelled successfully.' });
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/events/my-bookings ── */
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id, status: 'confirmed' })
      .populate('eventId')
      .sort({ bookedAt: -1 });
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
