'use strict';
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  eventId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status:           { type: String, enum: ['confirmed','cancelled'], default: 'confirmed' },
  appliedDiscount:  { type: Boolean, default: false },
  discountCode:     { type: String,  default: null },
  finalPrice:       { type: Number,  default: 0 },
  confirmationCode: { type: String },
  bookedAt:         { type: Date, default: Date.now }
});

/* Generate unique confirmation code pre-save */
bookingSchema.pre('save', function (next) {
  if (!this.confirmationCode) {
    this.confirmationCode = 'JTW-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

/* Prevent duplicate bookings */
bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
