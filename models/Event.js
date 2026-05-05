'use strict';
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true },
  description:      { type: String, required: true },
  therapistName:    { type: String, required: true },
  eventDate:        { type: Date,   required: true },
  duration:         { type: Number, default: 60 },          // minutes
  type:             { type: String, enum: ['free','premium'], default: 'free' },
  category:         { type: String, enum: ['therapy-session','mental-health-talk','workshop','support-group','meditation','webinar'], default: 'mental-health-talk' },
  price:            { type: Number, default: 0 },
  discountedPrice:  { type: Number, default: 0 },
  discountPercent:  { type: Number, default: 20 },          // % off for active users
  capacity:         { type: Number, default: 100 },
  bookedCount:      { type: Number, default: 0 },
  platform:         { type: String, default: 'Zoom' },
  meetingLink:      { type: String, default: '' },
  imageEmoji:       { type: String, default: '🧠' },        // decorative emoji for card
  status:           { type: String, enum: ['upcoming','live','completed','cancelled'], default: 'upcoming' },
  notificationSent: { type: Boolean, default: false },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:        { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
