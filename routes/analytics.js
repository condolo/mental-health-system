'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const Entry  = require('../models/Entry');

/* ── GET /api/analytics/daily ── */
router.get('/daily', auth, async (req, res) => {
  try {
    const last2 = await Entry.find({ userId: req.user.id }).sort({ date: -1 }).limit(2);
    if (!last2.length) return res.json({ type: 'info', insights: ['Complete your first check-in to see daily insights! 🌱'] });
    res.json(dailyInsight(last2[0], last2[1] || null));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ── GET /api/analytics/weekly ── */
router.get('/weekly', auth, async (req, res) => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 7);
    const entries = await Entry.find({ userId: req.user.id, date: { $gte: since }, completed: true }).sort({ date: 1 });
    if (entries.length < 2) return res.json({ type: 'info', message: 'Keep journaling! You need at least 2 days to see your weekly report.', entries: [] });
    res.json(weeklyReport(entries));
  } catch (e) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ════════════════════════════════════════════
   ANALYTICS ENGINE
   ════════════════════════════════════════════ */

function dailyInsight(today, yesterday) {
  const insights  = [];
  let type        = 'positive';
  let suggestion  = null;

  /* Mood change */
  if (today.mood && yesterday?.mood) {
    const diff = (today.mood.score || 5) - (yesterday.mood.score || 5);
    if      (diff >= 2)  insights.push(`Your mood improved significantly today — well done! 🌟`);
    else if (diff === 1) insights.push(`Your mood is slightly better than yesterday 😊`);
    else if (diff <= -2) { insights.push(`Your mood has dipped today. Be extra gentle with yourself 💛`); type = 'concern'; }
  }

  /* Stress change */
  if (today.stressLevel && yesterday?.stressLevel) {
    const diff = today.stressLevel - yesterday.stressLevel;
    if      (diff <= -2) insights.push(`Great job — your stress is noticeably lower today 💪`);
    else if (diff >= 2)  { insights.push(`Stress is higher today. Remember to breathe and take breaks 🌊`); type = 'concern'; }
  }

  /* Self-care improvement */
  if (today.selfcareCount !== undefined && yesterday?.selfcareCount !== undefined) {
    if (today.selfcareCount > yesterday.selfcareCount)
      insights.push(`You took better care of yourself today than yesterday 🌿`);
  }

  if (!insights.length) insights.push(`You showed up for yourself today — that means everything 💚`);

  /* Suggestions */
  if (today.stressLevel >= 8) {
    suggestion = { text: 'Your stress is very high. Speaking with the therapist could help greatly — check upcoming sessions.', action: 'view-events', urgent: true };
    type = 'warning';
  } else if (today.mood?.score <= 3) {
    suggestion = { text: 'You\'re going through a tough time. You deserve support — consider booking a therapy session.', action: 'view-events', urgent: false };
    type = 'concern';
  } else if (today.selfcareCount < 2) {
    suggestion = { text: 'Try adding just one more self-care habit tomorrow — even a glass of water counts 💧', action: null };
  }

  return { type, insights, suggestion, date: today.dateString };
}

function weeklyReport(entries) {
  const moodScores  = entries.filter(e => e.mood?.score).map(e => e.mood.score);
  const stressLvls  = entries.filter(e => e.stressLevel).map(e => e.stressLevel);
  const scScores    = entries.filter(e => e.selfcareCount !== undefined).map(e => e.selfcareCount);

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length * 10) / 10 : null;
  const avgMood     = avg(moodScores);
  const avgStress   = avg(stressLvls);
  const avgSelfcare = avg(scScores);

  /* Trend: compare first half to second half */
  let moodTrend = 'stable';
  if (moodScores.length >= 4) {
    const mid  = Math.floor(moodScores.length / 2);
    const fAvg = avg(moodScores.slice(0, mid));
    const sAvg = avg(moodScores.slice(mid));
    if (sAvg - fAvg >= 1)     moodTrend = 'improving';
    else if (fAvg - sAvg >= 1) moodTrend = 'declining';
  }

  /* Dominant mood */
  const freq  = entries.filter(e => e.mood).reduce((acc, e) => { acc[e.mood.label] = (acc[e.mood.label] || 0) + 1; return acc; }, {});
  const dominantMood = Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Varied';

  /* Generate suggestions & alert level */
  const suggestions  = [];
  let alertLevel     = 'green';
  let recommendTherapist = false;

  if (avgStress !== null && avgStress >= 7) {
    suggestions.push('⚠️ Your average stress has been high this week. Consistent high stress affects both mental and physical health. Please consider speaking with the therapist.');
    alertLevel = 'red'; recommendTherapist = true;
  } else if (avgStress !== null && avgStress >= 5) {
    suggestions.push('Your stress is moderate. Try daily 4-7-8 breathing and make sure you\'re getting at least 7 hours of sleep.');
    if (alertLevel === 'green') alertLevel = 'yellow';
  }

  if (avgMood !== null && avgMood <= 4) {
    suggestions.push('💙 Your mood has been consistently low this week. You deserve support — please consider booking a therapy session or attending one of our upcoming talks.');
    alertLevel = 'red'; recommendTherapist = true;
  } else if (avgMood !== null && avgMood <= 6) {
    suggestions.push('Your mood has been mixed this week. Identify one thing that genuinely brings you joy and make space for it daily.');
    if (alertLevel === 'green') alertLevel = 'yellow';
  }

  if (avgSelfcare !== null && avgSelfcare < 3) {
    suggestions.push('Your self-care score is low. Start with the basics: water, sleep, and a 10-minute walk can change your entire day.');
    if (alertLevel === 'green') alertLevel = 'yellow';
  }

  if (moodTrend === 'improving')  suggestions.push('🌱 Your mood is trending upward this week — keep doing what\'s working!');
  if (entries.length >= 7)         suggestions.push('🔥 7-day streak! You are building a powerful habit of self-awareness.');
  if (!suggestions.length)         suggestions.push('You\'re doing wonderfully! Keep showing up for yourself every single day 💚');

  /* Chart data for frontend */
  const chartData = entries.map(e => ({
    date:          e.dateString,
    moodScore:     e.mood?.score    ?? null,
    stressLevel:   e.stressLevel    ?? null,
    selfcareCount: e.selfcareCount  ?? 0,
    dayWord:       e.dayWord        ?? ''
  }));

  return {
    period:            `${entries[0].dateString} → ${entries[entries.length-1].dateString}`,
    totalEntries:      entries.length,
    avgMood,
    avgStress,
    avgSelfcare,
    moodTrend,
    dominantMood,
    suggestions,
    alertLevel,
    recommendTherapist,
    chartData
  };
}

module.exports = router;
