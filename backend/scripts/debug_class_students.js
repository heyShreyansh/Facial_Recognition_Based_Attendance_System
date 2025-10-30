require('dotenv').config();
const connectDB = require('../config/db'); // adjust if your DB connect helper is at a different path
const mongoose = require('mongoose');

async function run() {
  await connectDB();
  const classId = process.argv[2];
  if (!classId) {
    console.error('Usage: node debug_class_students.js <classId>');
    process.exit(1);
  }
  try {
    console.log('Connected. classId=', classId);
    const db = mongoose.connection.db;

    // fetch class doc
    let cls = null;
    try {
      const q = mongoose.Types.ObjectId.isValid(classId) ? { _id: new mongoose.Types.ObjectId(classId) } : { _id: classId };
      cls = await db.collection('classes').findOne(q);
      console.log('Class document:', cls ? { _id: cls._id, name: cls.name, code: cls.code, branch: cls.branch, studentsCount: (cls.students || []).length } : 'NOT FOUND');
    } catch (e) {
      console.error('Class lookup error:', e);
    }

    // try several student queries
    const StudentColl = db.collection('students');
    const idObj = mongoose.Types.ObjectId.isValid(classId) ? new mongoose.Types.ObjectId(classId) : classId;

    const queries = [
      { description: 'students with assignedClass == id', q: { assignedClass: idObj } },
      { description: 'students with classId == id', q: { classId: idObj } },
      { description: 'students with classes array contains id', q: { classes: idObj } },
      { description: 'students with assignedClasses array contains id', q: { assignedClasses: idObj } },
      { description: 'students with branch == class.branch (if class present)', q: cls && cls.branch ? { branch: cls.branch } : null },
      { description: 'students where branch regex matches class.branch', q: cls && cls.branch ? { branch: { $regex: cls.branch, $options: 'i' } } : null },
      { description: 'students with classId as string', q: { classId: String(classId) } },
    ].filter(x => x && x.q);

    for (const item of queries) {
      try {
        const list = await StudentColl.find(item.q).limit(10).toArray();
        console.log(`Query: ${item.description} → ${list.length} hit(s). Example ids:`, list.slice(0,5).map(s => ({ _id: s._id, username: s.username, branch: s.branch })));
      } catch (e) {
        console.error('Query error for', item.description, e && e.message);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err && err.stack ? err.stack : err);
  } finally {
    mongoose.disconnect();
  }
}

run();