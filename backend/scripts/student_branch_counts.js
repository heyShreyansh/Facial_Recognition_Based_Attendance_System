require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');

(async function(){
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const agg = await Student.aggregate([
      { $group: { _id: { $ifNull: ['$branch', '<<missing>>'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Student counts by branch:');
    agg.forEach(a => console.log('-', a._id, ':', a.count));
    await mongoose.disconnect();
  }catch(e){ console.error(e); process.exit(1); }
})();
