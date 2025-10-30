const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teacher = require('../models/Teacher');

dotenv.config();
const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function dump(username) {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const t = await Teacher.findOne({ username }).lean();
  if (!t) {
    console.log('Teacher not found for username:', username);
  } else {
    // don't print password hash
    const safe = { ...t };
    delete safe.password;
    console.log('Teacher:', safe);
  }
  await mongoose.disconnect();
}

const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
dump(username).catch(e => { console.error(e); process.exit(1); });
