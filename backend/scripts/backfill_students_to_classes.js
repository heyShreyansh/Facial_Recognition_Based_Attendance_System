require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('../models/class');
const Student = require('../models/Student');

async function run() {
	const apply = process.argv.includes('--apply');
	console.log('Backfill students to classes -', apply ? 'APPLY mode' : 'DRY-RUN mode');
	if (!process.env.MONGO_URI) {
		console.error('MONGO_URI not set in .env'); process.exit(1);
	}
	await mongoose.connect(process.env.MONGO_URI);
	try {
		const classes = await Class.find({}).lean();
		if (!classes.length) {
			console.log('No classes found'); return;
		}

			// helper to normalize branch strings into tokens
			const normalize = s => (s || '').toString().toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
			const knownAliases = {
				'cse': ['computer science', 'cse', 'cs'],
				'computer science': ['computer science', 'cse', 'cs']
			};

			for (const cls of classes) {
				const clsBranchNorm = normalize(cls.branch || '');
				// create acceptable branch tokens: include aliases if known
				let acceptable = new Set();
				if (knownAliases[clsBranchNorm]) knownAliases[clsBranchNorm].forEach(a => acceptable.add(normalize(a)));
				acceptable.add(clsBranchNorm);

				// We'll fetch all students and filter in-memory for fuzzy matching because branch naming can vary
				const allStudents = await Student.find({}).select('_id firstName lastName rollNo branch semester').lean();
				const students = allStudents.filter(s => {
					const sNorm = normalize(s.branch || '');
					if (!sNorm) return false;
					if (acceptable.has(sNorm)) return true;
					// also accept if normalized branch contains token (e.g., 'computer science and engineering')
					for (const a of acceptable) if (sNorm.includes(a)) return true;
					return false;
				});

			const existingStudentIds = Array.isArray(cls.students) ? cls.students.map(s => String(s)) : [];
			const toAdd = students.filter(s => !existingStudentIds.includes(String(s._id)));

			console.log(`Class: ${cls.name || cls._id} (${cls.branch} ${cls.semester || ''}) -> matched ${students.length} students, toAdd: ${toAdd.length}`);
			toAdd.forEach(s => console.log('   ', String(s._id), s.firstName, s.lastName, 'rollNo:', s.rollNo, '| branch:', s.branch, 'semester:', s.semester));

			if (apply && toAdd.length > 0) {
				const ids = toAdd.map(s => s._id);
				const upd = await Class.updateOne({ _id: cls._id }, { $addToSet: { students: { $each: ids } } });
				console.log('   Applied update result:', upd.result || upd);
			}
		}
	} catch (e) {
		console.error('Error during backfill:', e);
	} finally {
		await mongoose.disconnect();
	}
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
