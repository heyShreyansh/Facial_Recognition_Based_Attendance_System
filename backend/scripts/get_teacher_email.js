const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');

(async () => {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: node get_teacher_email.js <username>');
    process.exit(2);
  }

  await connectDB();
  try {
    const t = await Teacher.findOne({ username: username.trim() }).select('username email firstName lastName');
    if (!t) {
      console.error('No teacher found with username:', username);
      process.exit(1);
    }
    console.log(`username: ${t.username}`);
    console.log(`name: ${t.firstName || ''} ${t.lastName || ''}`.trim());
    console.log(`email: ${t.email || '<no email set>'}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
