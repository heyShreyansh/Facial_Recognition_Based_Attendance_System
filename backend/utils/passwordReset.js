const crypto = require('crypto');

function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex'); // 64 chars
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

module.exports = { generateResetToken };