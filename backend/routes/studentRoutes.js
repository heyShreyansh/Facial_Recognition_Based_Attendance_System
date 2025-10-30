const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Minimal student registration endpoint to match frontend POST /register_student
// Expects JSON body: { firstName, lastName, rollNo, email, phoneNumber, year, semester, branch, photos }
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, rollNo, email, phoneNumber, year, semester, branch, photos } = req.body;
    if (!firstName || !lastName || !rollNo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Basic duplicate check by rollNo or email
    const existing = await Student.findOne({ $or: [{ rollNo }, { email }] });
    if (existing) return res.status(409).json({ error: 'Student with this roll number or email already registered' });

    const student = new Student({ firstName, lastName, rollNo, email, phoneNumber, year, semester, branch });
    // If your Student schema supports storing photos as URLs/base64, you can save them; otherwise skip
    if (Array.isArray(photos) && photos.length) {
      student.photos = photos.slice(0, 50); // cap to 50 images to avoid huge docs
    }

    await student.save();

    return res.status(201).json({ message: 'Student registered', studentId: student._id });
  } catch (err) {
    console.error('register_student error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
