'use strict';
const mongoose = require('mongoose');

/* Mood index → numeric wellness score (1–10) */
const MOOD_SCORES = [10, 9, 9, 8, 6, 5, 2, 2, 3, 4];

const entrySchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:         { type: Date,   default: Date.now },
  dateString:   { type: String },   // YYYY-MM-DD — easy daily lookup

  /* Mood */
  mood:         { idx: Number, emoji: String, label: String, score: Number },
  moodNote:     String,

  /* Gratitude */
  gratitude:    [String],

  /* Affirmations */
  affirmations: [String],
  customAffirm: String,

  /* Self-care */
  selfcare:       [{ emoji: String, label: String, custom: Boolean }],
  selfcareCount:  { type: Number, default: 0 },
  scOther:        String,

  /* Stress & coping */
  stressLevel:    { type: Number, min: 1, max: 10 },
  stressSource:   String,
  copingMethods:  [String],
  copingNote:     String,
  afterCoping:    String,

  /* Reflection */
  keyLesson:      String,
  intention:      String,
  dayWord:        String,

  completed:      { type: Boolean, default: false },
  completedAt:    Date,

  /* Composite score (1–10) — computed pre-save */
  overallScore:   Number,

  createdAt:      { type: Date, default: Date.now }
});

/* Compute dateString + overallScore before every save */
entrySchema.pre('save', function (next) {
  if (!this.dateString) {
    const d = new Date(this.date);
    this.dateString = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  if (this.mood?.idx !== undefined) this.mood.score = MOOD_SCORES[this.mood.idx] ?? 5;

  const moodScore     = this.mood?.score   ?? 5;
  const stressScore   = this.stressLevel   ? 11 - this.stressLevel : 5;
  const selfcareScore = this.selfcareCount ? Math.round((this.selfcareCount / 10) * 10) : 0;
  this.overallScore   = Math.round((moodScore + stressScore + selfcareScore) / 3);

  next();
});

module.exports = mongoose.model('Entry', entrySchema);
