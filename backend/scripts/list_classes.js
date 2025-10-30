// Lists classes from MongoDB so we can pick a classId for inspection
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Class = require('../models/class');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    const classes = await Class.find({}).lean();
    if (!classes || classes.length === 0) {
      console.log('No classes found');
    } else {
      console.log(`Found ${classes.length} classes:`);
      classes.forEach(c => {
        const studentCount = Array.isArray(c.students) ? c.students.length : 0;
        console.log('-', String(c._id), '|', c.name || '<no-name>', '| teacher:', String(c.teacher || '') , '| students:', studentCount);
      });
    }
  } catch (e) {
    console.error('Error listing classes:', e.message || e);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
