// Debug script: replicate teacherRoutes attendance merge logic and print normalized attendance
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const Attendance = require('../models/Attendance');
const Class = require('../models/class');
const Student = require('../models/Student');

async function run(classId, dateStr) {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set'); process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  // parse date
  let startOfDay, nextDay;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y,m,d] = dateStr.split('-').map(Number);
    startOfDay = new Date(y, m-1, d, 0,0,0);
    nextDay = new Date(y, m-1, d+1, 0,0,0);
  } else {
    startOfDay = new Date(dateStr); startOfDay.setHours(0,0,0,0);
    nextDay = new Date(startOfDay); nextDay.setDate(nextDay.getDate()+1);
  }

  const teacherRecords = await Attendance.find({ class: new mongoose.Types.ObjectId(classId), date: { $gte: startOfDay, $lt: nextDay } }).populate('student').lean();
  const mergedByStudent = new Map();
  teacherRecords.forEach(r => {
    const sid = r.student && r.student._id ? String(r.student._id) : String(r.student || (r.studentId || r._id));
    r._source = 'teacher';
    mergedByStudent.set(sid, r);
  });

  // class students
  let classStudents = [];
  try { const classDoc = await Class.findById(classId).populate('students').lean(); if (classDoc && Array.isArray(classDoc.students)) classStudents = classDoc.students; } catch(e) {}
  const classStudentIds = new Set(classStudents.map(s => String(s._id)));
  const nameToId = new Map(); classStudents.forEach(s => nameToId.set(((s.firstName||'')+' '+(s.lastName||'')).trim().toLowerCase(), String(s._id)));
  const rollToId = new Map(); classStudents.forEach(s => { if (s.rollNo) rollToId.set(String(s.rollNo), String(s._id)); });

  // global maps
  const globalRollToId = new Map(); const globalNameToId = new Map();
  try { const allStudents = await Student.find({}).select('rollNo firstName lastName').lean(); allStudents.forEach(s=>{ if (s.rollNo) globalRollToId.set(String(s.rollNo), String(s._id)); const fullname = (((s.firstName||'')+' '+(s.lastName||'')).trim().toLowerCase()); if (fullname) globalNameToId.set(fullname, String(s._id)); }); } catch(e) {}

  // raw docs
  const rawColl = mongoose.connection.db.collection('attendance');
  const rawQuery = { $or: [ { date: { $gte: startOfDay, $lt: nextDay } }, { date: dateStr } ] };
  const rawDocs = await rawColl.find(rawQuery).toArray();

  rawDocs.forEach(d => {
    const sid = d.student ? String(d.student) : (d.studentId ? String(d.studentId) : null);
    const rawNameRaw = (d.name || d.studentName || ((d.studentFirstName || '') + ' ' + (d.studentLastName || ''))).trim();
    const rawName = rawNameRaw.replace(/\s+/g, ' ').toLowerCase();
    const rollNo = d.rollNo || d.roll_number || d.roll;

    const classMatches = d.class && (String(d.class) === String(classId) || (String(d.class) === (classStudents.length ? (classStudents[0].class || '') : '')));
    const studentMatches = sid ? classStudentIds.has(sid) : (rawName && (nameToId.has(rawName) || globalNameToId.has(rawName))) || (rollNo && (rollToId.has(String(rollNo)) || globalRollToId.has(String(rollNo))));
    if (!classMatches && !studentMatches) return;

    const effectiveSid = sid || (rollNo && (rollToId.get(String(rollNo)) || globalRollToId.get(String(rollNo)))) || (rawName && (nameToId.get(rawName) || globalNameToId.get(rawName))) || String(d.student || d._id);

    let fn = ''; let ln = '';
    if (rawNameRaw) { const parts = rawNameRaw.replace(/\s+/g,' ').trim().split(' '); fn = parts[0]||''; ln = parts.slice(1).join(' ')||''; }

    const normalizedStudentField = (() => { if (effectiveSid && mongoose.Types.ObjectId.isValid(effectiveSid)) return new mongoose.Types.ObjectId(effectiveSid); if (sid && mongoose.Types.ObjectId.isValid(sid)) return new mongoose.Types.ObjectId(sid); return null; })();

    const rawNormalized = {
      _id: d._id,
      student: normalizedStudentField,
      studentFirstName: d.studentFirstName || d.firstName || fn || '',
      studentLastName: d.studentLastName || d.lastName || ln || '',
      class: d.class,
      date: d.date,
      status: d.status || 'Present',
      rollNo: d.rollNo || d.roll_number || d.roll || null,
      name: d.name || d.studentName || ((d.studentFirstName || '') + ' ' + (d.studentLastName || '')).trim(),
      time: d.time || d.timestamp || null,
      _source: 'raw-attendance'
    };

    if (!mergedByStudent.has(effectiveSid)) mergedByStudent.set(effectiveSid, rawNormalized);
  });

  const attendanceRecords = Array.from(mergedByStudent.values());
  const normalized = attendanceRecords.map(r => {
    const out = { ...r };
    try { if (out._id && typeof out._id !== 'string') out._id = String(out._id); } catch(e){}
    try { if (out.student && typeof out.student === 'object') { if (out.student._id) out.student = String(out.student._id); else out.student = String(out.student); } else if (out.student) out.student = String(out.student); else out.student = null; } catch(e){ out.student = null; }
    try { if (out.class && typeof out.class !== 'string') out.class = String(out.class); } catch(e){}
    out.studentFirstName = out.studentFirstName || out.firstName || '';
    out.studentLastName = out.studentLastName || out.lastName || '';
    out.name = out.name || out.studentName || `${out.studentFirstName} ${out.studentLastName}`.trim();
    out.rollNo = out.rollNo || out.roll_number || out.roll || null;
    return out;
  });

  console.log('Final merged attendance records:');
  normalized.forEach(r => console.log(JSON.stringify(r)));

  await mongoose.disconnect();
}

if (require.main === module) {
  const classId = process.argv[2];
  const date = process.argv[3] || new Date().toISOString().slice(0,10);
  if (!classId) { console.error('Usage: node debug_merge_attendance.js <classId> [YYYY-MM-DD]'); process.exit(1); }
  run(classId, date).catch(err => { console.error(err); process.exit(1); });
}
