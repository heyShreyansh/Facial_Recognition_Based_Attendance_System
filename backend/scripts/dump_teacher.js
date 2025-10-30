const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const connectDB = require('../config/db');
const Teacher = require('../models/Teacher');

(async ()=>{
  await connectDB();
  const t = await Teacher.findOne({}).lean();
  console.log(JSON.stringify(t, null, 2));
  process.exit(0);
})();