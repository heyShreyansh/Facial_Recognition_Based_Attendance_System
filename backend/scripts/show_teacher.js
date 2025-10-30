require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const username = process.argv[2] || 'admin';
  const t = await Teacher.findOne({ username }).lean();
  console.log('Teacher record for', username, '=>');
  console.log(t ? JSON.stringify(t, null, 2) : 'NOT FOUND');
  await mongoose.disconnect();
}
run().catch(err => { console.error(err); process.exit(1); });