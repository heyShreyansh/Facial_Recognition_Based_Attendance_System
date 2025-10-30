const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');

(async () => {
  const username = process.argv[2];
  const email = process.argv[3];
  if (!username || !email) {
    console.error('Usage: node set_teacher_email.js <username> <email>');
    process.exit(2);
  }

  await connectDB();
  try {
    const t = await Teacher.findOne({ username: username.trim() });
    if (!t) {
      console.error('No teacher found with username:', username);
      process.exit(1);
    }
    t.email = email.trim();
    t.emailVerified = true; // assume admin/verified when set by this script
    await t.save();
    console.log('Updated email for', username, 'to', t.email);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
