const express = require('express');
const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student'); // may exist already
const ClassModel = require('../models/class'); // add near other model requires
const router = express.Router();
const crypto = require('crypto');

// POST /api/admin/request-reset
router.post('/request-reset', async (req, res) => {
  const { username } = req.body || {};
  const now = Date.now();

  try {
    // Find teacher record by username (reuse teacher flow)
    const teacher = await Teacher.findOne({ username: (username || '').trim().toLowerCase() });
    // Always return generic message to avoid enumeration
    const resp = { message: 'If an account exists, a reset email will be sent.' };

    if (!teacher) {
      // record failed audit for visibility (optional)
      try { await ResetAudit.create({ username, event: 'failed' }); } catch (e){ /* ignore */ }
      return res.json(resp);
    }

    // generate token + hash, persist on teacher
    const { raw: tokenRaw, hash: tokenHash } = generateResetToken();
    teacher.resetPasswordTokenHash = tokenHash;
    teacher.resetPasswordExpires = new Date(now + 60 * 60 * 1000); // 1 hour
    await teacher.save();

    // create reset link
    const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const resetLink = `${frontendBase.replace(/\/$/, '')}/admin/reset-password?token=${tokenRaw}&username=${encodeURIComponent(teacher.username)}`;

    // send mail (returns preview when using Ethereal)
    const sendResult = await sendResetEmail(teacher.email, resetLink).catch(err => {
      console.error('Error sending admin reset email:', err);
      return null;
    });

    // record audit request
    try {
      await ResetAudit.create({ username: teacher.username, event: 'request', meta: { tokenHash, expires: teacher.resetPasswordExpires } });
    } catch (e) { /* ignore audit errors */ }

    // in dev, optionally return the reset link for debugging
    if (process.env.DEV_ALLOW_RESET_LINK === 'true') {
      return res.json({ ...resp, resetLink, previewUrl: sendResult && sendResult.previewUrl });
    }

    return res.json(resp);
  } catch (err) {
    console.error('Admin request-reset error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/reset-password
router.post('/reset-password', async (req, res) => {
  const { username, token, newPassword } = req.body || {};
  if (!username || !token || !newPassword) return res.status(400).json({ message: 'Missing fields' });

  try {
    const teacher = await Teacher.findOne({ username: (username || '').trim().toLowerCase() });
    if (!teacher || !teacher.resetPasswordTokenHash || !teacher.resetPasswordExpires) {
      try { await ResetAudit.create({ username, event: 'failed' }); } catch (e) {}
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // compute sha256 of token and compare
    const cryptoHash = crypto.createHash('sha256').update(token).digest('hex');
    if (cryptoHash !== teacher.resetPasswordTokenHash) {
      try { await ResetAudit.create({ username, event: 'failed' }); } catch (e) {}
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (new Date() > new Date(teacher.resetPasswordExpires)) {
      try { await ResetAudit.create({ username, event: 'failed' }); } catch (e) {}
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // persist new password on Teacher (pre-save hook will hash)
    teacher.password = newPassword;
    teacher.resetPasswordTokenHash = null;
    teacher.resetPasswordExpires = null;
    teacher.passwordChangedAt = new Date();
    await teacher.save();

    try {
      await ResetAudit.create({ username: teacher.username, event: 'reset' });
    } catch (e) {}

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Admin reset-password error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/teachers (populate assignedClasses if ref exists)
router.get('/teachers', async (req, res) => {
  try {
    // try to populate assignedClasses if schema uses refs, otherwise return as-is
    let teachers;
    try {
      teachers = await Teacher.find({}).select('-password -resetPasswordTokenHash -__v').populate('assignedClasses').lean();
    } catch (e) {
      teachers = await Teacher.find({}).select('-password -resetPasswordTokenHash -__v').lean();
    }
    return res.json({ teachers });
  } catch (err) {
    console.error('admin GET /teachers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/teachers/:teacherId/assign-class  { classId }
router.post('/teachers/:teacherId/assign-class', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ message: 'classId required' });

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // avoid duplicates
    teacher.assignedClasses = teacher.assignedClasses || [];
    if (!teacher.assignedClasses.map(String).includes(String(classId))) {
      teacher.assignedClasses.push(classId);
      await teacher.save();
    }

    return res.json({ message: 'Class assigned', teacher });
  } catch (err) {
    console.error('assign-class error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/teachers/:teacherId/assigned-classes/:classId
router.delete('/teachers/:teacherId/assigned-classes/:classId', async (req, res) => {
  try {
    const { teacherId, classId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    teacher.assignedClasses = (teacher.assignedClasses || []).filter(id => String(id) !== String(classId));
    await teacher.save();
    return res.json({ message: 'Class removed', teacher });
  } catch (err) {
    console.error('remove-class error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/teachers/:teacherId
router.delete('/teachers/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    await Teacher.deleteOne({ _id: teacherId });
    return res.json({ message: 'Teacher removed' });
  } catch (err) {
    console.error('admin DELETE /teachers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/classes/:classId/students
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const { classId } = req.params;
    console.log('[adminRoutes] GET /classes/%s/students called', classId);

    // ensure mongoose is connected
    if (!mongoose || mongoose.connection.readyState !== 1) {
      console.error('[adminRoutes] mongoose not connected (readyState=%s)', mongoose && mongoose.connection && mongoose.connection.readyState);
      return res.status(503).json({ message: 'Database not ready' });
    }

    let cls = null;
    try {
      // use `new mongoose.Types.ObjectId(...)` when creating an ObjectId instance
      const q = mongoose.Types.ObjectId.isValid(classId)
        ? { _id: new mongoose.Types.ObjectId(classId) }
        : { _id: classId };
      cls = await mongoose.connection.db.collection('classes').findOne(q);
      console.log('[adminRoutes] class doc loaded:', !!cls);
    } catch (e) {
      console.warn('[adminRoutes] class lookup failed:', e && e.message);
      cls = null;
    }

    // if class doc contains explicit student ids
    if (cls && Array.isArray(cls.students) && cls.students.length > 0) {
      const ids = cls.students.map(id => (mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id));
      const students = await Student.find({ _id: { $in: ids } }).select('-__v -password').lean();
      console.log('[adminRoutes] returning %d students from class.students', students.length);
      return res.json({ students });
    }

    const maybeId = mongoose.Types.ObjectId.isValid(classId) ? new mongoose.Types.ObjectId(classId) : classId;
    const orClauses = [
      { classId: maybeId },
      { class: maybeId },
      { assignedClass: maybeId },
      { assignedClasses: maybeId },
      { classes: maybeId },
      { classIds: maybeId },
      { class_ids: maybeId },
      { classId: String(classId) },
      { class: String(classId) },
      { assignedClass: String(classId) },
      { assignedClasses: String(classId) },
      { classes: String(classId) }
    ];

    if (cls && cls.branch) {
      orClauses.push({ branch: cls.branch });
      orClauses.push({ branch: { $regex: cls.branch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), $options: 'i' } });
    }

    console.log('[adminRoutes] student query OR clauses count=%d', orClauses.length);
    const students = await Student.find({ $or: orClauses }).select('-__v -password').lean();
    console.log('[adminRoutes] found students count=%d', (students && students.length) || 0);

    // fallback by branch token
    if ((!students || students.length === 0) && cls && cls.branch) {
      const token = (cls.branch || '').toString().toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (token) {
        const fallback = await Student.find({ branch: { $regex: token, $options: 'i' } }).select('-__v -password').lean();
        console.log('[adminRoutes] fallback by branch found=%d', fallback.length);
        return res.json({ students: fallback || [] });
      }
    }

    return res.json({ students: students || [] });
  } catch (err) {
    console.error('[adminRoutes] GET /classes/:classId/students error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/classes
router.get('/classes', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections({ name: 'classes' }).toArray();
    if (!collections.length) return res.json({ classes: [] });
    const classes = await mongoose.connection.db.collection('classes').find({}).toArray();
    return res.json({ classes });
  } catch (err) {
    console.error('admin GET /classes error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/teachers/:teacherId
router.get('/teachers/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId)
      .select('-password -resetPasswordTokenHash -__v')
      .populate('assignedClasses') // safe if schema uses refs; otherwise returns ids
      .lean();
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    return res.json({ teacher });
  } catch (err) {
    console.error('admin GET /teachers/:id error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/classes  -> create a class (validate to avoid 500s)
router.post('/classes', async (req, res) => {
  try {
    const { name, code, branch, semester, subject } = req.body || {};

    // basic validation to prevent Mongoose throwing ValidationError
    const missing = [];
    if (!name && !code) missing.push('name|code'); // require at least one
    if (!subject) missing.push('subject');

    if (missing.length) {
      return res.status(400).json({ message: 'Missing required fields', missing });
    }

    // prevent duplicate by code or name
    const exists = await ClassModel.findOne({
      $or: [
        code ? { code } : null,
        name ? { name } : null
      ].filter(Boolean)
    }).lean().exec();

    if (exists) {
      return res.status(409).json({ message: 'Class with same name or code already exists' });
    }

    const cls = new ClassModel({ name, code, branch, semester, subject });
    await cls.save();

    return res.status(201).json({ class: cls });
  } catch (err) {
    console.error('create class error:', err && (err.stack || err));
    if (err.name === 'ValidationError') {
      const details = Object.keys(err.errors || {}).reduce((acc, k) => {
        acc[k] = err.errors[k].message;
        return acc;
      }, {});
      return res.status(400).json({ message: 'Validation failed', errors: details });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/classes/:id  — remove a class
router.delete('/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing class id' });

    const cls = await ClassModel.findById(id).exec();
    if (!cls) return res.status(404).json({ message: 'Class not found' });

    await cls.deleteOne();
    return res.json({ message: 'Class deleted', id });
  } catch (err) {
    console.error('delete class error:', err && (err.stack || err));
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



