const mongoose = require('mongoose');

function genCode () {
  return 'SES-' + Math.random().toString(36).toUpperCase().slice(2, 10);
}

const sessionSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  availabilityId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true },
  status:           { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  type:             { type: String, enum: ['online', 'in-person'], required: true },
  confirmationCode: { type: String, unique: true },
  notes:            { type: String, default: '', maxlength: 1000 },   // admin-only private notes
  meetingLink:      { type: String, default: '' },
  bookedAt:         { type: Date, default: Date.now }
});

sessionSchema.pre('save', function (next) {
  if (!this.confirmationCode) this.confirmationCode = genCode();
  next();
});

module.exports = mongoose.model('Session', sessionSchema);
