const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ResetAudit = require('../models/ResetAudit');

dotenv.config();
const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function dump(username) {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const docs = await ResetAudit.find({ username }).sort({ createdAt: -1 }).limit(20).lean();
  console.log(`Found ${docs.length} ResetAudit entries for ${username}`);
  docs.forEach(d => {
    console.log('---');
    console.log('id:', d._id);
    console.log('event:', d.event);
    console.log('createdAt:', d.createdAt);
    console.log('meta:', d.meta);
  });
  await mongoose.disconnect();
}

const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
dump(username).catch(e => { console.error(e); process.exit(1); });
