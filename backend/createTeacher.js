// backend/createTeacher.js

const mongoose = require('mongoose');
const Teacher = require('./models/Teacher'); // Path to your Teacher model
const dotenv = require('dotenv');

dotenv.config();

// Replace with your actual MongoDB connection string
// 1. Hardcode the full Atlas URI temporarily for guaranteed testing connection
const ATLAS_URI = 'mongodb+srv://deorashivani4:Lpw95rn269nMeMKE@shivani.i2jd7gu.mongodb.net/AttendanceSystemDB?retryWrites=true&w=majority&appName=shivani'; 

// 2. Use the Atlas URI
const MONGO_URI = process.env.MONGO_URI || ATLAS_URI; // This ensures it uses the cloud link
// ... rest of the code

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected successfully.');
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

const createTestTeacher = async () => {
    await connectDB();

    try {
        // 1. Check if the user already exists to avoid duplicates
        const existingTeacher = await Teacher.findOne({ username: 'deorashivani' });
        if (existingTeacher) {
            await Teacher.deleteOne({ username: 'deorashivani' });
        }

        // 2. Create the test teacher account
        const newTeacher = new Teacher({
            firstName: 'Shivani',
            lastName: 'Deora',
            username: 'deorashivani',  // <--- USE THIS USERNAME TO LOG IN
            password: 'shiv@123',   // <--- USE THIS PASSWORD TO LOG IN (It will be hashed!)
            email: 'deorashivani4@gmail.com',
            // assignedClasses will be empty initially, which is fine
        });

        await newTeacher.save();
        console.log('✅ Test Teacher Account Created Successfully!');
        console.log('   Username: deorashivani');
        console.log('   Password: shiv@123');

    } catch (error) {
        console.error('Error creating teacher:', error);
    } finally {
        // 3. Close the connection
        mongoose.connection.close();
    }
};

createTestTeacher();