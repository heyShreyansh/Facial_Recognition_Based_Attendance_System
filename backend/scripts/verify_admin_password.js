require('dotenv').config();
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');

async function run() {
  await connectDB();
  const [username, candidate] = process.argv.slice(2);
  if (!username || !candidate) {
    console.error('Usage: node verify_admin_password.js <username> <passwordToTest>');
    process.exit(1);
  }
  const t = await Teacher.findOne({ username: username.toLowerCase() }).lean();
  if (!t) {
    console.log('Teacher not found:', username);
    process.exit(0);
  }
  console.log('username:', t.username);
  console.log('email:', t.email);
  console.log('updatedAt:', t.updatedAt);
  console.log('passwordChangedAt:', t.passwordChangedAt);
  console.log('passwordHash (first 20 chars):', t.password ? t.password.slice(0,20) + '...' : '(no hash)');
  const ok = await bcrypt.compare(candidate, t.password);
  console.log('password match for provided candidate:', ok);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });