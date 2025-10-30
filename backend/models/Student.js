const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    // --- Personal & Contact Information (from Registration Form) ---
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    rollNo: {
        type: String,
        required: true,
        unique: true, // Roll Number must be unique
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },

    // --- Academic Information (from Dropdowns) ---
    year: {
        type: String,
        required: true,
    },
    semester: {
        type: String,
        required: true,
    },
    branch: {
        type: String,
        required: true,
    },

    // --- Biometric Data (Photos) ---
    // Stores the base64 strings or URLs/paths if processed and saved as files
    photos: {
        type: [String], // Array of strings to hold the 10 base64 images
        required: true,
        validate: {
            validator: function(v) {
                // Ensure exactly 10 photos were saved during registration
                return v.length === 10; 
            },
            message: props => `${props.path} must contain exactly 10 photos.`
        }
    },

    // --- System Status ---
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Virtual property for full name (useful for display in the Teacher Portal)
StudentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);