const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../models/class');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const c = await Class.findOne().lean();
  if (!c) {
    console.log('no class found');
  } else {
    console.log('classId:', c._id.toString(), 'name:', c.name || c.title || '');
  }
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
