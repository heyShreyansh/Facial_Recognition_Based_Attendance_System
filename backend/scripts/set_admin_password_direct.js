const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');

async function run() {
  await connectDB();
  const [username, newPassword, email] = process.argv.slice(2);
  if (!username || !newPassword) {
    console.error('Usage: node set_admin_password_direct.js <username> <newPassword> [email]');
    process.exit(1);
  }
  const normalized = (username || '').toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);

  const res = await Teacher.updateOne(
    { username: normalized },
    { $set: { password: hashed, passwordChangedAt: new Date(), ...(email ? { email } : {}) } },
    { upsert: true }
  );
  console.log('updateOne result:', res);
  console.log(`Password for "${normalized}" set (hashed) — login with the plain password you provided.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });