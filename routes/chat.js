'use strict';
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const Message = require('../models/Message');
const User    = require('../models/User');

// ── USER: get my chat history (last 100 messages) ────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.id })
      .sort({ sentAt: 1 })
      .limit(100)
      .select('sender content read sentAt');

    // Mark admin messages as read
    await Message.updateMany(
      { userId: req.user.id, sender: 'admin', read: false },
      { $set: { read: true } }
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load messages' });
  }
});

// ── USER: send a message ──────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
    if (content.trim().length > 2000) return res.status(400).json({ error: 'Message too long (max 2000 chars)' });

    const msg = await Message.create({
      userId:  req.user.id,
      sender:  'user',
      content: content.trim()
    });

    // Update lastActive
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send message' });
  }
});

// ── USER: unread count (for badge polling) ────────────────────────────────
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      userId: req.user.id,
      sender: 'admin',
      read:   false
    });
    res.json({ unread: count });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch count' });
  }
});

// ── ADMIN: list all conversations (one entry per user) ────────────────────
router.get('/admin/conversations', auth.adminOnly, async (req, res) => {
  try {
    // Get distinct userIds that have messages
    const userIds = await Message.distinct('userId');

    // For each userId, get latest message + unread count (unread = user messages admin hasn't replied to)
    const convos = await Promise.all(userIds.map(async (uid) => {
      const latest = await Message.findOne({ userId: uid }).sort({ sentAt: -1 });
      const unread = await Message.countDocuments({ userId: uid, sender: 'user', read: false });
      const user   = await User.findById(uid).select('name email');
      return {
        userId:    uid,
        userName:  user ? user.name  : 'Deleted User',
        userEmail: user ? user.email : '',
        latestMessage: latest ? latest.content.slice(0, 80) : '',
        latestAt:  latest ? latest.sentAt : null,
        unread
      };
    }));

    // Sort by latest message descending
    convos.sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

    res.json({ conversations: convos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load conversations' });
  }
});

// ── ADMIN: get full conversation with a specific user ─────────────────────
router.get('/admin/conversations/:userId', auth.adminOnly, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.params.userId })
      .sort({ sentAt: 1 })
      .limit(200)
      .select('sender content read sentAt');

    // Mark user messages as read (admin viewed them)
    await Message.updateMany(
      { userId: req.params.userId, sender: 'user', read: false },
      { $set: { read: true } }
    );

    const user = await User.findById(req.params.userId).select('name email');

    res.json({
      messages,
      user: user ? { name: user.name, email: user.email } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load conversation' });
  }
});

// ── ADMIN: reply to a user ────────────────────────────────────────────────
router.post('/admin/conversations/:userId', auth.adminOnly, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
    if (content.trim().length > 2000) return res.status(400).json({ error: 'Message too long' });

    // Verify user exists
    const user = await User.findById(req.params.userId).select('_id name notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const msg = await Message.create({
      userId:  req.params.userId,
      sender:  'admin',
      content: content.trim()
    });

    // Push a notification to user
    user.notifications.push({
      message: `💬 New message from your therapist`,
      type:    'system'
    });
    await user.save();

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send reply' });
  }
});

// ── ADMIN: total unread (user messages) count ─────────────────────────────
router.get('/admin/unread', auth.adminOnly, async (req, res) => {
  try {
    const count = await Message.countDocuments({ sender: 'user', read: false });
    res.json({ unread: count });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch count' });
  }
});

module.exports = router;
