require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('../models/class');
const Student = require('../models/Student');

(async function(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const classes = await Class.find({}).populate('students').lean();
    if(!classes || classes.length === 0){ console.log('no classes found'); process.exit(0); }
    for(const c of classes){
      console.log('class:', String(c._id), '-', c.name || c.title || '<no-name>', '| branch:', c.branch, '| students:', (c.students || []).length);
      (c.students || []).forEach(s => console.log('   ', String(s._id), s.firstName, s.lastName, 'rollNo:', s.rollNo));
    }
    await mongoose.disconnect();
  }catch(e){ console.error(e); process.exit(1);} 
})();
