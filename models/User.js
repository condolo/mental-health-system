'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const notifSchema = new mongoose.Schema({
  message:   { type: String, required: true },
  eventId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  type:      { type: String, enum: ['event','insight','achievement','system'], default: 'system' },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date,    default: Date.now }
});

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:         { type: String, required: true, minlength: 6 },
  role:             { type: String, enum: ['user','admin'], default: 'user' },
  isActive:         { type: Boolean, default: false },          // true when 10+ completed entries
  entryCount:       { type: Number,  default: 0 },
  discountCode:     { type: String,  default: null },           // auto-generated for active users
  notifications:    [notifSchema],
  lastActive:       { type: Date,    default: Date.now },
  createdAt:        { type: Date,    default: Date.now },

  // ── Therapist public profile (admin only fields) ──────────────────────
  profileTitle:           { type: String, default: '' },   // e.g. "Licensed Clinical Psychologist"
  profileBio:             { type: String, default: '' },
  profileSpecializations: [String],                        // e.g. ["Anxiety","Trauma","CBT"]
  profileLanguages:       [String],                        // e.g. ["English","Swahili"]
  profilePhotoUrl:        { type: String, default: '' },
  profileLocation:        { type: String, default: '' },   // city / clinic address
  profilePublicEmail:     { type: String, default: '' },   // displayed to users (can differ from login)
  profilePublic:          { type: Boolean, default: false } // must be true for profile to show
});

/* Hash password on save */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* Compare plain password to hash */
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/* Generate unique discount code */
userSchema.methods.generateDiscountCode = function () {
  this.discountCode = 'ACTIVE-' + this._id.toString().slice(-6).toUpperCase();
  return this.discountCode;
};

/* Promote to active if 10+ entries (called after each completed entry) */
userSchema.methods.checkAndPromote = async function () {
  if (!this.isActive && this.entryCount >= 10) {
    this.isActive = true;
    this.generateDiscountCode();
    // Achievement notification
    this.notifications.push({
      message: '🏆 You are now an Active Member! You have unlocked a discount on all premium sessions.',
      type: 'achievement'
    });
    await this.save();
  }
};

module.exports = mongoose.model('User', userSchema);
