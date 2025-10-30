const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Assume you have a DB config file
const teacherRoutes = require('./routes/teacherRoutes');
const adminMailResetRoutes = require('./routes/adminMailResetRoutes');
const adminRoutes = require('./routes/adminRoutes');   // <--- add this
const adminClassStudents = require('./routes/adminClassStudentsRoutes');
const adminTeacherRoutes = require('./routes/adminTeacherRoutes');
const cors = require('cors'); // Required for frontend communication
const rateLimit = require('express-rate-limit');

dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();
// Body parser: increase limits to allow base64 photo payloads from the registration form
app.use(express.json({ limit: '50mb' })); // Body parser middleware
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors()); // Allow all origins for development (configure in production)

// Simple request logger to help debug routing issues
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl);
  next();
});

// Rate limiting middleware for password reset requests
const requestResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6, // Limit each IP to 6 requests per windowMs
  message: 'Too many password reset requests, try again later.',
});

// Use the Teacher Routes
// app.post('/api/teacher/login', (req, res) => {
//     // If the server hits this, the 404 is fixed!
//     console.log("SUCCESS: SERVER HIT THE POST ROUTE!");
//     res.json({ message: "Login endpoint reached." });
// });
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminMailResetRoutes);
app.use('/api/admin', adminRoutes);                   // <--- add this
app.use('/api/admin', adminClassStudents);         // <--- add this
app.use('/api/admin', adminTeacherRoutes);        // <--- add this

// Mount student registration route (frontend posts to /register_student)
const studentRoutes = require('./routes/studentRoutes');
app.use('/register_student', studentRoutes);

// Development-only: quick debug endpoint to list all students (no auth) so frontend/devs can verify DB contents
if (process.env.NODE_ENV !== 'production') {
  try {
    const Student = require('./models/Student');
    app.get('/api/students', async (req, res) => {
      try {
        const students = await Student.find({}).select('firstName lastName rollNo createdAt');
        console.log(`DEBUG /api/students -> returning ${students.length} students`);
        return res.json({ students });
      } catch (err) {
        console.error('DEBUG /api/students error:', err);
        return res.status(500).json({ error: 'Server error' });
      }
    });
  } catch (e) {
    console.warn('Student model not available for debug route:', e.message || e);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic Error Handling Middleware (optional but recommended)
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// handle invalid JSON payloads from body-parser
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));