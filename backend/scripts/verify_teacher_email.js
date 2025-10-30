#!/usr/bin/env node
// Usage: node verify_teacher_email.js <username>
// Example: node verify_teacher_email.js deorashivani

const mongoose = require('mongoose');
const path = require('path');

// Ensure we load environment variables if a .env exists
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: node verify_teacher_email.js <username>');
    process.exit(2);
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Please set it in environment or .env. Aborting.');
    process.exit(3);
  }

  try {
    await connectDB();
    const teacher = await Teacher.findOne({ username: username.trim() });
    if (!teacher) {
      console.error('Teacher not found for username:', username);
      process.exit(4);
    }

    teacher.emailVerified = true;
    await teacher.save();
    console.log(`Teacher ${username} emailVerified=true (email: ${teacher.email})`);
    console.log('Now you can trigger the Forgot Password flow and a reset email will be sent.');
    process.exit(0);
  } catch (err) {
    console.error('Error verifying teacher email:', err);
    process.exit(1);
  }
}

main();
