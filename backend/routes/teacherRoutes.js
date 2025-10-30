const express = require('express');
const asyncHandler = require('express-async-handler');
const Teacher = require('../models/Teacher');
const Class = require('../models/class');
const Student = require('../models/Student'); // Assuming you have a Student Model
const Attendance = require('../models/Attendance');
const generateToken = require('../utils/generateToken');
const { protect } = require('../models/authMiddleware');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { generateResetToken } = require('../utils/passwordReset');
const sendResetEmail = require('../utils/sendResetEmail');
const ResetAudit = require('../models/ResetAudit');
const { spawn } = require('child_process');
const path = require('path');

// Simple in-memory process handle for the running attendance Python process
let attendanceProcess = null;

// Helper to get python executable from env or fallback. Prefer project venv if present on Windows.
const fs = require('fs');
let PYTHON_BIN = process.env.PYTHON_EXECUTABLE || process.env.PYTHON_PATH || 'python';
// If there's a venv in project root, prefer it (Windows/Mac/Linux)
try {
  const venvWin = path.resolve(__dirname, '..', 'venv', 'Scripts', 'python.exe');
  const venvUnix = path.resolve(__dirname, '..', 'venv', 'bin', 'python');
  if (!process.env.PYTHON_EXECUTABLE) {
    if (fs.existsSync(venvWin)) PYTHON_BIN = venvWin;
    else if (fs.existsSync(venvUnix)) PYTHON_BIN = venvUnix;
  }
} catch (e) {
  // ignore
}

// ➡️ CORRECTED: Initialize the router right after imports ⬅️
const router = express.Router();

// Apply rate limiting middleware for password reset requests
const requestResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6, // allow 6 requests per IP per hour
  message: 'Too many password reset requests, try again later.',
});

// ---------------------------------------------------------------- //
// 1. GET /api/teacher/profile - Protected Route
// ---------------------------------------------------------------- //
router.get('/profile', protect, asyncHandler(async (req, res) => {
    // req.teacher is set by protect middleware
    if (!req.teacher) {
        // This check is often redundant if 'protect' works, but it's a good safety measure.
        return res.status(401).json({ message: 'Not authorized' });
    }
    // Return the teacher object attached by the middleware
    res.json({ teacher: req.teacher });
}));

// ---------------------------------------------------------------- //
// 2. POST /api/teacher/login - Public Route
// ---------------------------------------------------------------- //
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const teacher = await Teacher.findOne({ username });

    if (teacher && (await teacher.matchPassword(password))) {
        res.json({
            _id: teacher._id,
            username: teacher.username,
            name: `${teacher.firstName} ${teacher.lastName}`,
            token: generateToken(teacher._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid username or password');
    }
}));

// ---------------------------------------------------------------- //
// 3. GET /api/teacher/classes - Protected Route
//    (Fetches ONLY classes assigned to the logged-in teacher)
// ---------------------------------------------------------------- //
router.get('/classes', protect, asyncHandler(async (req, res) => {
    // req.teacher is available from the 'protect' middleware
    const teacherId = req.teacher._id;

    // Data Scoping: Find all classes where the 'teacher' field matches the logged-in teacher's ID
    const classes = await Class.find({ teacher: teacherId }).select('name subject semester branch');

    res.json({ classes });
}));

// ---------------------------------------------------------------- //
// 3b. GET /api/teacher/registered-students - Protected Route
//     (Returns all students from the students collection)
// ---------------------------------------------------------------- //
router.get('/registered-students', protect, asyncHandler(async (req, res) => {
  // NOTE: older Student documents may not have `isActive` set; include all documents to be safe.
  // Include branch so frontend can filter by branch when needed.
  const students = await Student.find({}).select('firstName lastName rollNo isActive branch year semester');
  console.log(`registered-students: returning ${students.length} students ->`, students.slice(0,10).map(s => ({ id: s._id, name: s.firstName + ' ' + s.lastName, branch: s.branch, isActive: s.isActive })));

  res.json({ students });
}));

