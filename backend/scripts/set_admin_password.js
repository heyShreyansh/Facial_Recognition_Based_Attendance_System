require('dotenv').config();
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');

async function run() {
  await connectDB();
  const [username, newPassword, email] = process.argv.slice(2);
  if (!username || !newPassword) {
    console.error('Usage: node set_admin_password.js <username> <newPassword> [email]');
    process.exit(1);
  }

  const normalized = (username || '').toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(newPassword, salt);

  let teacher = await Teacher.findOne({ username: normalized });
  if (teacher) {
    teacher.password = hashed;
    teacher.passwordChangedAt = new Date();
    if (email) teacher.email = email;
    await teacher.save();
    console.log('Updated password for', normalized);
  } else {
    teacher = new Teacher({
      username: normalized,
      password: hashed,
      firstName: 'Admin',
      lastName: 'User',
      email: email || `${normalized}@example.com`,
      emailVerified: true,
    });
    await teacher.save();
    console.log('Created admin user', normalized);
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });