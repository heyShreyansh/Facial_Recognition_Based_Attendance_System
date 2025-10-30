require('dotenv').config();
const bcrypt = require('bcryptjs');

const pw = process.argv[2];
const hash = process.argv[3];
if (!pw || !hash) {
  console.error('Usage: node check_password.js <password> <hash>');
  process.exit(1);
}
console.log(bcrypt.compareSync(pw, hash) ? 'MATCH' : 'NO MATCH');