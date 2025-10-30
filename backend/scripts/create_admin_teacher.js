const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Teacher = require('../models/Teacher');

dotenv.config();
const MONGO = process.env.MONGO_URI;
if (!MONGO) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function upsertAdmin(username, email, password, firstName = 'Admin', lastName = 'User') {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  let teacher = await Teacher.findOne({ username });
  if (!teacher) {
    teacher = new Teacher({ username, email, password, firstName, lastName, emailVerified: true });
    await teacher.save();
    console.log('Created admin teacher:', teacher.username);
  } else {
    teacher.email = email || teacher.email;
    teacher.password = password;
    teacher.emailVerified = true;
    await teacher.save();
    console.log('Updated admin teacher password for:', teacher.username);
  }

  await mongoose.disconnect();
}

// Minimal argument parser to avoid external dependency on 'minimist'
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        const key = a.slice(2, eq);
        out[key] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          out[key] = next;
          i++;
        } else {
          out[key] = true;
        }
      }
    }
  }
  return out;
}

const argv = parseArgs(process.argv.slice(2));
const username = argv.username || process.env.ADMIN_USERNAME || 'admin';
const email = argv.email || process.env.ADMIN_EMAIL || 'admin@example.com';
const password = argv.password || process.env.ADMIN_PASSWORD || 'Admin@1234';
const firstName = argv.firstName || 'Admin';
const lastName = argv.lastName || 'User';

upsertAdmin(username, email, password, firstName, lastName).catch(e => { console.error(e); process.exit(1); });
