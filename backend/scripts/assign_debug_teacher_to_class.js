const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');
const Class = require('../models/class');

(async ()=>{
  await connectDB();
  const teacher = await Teacher.findOne({ username: 'debug_teacher' });
  if (!teacher) return console.error('debug_teacher not found');
  const classId = '68e010d91b884ded25f30ec4';
  const cls = await Class.findById(classId);
  if (!cls) return console.error('class not found', classId);
  cls.teacher = teacher._id;
  await cls.save();
  console.log('Assigned debug_teacher to class', classId);
  process.exit(0);
})();