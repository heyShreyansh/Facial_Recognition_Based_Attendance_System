require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Class = require('../models/class');

(async function(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const students = await Student.find({ branch: /CSE/i }).lean();
    console.log(`Found ${students.length} students in branch CSE:`);
    for(const s of students){
      // check classes that include this student
      const classes = await Class.find({ students: s._id }).select('name branch students').lean();
      console.log('-', String(s._id), s.firstName + ' ' + s.lastName, 'rollNo:', s.rollNo, '| inClasses:', classes.map(c=>c.name+'('+String(c._id)+')'));
    }
    await mongoose.disconnect();
  }catch(e){ console.error(e); process.exit(1); }
})();
