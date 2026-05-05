const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender:    { type: String, enum: ['user', 'admin'], required: true },
  content:   { type: String, required: true, maxlength: 2000, trim: true },
  read:      { type: Boolean, default: false },
  sentAt:    { type: Date, default: Date.now }
});

// Index for efficient conversation fetching
messageSchema.index({ userId: 1, sentAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
