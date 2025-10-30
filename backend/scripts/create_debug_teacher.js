const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

(async ()=>{
  await connectDB();
  const username = 'debug_teacher';
  let t = await Teacher.findOne({ username });
  if (!t) {
    const password = await bcrypt.hash('password123', 10);
    t = await Teacher.create({ username, password, firstName: 'Debug', lastName: 'Teacher', email: 'debug@example.com', emailVerified: true });
    console.log('created debug teacher');
  } else {
    console.log('debug teacher exists');
  }
  console.log('token:', generateToken(t._id));
  process.exit(0);
})();