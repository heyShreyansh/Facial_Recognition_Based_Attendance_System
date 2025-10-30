const express = require('express');
const mongoose = require('mongoose');

// require models using actual filenames
const ClassModel = require('../models/class');
const Student = require('../models/Student');

const router = express.Router();

function toObjectId(val) {
  return mongoose.Types.ObjectId.isValid(val) ? new mongoose.Types.ObjectId(val) : null;
}

function normalizeBranch(token) {
  if (!token) return null;
  const t = String(token).toLowerCase();
  if (/(cse|cs|computer)/.test(t)) return 'Computer Science';
  if (/(petrol|pe|petroleum)/.test(t)) return 'Petroleum';
  if (/(ece|electro)/.test(t)) return 'Electronics';
  if (/(mech|mechanical)/.test(t)) return 'Mechanical';
  return null;
}

// GET /api/admin/classes/:classId/students
router.get('/classes/:classId/students', async (req, res) => {
  try {
    const { classId } = req.params;
    console.log('[adminClassStudents] classId=', classId);

    let cls = null;
    const maybeId = toObjectId(classId);
    if (maybeId) {
      cls = await ClassModel.findById(maybeId).lean().exec();
    }

    if (!cls) {
      // try match by name/code/text
      cls = await ClassModel.findOne({
        $or: [
          { name: classId },
          { name: { $regex: `^${String(classId)}$`, $options: 'i' } },
          { subject: classId },
        ]
      }).lean().exec();
    }

    // If class has explicit students array, return them
    if (cls && Array.isArray(cls.students) && cls.students.length > 0) {
      const ids = cls.students
        .map(id => (mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id));
      const students = await Student.find({ _id: { $in: ids } }).select('-password -__v').lean().exec();
      console.log('[adminClassStudents] returning students from class.students count=', students.length);
      return res.json({ students });
    }

    // Build search clauses to find students by branch/semester or common class refs
    const orClauses = [];
    if (cls) {
      if (cls.branch) {
        orClauses.push({ branch: cls.branch });
        orClauses.push({ branch: { $regex: cls.branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
      }
      if (cls.semester) {
        orClauses.push({ semester: { $regex: cls.semester, $options: 'i' } });
      }
      // try normalized branch from code/name
      const norm = normalizeBranch(cls.name || cls.subject || cls.branch || cls._id);
      if (norm) orClauses.push({ branch: norm });
    } else {
      // no class doc: treat classId as branch/semester token
      orClauses.push({ branch: { $regex: classId, $options: 'i' } });
      orClauses.push({ semester: { $regex: classId, $options: 'i' } });
    }

    // common places students might reference class by id/string
    if (maybeId) {
      orClauses.push({ assignedClass: maybeId }, { classId: maybeId }, { classes: maybeId });
      orClauses.push({ assignedClass: String(maybeId) }, { classId: String(maybeId) }, { classes: String(maybeId) });
    } else {
      orClauses.push({ assignedClass: classId }, { classId: classId }, { classes: classId });
    }

    // final fallbacks
    orClauses.push({ department: { $regex: classId, $options: 'i' } });

    const filtered = orClauses.filter(Boolean);
    if (filtered.length === 0) return res.json({ students: [] });

    const students = await Student.find({ $or: filtered }).select('-password -__v').lean().exec();
    console.log('[adminClassStudents] found students count=', students.length);
    return res.json({ students });
  } catch (err) {
    console.error('[adminClassStudents] error:', err && (err.stack || err));
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;