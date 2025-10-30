const express = require('express');
const Teacher = require('../models/Teacher'); // keep your existing import
const router = express.Router();

router.post('/teachers', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, name } = req.body || {};

    // basic input validation => avoid Mongoose throwing 500
    const missing = [];
    if (!username) missing.push('username');
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (!firstName) missing.push('firstName');
    if (!lastName) missing.push('lastName');

    if (missing.length) {
      return res.status(400).json({ message: 'Missing required fields', missing });
    }

    // prevent duplicate
    const exists = await Teacher.findOne({ $or: [{ username }, { email }] }).lean();
    if (exists) return res.status(409).json({ message: 'Teacher already exists' });

    const teacher = new Teacher({ username, email, password, firstName, lastName, name });
    await teacher.save();

    const out = teacher.toObject();
    delete out.password;
    return res.status(201).json({ teacher: out });
  } catch (err) {
    console.error('create teacher error:', err && (err.stack || err));

    // return validation errors as 400 so frontend can show them
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

module.exports = router;