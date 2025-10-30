// Quick script to list attendance docs from both sources for a given classId and date
const mongoose = require('mongoose');
const path = require('path');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function run(classId, dateStr) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0,0,0,0);
  const nextDay = new Date(startOfDay);
  nextDay.setDate(nextDay.getDate()+1);

  console.log('Inspecting attendance for class:', classId, 'date:', dateStr);
  const teacherRecords = await Attendance.find({
    class: new mongoose.Types.ObjectId(classId),
    date: { $gte: startOfDay, $lt: nextDay }
  }).populate('student').lean();

  console.log('\nTeacher-marked attendance (attendances collection):');
  teacherRecords.forEach(r => {
    const sid = r.student?._id || r.student;
    console.log('-', r._id.toString(), 'student:', sid, r.student?._id ? `${r.student.firstName} ${r.student.lastName}` : '', 'status:', r.status, 'date:', r.date, 'source: teacher');
  });

  const rawColl = mongoose.connection.db.collection('attendance');
  const rawQuery = {
    $or: [
      { date: { $gte: startOfDay, $lt: nextDay } },
      { date: dateStr }
    ]
  };
  const rawDocs = await rawColl.find(rawQuery).toArray();

  console.log('\nRaw attendance collection (attendance):');
  rawDocs.forEach(d => {
    console.log('-', d._id.toString(), 'rollNo:', d.rollNo || d.roll_number || '', 'name:', d.name || d.studentName || '', 'student:', d.student || d.studentId || '', 'status:', d.status || 'Present', 'date:', d.date, 'rawDocKeys:', Object.keys(d).join(','));
  });

  // Check for Kuldeep specifically
  const kuldeepTeacher = teacherRecords.find(r => r.student && (r.student.firstName && r.student.firstName.toLowerCase().includes('kuldeep') || r.student.lastName && r.student.lastName.toLowerCase().includes('kuldeep')));
  const kuldeepRaw = rawDocs.find(d => (d.studentName && d.studentName.toLowerCase().includes('kuldeep')) || (d.name && d.name.toLowerCase().includes('kuldeep')) || (d.student && String(d.student).toLowerCase().includes('kuldeep')));

  console.log('\nKuldeep presence check:');
  console.log(' teacher-record:', !!kuldeepTeacher, kuldeepTeacher ? `${kuldeepTeacher.student.firstName} ${kuldeepTeacher.student.lastName}` : '');
  console.log(' raw-record:', !!kuldeepRaw, kuldeepRaw ? JSON.stringify(kuldeepRaw).slice(0,200) : '');

  await mongoose.disconnect();
}

if (require.main === module) {
  const classId = process.argv[2];
  const date = process.argv[3] || new Date().toISOString().slice(0,10);
  if (!classId) {
    console.error('Usage: node inspect_attendance.js <classId> [YYYY-MM-DD]');
    process.exit(1);
  }
  run(classId, date).catch(err => { console.error(err); process.exit(1); });
}