// ---------------------------------------------------------------- //
// 4. GET /api/teacher/class/:classId/students - Protected Route
//    (Fetches students for a specific class, ensuring teacher is assigned)
// ---------------------------------------------------------------- //
router.get('/class/:classId/students', protect, asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.teacher._id;

    // Authorization Check: Find the class AND ensure the logged-in teacher is assigned to it
    // NOTE: If 'students' is an array of student IDs on the Class model, .populate('students') is correct.
    const classData = await Class.findOne({ _id: classId, teacher: teacherId }).populate('students');

    if (!classData) {
        res.status(403);
        throw new Error('Access Denied: Class not found or not assigned to this teacher');
    }

    // Return the list of students (populated)
    res.json({ students: classData.students });
}));

// ---------------------------------------------------------------- //
// 5. POST /api/teacher/attendance - Protected Route
//    (Marks attendance for a student)
// ---------------------------------------------------------------- //
router.post('/attendance', protect, asyncHandler(async (req, res) => {
    const { studentId, classId, date, status } = req.body;
    const teacherId = req.teacher._id;

    // Input Validation
    if (!studentId || !classId || !date || !status || !['Present', 'Absent'].includes(status)) {
        res.status(400);
        throw new Error('Invalid data provided for attendance.');
    }

    // Authorization Check (Crucial): Ensure the teacher is authorized to mark this class
    const classCheck = await Class.findOne({ _id: classId, teacher: teacherId });
    if (!classCheck) {
        res.status(403);
        throw new Error('Access Denied: Cannot mark attendance for an unassigned class.');
    }

    // Convert date to start of day to ensure unique index works correctly
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Fetch student info for name fields
    const studentDoc = await Student.findById(studentId);
    
    if (!studentDoc) {
        res.status(404);
        throw new Error('Student not found.');
    }

    // Always set name fields on upsert and update
    const updateFields = {
        status,
        markedBy: teacherId,
        student: studentId,
        class: classId,
        date: attendanceDate,
        studentFirstName: studentDoc.firstName,
        studentLastName: studentDoc.lastName
    };
    
    // Find or create the attendance record
    const attendanceRecord = await Attendance.findOneAndUpdate(
        {
            student: studentId,
            class: classId,
            date: attendanceDate // Use the unique index fields
        },
        { $set: updateFields },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    res.status(200).json({ 
        message: 'Attendance recorded successfully', 
        attendanceId: attendanceRecord._id,
        status: attendanceRecord.status,
    });
}));

// ---------------------------------------------------------------- //
// 6. GET /api/teacher/attendance/:classId/:date - Protected Route
//    (Fetches attendance records for a specific class and date)
// ---------------------------------------------------------------- //
router.get('/attendance/:classId/:date', protect, asyncHandler(async (req, res) => {
    const { classId, date } = req.params;
    const teacherId = req.teacher._id;

    // Check teacher is assigned to class
    const classCheck = await Class.findOne({ _id: classId, teacher: teacherId });
    if (!classCheck) {
        res.status(403);
        throw new Error('Access Denied: Class not found or not assigned to this teacher.');
    }
    
    // Prepare the date range for querying (start of the day -> next day)
    // Parse the incoming date string (expected YYYY-MM-DD) into a local Date at 00:00:00
    let startOfDay;
    let nextDay;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      startOfDay = new Date(y, m - 1, d, 0, 0, 0);
      nextDay = new Date(y, m - 1, d + 1, 0, 0, 0);
    } else {
      // fallback: treat as Date parsable string
      startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      nextDay = new Date(startOfDay);
      nextDay.setDate(nextDay.getDate() + 1);
    }

    // Find attendance for the class within the day range (inclusive start, exclusive end)
    const teacherRecords = await Attendance.find({
      class: new mongoose.Types.ObjectId(classId),
      date: { $gte: startOfDay, $lt: nextDay }
    }).populate('student').lean();

    // Build a map keyed by student id from teacherRecords first
    const mergedByStudent = new Map();
    teacherRecords.forEach(r => {
      const sid = r.student && r.student._id ? String(r.student._id) : String(r.student || (r.studentId || r._id));
      // tag teacher origin so frontend can show source
      r._source = 'teacher';
      mergedByStudent.set(sid, r);
    });

    // Get class students (ids + name map) for matching raw docs by name if needed
    let classStudents = [];
    try {
      const classDoc = await Class.findById(classId).populate('students').lean();
      if (classDoc && Array.isArray(classDoc.students)) classStudents = classDoc.students;
    } catch (e) {
      // ignore
    }
    const classStudentIds = new Set(classStudents.map(s => String(s._id)));
    const nameToId = new Map();
    classStudents.forEach(s => nameToId.set(((s.firstName || '') + ' ' + (s.lastName || '')).trim().toLowerCase(), String(s._id)));
  // Map roll numbers to student ids for matching raw docs that use roll numbers
  const rollToId = new Map();
  classStudents.forEach(s => { if (s.rollNo) rollToId.set(String(s.rollNo), String(s._id)); });

  // Also prepare a global lookup for rollNo and names in case raw docs omit class
  const globalRollToId = new Map();
  const globalNameToId = new Map();
  try {
    const allStudents = await Student.find({}).select('rollNo firstName lastName').lean();
    allStudents.forEach(s => {
      if (s.rollNo) globalRollToId.set(String(s.rollNo), String(s._id));
      const fullname = (((s.firstName || '') + ' ' + (s.lastName || '')).trim().toLowerCase());
      if (fullname) globalNameToId.set(fullname, String(s._id));
    });
  } catch (e) {
    // ignore errors building global map
  }

    // Attempt to read the raw 'attendance' collection (some processes may write there)
    try {
      const rawColl = mongoose.connection.db.collection('attendance');
      // fetch raw docs for the day. Some producers store `date` as a string like 'YYYY-MM-DD',
      // so include both date-range match and exact string match.
      const rawQuery = {
        $or: [
          { date: { $gte: startOfDay, $lt: nextDay } },
          { date: date } // match string 'YYYY-MM-DD' entries
        ]
      };
      const rawDocs = await rawColl.find(rawQuery).toArray();

      rawDocs.forEach(d => {
        // Determine student id and normalized name
        const sid = d.student ? String(d.student) : (d.studentId ? String(d.studentId) : null);
  // Normalize raw name: collapse multiple spaces and lowercase
  const rawNameRaw = (d.name || d.studentName || ((d.studentFirstName || '') + ' ' + (d.studentLastName || ''))).trim();
  const rawName = rawNameRaw.replace(/\s+/g, ' ').toLowerCase();
  const rollNo = d.rollNo || d.roll_number || d.roll;

        // Accept raw doc if it matches this class by class ObjectId/string OR matches a student in class
        const classMatches = d.class && (String(d.class) === String(classId) || (String(d.class) === (classStudents.length ? (classStudents[0].class || '') : '')));
      // allow matching against class students OR global registered students
      const studentMatches = sid ? classStudentIds.has(sid) : (rawName && (nameToId.has(rawName) || globalNameToId.has(rawName))) || (rollNo && (rollToId.has(String(rollNo)) || globalRollToId.has(String(rollNo))));
        if (!classMatches && !studentMatches) return; // ignore unrelated raw record

        // Determine effective student id to key by
  const effectiveSid = sid || (rollNo && (rollToId.get(String(rollNo)) || globalRollToId.get(String(rollNo)))) || (rawName && (nameToId.get(rawName) || globalNameToId.get(rawName))) || String(d.student || d._id);

        // split rawNameRaw into first/last if we have full name
        let fn = '';
        let ln = '';
        if (rawNameRaw) {
          const parts = rawNameRaw.replace(/\s+/g, ' ').trim().split(' ');
          fn = parts[0] || '';
          ln = parts.slice(1).join(' ') || '';
        }

        const normalizedStudentField = (() => {
          if (effectiveSid && mongoose.Types.ObjectId.isValid(effectiveSid)) return new mongoose.Types.ObjectId(effectiveSid);
          if (sid && mongoose.Types.ObjectId.isValid(sid)) return new mongoose.Types.ObjectId(sid);
          return null;
        })();

        const rawNormalized = {
          _id: d._id,
          student: normalizedStudentField,
          studentFirstName: d.studentFirstName || d.firstName || fn || '',
          studentLastName: d.studentLastName || d.lastName || ln || '',
          class: d.class,
          date: d.date,
          status: d.status || 'Present',
          _source: 'raw-attendance'
        };

        // Only add raw doc if teacher did NOT mark this student. Teacher-marked records always win.
        if (!mergedByStudent.has(effectiveSid)) {
          mergedByStudent.set(effectiveSid, rawNormalized);
        }
      });
    } catch (rawErr) {
      console.warn('Could not read raw attendance collection:', rawErr.message || rawErr);
    }

      const attendanceRecords = Array.from(mergedByStudent.values());

      // Normalize fields so API consumers get JSON-friendly primitives
      const normalized = attendanceRecords.map(r => {
        const out = { ...r };
        try {
          // ensure _id is a string
          if (out._id && typeof out._id !== 'string') out._id = String(out._id);
        } catch (e) {}

        // normalize student to string id if possible, otherwise null
        try {
          if (out.student && typeof out.student === 'object') {
            // populated student object -> use its _id
            if (out.student._id) out.student = String(out.student._id);
            else out.student = String(out.student);
          } else if (out.student) {
            out.student = String(out.student);
          } else {
            out.student = null;
          }
        } catch (e) {
          out.student = null;
        }

        // class id normalization
        try { if (out.class && typeof out.class !== 'string') out.class = String(out.class); } catch (e) {}

        // ensure common display fields are present
        out.studentFirstName = out.studentFirstName || out.firstName || '';
        out.studentLastName = out.studentLastName || out.lastName || '';
        out.name = out.name || out.studentName || `${out.studentFirstName} ${out.studentLastName}`.trim();
        out.rollNo = out.rollNo || out.roll_number || out.roll || null;

        return out;
      });

      res.json({ attendance: normalized });
}));

