const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  date:       { type: String, required: true },          // 'YYYY-MM-DD'
  startTime:  { type: String, required: true },          // 'HH:MM' 24h
  endTime:    { type: String, required: true },
  duration:   { type: Number, default: 60 },             // minutes
  type:       { type: String, enum: ['online', 'in-person', 'both'], default: 'both' },
  location:   { type: String, default: '' },             // address / room for in-person
  meetingLink:{ type: String, default: '' },             // pre-set Zoom / Teams link
  isBooked:   { type: Boolean, default: false, index: true },
  bookedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:  { type: Date, default: Date.now }
});

// Only future, unbooked slots returned by default queries
availabilitySchema.index({ date: 1, startTime: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
