const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Student = require('../models/Student');

async function run(query) {
  if (!process.env.MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    let student = null;
    if (/^[0-9a-fA-F]{24}$/.test(query)) {
      student = await Student.findById(query).lean();
    } else {
      student = await Student.findOne({ rollNo: query }).lean();
    }
    console.log(JSON.stringify(student, null, 2));
  } catch (e) { console.error(e); }
  await mongoose.disconnect();
}

if (require.main === module) {
  const q = process.argv[2];
  if (!q) { console.error('Usage: node get_student.js <rollNo|_id>'); process.exit(1); }
  run(q).catch(e => { console.error(e); process.exit(1); });
}