// ---------------------------------------------------------------- //
// Password Reset Routes
// ---------------------------------------------------------------- //
router.post('/request-reset', async (req, res) => {
  console.log('[RESET] TEACHER request:', req.method, req.originalUrl, 'auth=', !!req.headers.authorization, 'Authorization=', req.headers.authorization);
  console.log('[RESET] body:', req.body);

  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username required' });

  const generic = { message: 'If an account exists, a reset email will be sent.' };

  try {
    // Find teacher by username (exact match)
    const teacher = await Teacher.findOne({ username: username.trim() });
    if (!teacher) return res.status(200).json(generic); // generic to avoid enumeration

    // Optional: if email must be verified before allowing reset
    if (!teacher.emailVerified) {
      // still return generic message, but log/notify admin
      console.warn(`Password reset requested for unverified email (username: ${username})`);
      return res.status(200).json(generic);
    }

    // Generate secure raw token + hash
    const { raw, hash } = generateResetToken();
  teacher.resetPasswordTokenHash = hash;
  teacher.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await teacher.save();

    // Build reset link (only sent to teacher.email from DB)
    const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase}/teacher/reset-password?token=${raw}&username=${encodeURIComponent(teacher.username)}`;

    // Send to the email on file (never an email provided by the requester)
    let sendResult = null;
    try {
      sendResult = await sendResetEmail(teacher.email, resetLink);
      if (sendResult && sendResult.previewUrl) {
        console.log('DEV RESET PREVIEW URL for', teacher.username, sendResult.previewUrl);
      }
      // As a defensive fallback also log the direct link to server console (safe for dev only)
      console.log('DEV RESET LINK for', teacher.username, resetLink);
    } catch (mailErr) {
      console.error('Error sending reset email:', mailErr);
      // still log the reset link for dev troubleshooting
      console.log('DEV RESET LINK for', teacher.username, resetLink);
    }

    // Write audit entry (request)
    try {
      await ResetAudit.create({
        teacher: teacher._id,
        username: teacher.username,
        event: 'request',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    } catch (auditErr) {
      console.warn('Failed to write reset audit (request):', auditErr);
    }

    // Placeholder: notify admin (email/Slack) if configured
    // notifyAdmin('password-reset-request', { username: teacher.username, ip: req.ip });

    // If developer wants the reset link returned in the API (local testing), enable DEV_ALLOW_RESET_LINK=true in .env
    if (String(process.env.DEV_ALLOW_RESET_LINK).toLowerCase() === 'true') {
      const resp = { ...generic, resetLink };
      if (sendResult && sendResult.previewUrl) resp.previewUrl = sendResult.previewUrl;
      return res.status(200).json(resp);
    }

    return res.status(200).json(generic);
  } catch (err) {
    console.error('request-reset error:', err);
    return res.status(200).json(generic);
  }
});

router.post('/reset-password', async (req, res) => {
  // Accept username + token + newPassword to avoid allowing arbitrary emails to be used here
  const { username, token, newPassword } = req.body;
  if (!username || !token || !newPassword) return res.status(400).json({ error: 'Missing fields' });

  try {
    const teacher = await Teacher.findOne({ username: username.trim() });
    if (!teacher || !teacher.resetPasswordTokenHash || !teacher.resetPasswordExpires) {
      // audit failed attempt
      await ResetAudit.create({ username, event: 'failed', ip: req.ip, userAgent: req.get('User-Agent') }).catch(() => {});
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (Date.now() > new Date(teacher.resetPasswordExpires).getTime()) {
      teacher.resetPasswordTokenHash = null;
      teacher.resetPasswordExpires = null;
      await teacher.save();
      await ResetAudit.create({ teacher: teacher._id, username: teacher.username, event: 'failed', ip: req.ip, userAgent: req.get('User-Agent') }).catch(() => {});
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== teacher.resetPasswordTokenHash) {
      await ResetAudit.create({ teacher: teacher._id, username: teacher.username, event: 'failed', ip: req.ip, userAgent: req.get('User-Agent') }).catch(() => {});
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });

    // Set plain password; Teacher pre-save will hash it.
    teacher.password = newPassword;
    teacher.resetPasswordTokenHash = null;
    teacher.resetPasswordExpires = null;
    teacher.passwordChangedAt = new Date();
    await teacher.save();

    // Audit success
    await ResetAudit.create({ teacher: teacher._id, username: teacher.username, event: 'reset', ip: req.ip, userAgent: req.get('User-Agent') }).catch(() => {});

    // Optionally send confirmation email here (notify admin/teacher)
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ---- Python attendance process control endpoints ----
// Start the Python attendance script (runs as child process)
router.post('/attendance/start', protect, asyncHandler(async (req, res) => {
  if (attendanceProcess) return res.status(400).json({ message: 'Attendance process already running' });

  const scriptPath = path.resolve(__dirname, '..', 'main.py');
  console.log('Attempting to spawn Python attendance script.');
  console.log('PYTHON_BIN:', PYTHON_BIN);
  console.log('scriptPath:', scriptPath);

  try {
    attendanceProcess = spawn(PYTHON_BIN, [scriptPath], { cwd: path.resolve(__dirname, '..'), env: process.env });
    // Pipe stdout/stderr to server logs for easier debugging
    if (attendanceProcess.stdout) {
      attendanceProcess.stdout.on('data', (data) => {
        console.log('[attendance stdout]', data.toString());
      });
    }
    if (attendanceProcess.stderr) {
      attendanceProcess.stderr.on('data', (data) => {
        console.error('[attendance stderr]', data.toString());
      });
    }
  } catch (spawnErr) {
    console.error('Failed to spawn attendance process:', spawnErr);
    attendanceProcess = null;
    return res.status(500).json({ message: 'Failed to start attendance process', error: String(spawnErr) });
  }

  attendanceProcess.stdout.on('data', (data) => {
    console.log(`[attendance.py stdout] ${data.toString()}`);
  });
  attendanceProcess.stderr.on('data', (data) => {
    console.error(`[attendance.py stderr] ${data.toString()}`);
  });
  attendanceProcess.on('close', (code) => {
    console.log(`Attendance script exited with code ${code}`);
    attendanceProcess = null;
  });

  return res.json({ message: 'Attendance process started' });
}));

// Stop the Python attendance script
router.post('/attendance/stop', protect, asyncHandler(async (req, res) => {
  if (!attendanceProcess) return res.status(400).json({ message: 'No attendance process running' });
  try {
    attendanceProcess.kill('SIGTERM');
  } catch (killErr) {
    console.error('Error killing attendance process:', killErr);
  }
  attendanceProcess = null;
  return res.json({ message: 'Attendance process stopped' });
}));

// Status
router.get('/attendance/status', protect, asyncHandler(async (req, res) => {
  return res.json({ running: !!attendanceProcess });
}));

module.exports = router;