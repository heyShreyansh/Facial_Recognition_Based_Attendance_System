const express = require('express');
const crypto = require('crypto');
const Teacher = require('../models/Teacher');
// adjust this import if your mail helper path/name is different
const sendResetEmail = require('../utils/sendResetEmail');

const router = express.Router();

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function createResetTokenForUser(user) {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = sha256Hex(raw);
  user.resetPasswordTokenHash = hash;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save();
  return raw;
}

// POST /api/admin/request-reset
router.post('/request-reset', async (req, res) => {
  try {
    const { username } = req.body || {};
    // generic response to avoid account enumeration
    if (!username) {
      return res.json({ message: 'If an account with that username/email exists, a reset email has been sent.' });
    }

    const user = await Teacher.findOne({ $or: [{ username }, { email: username }] });
    if (!user) {
      return res.json({ message: 'If an account with that username/email exists, a reset email has been sent.' });
    }

    const token = await createResetTokenForUser(user);
    // use FRONTEND_BASE_URL if present, fall back to localhost:5173 (your dev frontend)
    const frontendBase = (process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetLink = `${frontendBase}/admin/reset-password?token=${token}&username=${encodeURIComponent(user.username)}`;

    try {
      await sendResetEmail(user.email, resetLink);
    } catch (e) {
      console.error('sendResetEmail failed:', e);
    }

    if (process.env.DEV_ALLOW_RESET_LINK === 'true') {
      console.log('[DEV] reset link for', user.username, resetLink);
    }

    return res.json({ message: 'If an account with that username/email exists, a reset email has been sent.' });
  } catch (err) {
    console.error('request-reset error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params || {};
    const { password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: 'Missing token or password' });

    const tokenHash = sha256Hex(token);
    const user = await Teacher.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    // set password; rely on model pre-save hook to hash if present
    user.password = password;
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;