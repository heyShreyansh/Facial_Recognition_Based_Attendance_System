// backend/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI is not set. Skipping MongoDB connection (development/testing mode).');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // In development allow server to continue so we can debug other features (like process spawn)
    // Do not exit here to keep the server responsive for UI/endpoint testing.
  }
};

module.exports = connectDB;