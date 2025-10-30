const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const rawColl = mongoose.connection.db.collection('attendance');
  const q = {
    $or: [
      { name: { $regex: 'kuldeep', $options: 'i' } },
      { studentName: { $regex: 'kuldeep', $options: 'i' } },
      { 'student': { $regex: 'kuldeep', $options: 'i' } }
    ]
  };
  const docs = await rawColl.find(q).limit(50).toArray();
  console.log('Found', docs.length, 'raw docs matching kuldeep');
  docs.forEach(d => console.log(JSON.stringify(d, null, 2)));
  await mongoose.disconnect();
}

run().catch(e=>{console.error(e);process.exit(1);});
