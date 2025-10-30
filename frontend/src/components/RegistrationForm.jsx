

import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import './RegistrationForm.css';
import heroImg from '../assets/heroo1.jpg';

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SEMESTER_OPTIONS = [
  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
];
const BRANCH_OPTIONS = [
  'Computer Science', 'Electrical Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Electronics & Communication'
];
const REGEX = {
  name: /^[A-Za-z\s]{2,50}$/,
  rollNo: /^[A-Za-z0-9]{5,15}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneNumber: /^\+?[0-9]{10,15}$/,
};
const initialFormData = {
  firstName: '',
  lastName: '',
  rollNo: '',
  email: '',
  phoneNumber: '',
  year: '',
  semester: '',
  branch: '',
};
const videoConstraints = {
  width: 480,
  height: 360,
  facingMode: 'user'
};

function RegistrationForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const [message, setMessage] = useState('');
  const webcamRef = useRef(null);

  // --- Handlers (Simplified) ---
  const validateField = (name, value) => {
    let error = '';
    const nameRegex = name.includes('Name') ? 'name' : name;
    if (!value || value.trim() === '') {
        error = 'This field is required.';
    } else if (REGEX[nameRegex] && !REGEX[nameRegex].test(value)) {
        error = `Invalid format for ${name}.`;
    }
    setErrors(prevErrors => ({ ...prevErrors, [name]: error }));
    return error === '';
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };
  
  const validateForm = () => {
    let isValid = true;
    Object.keys(formData).forEach(field => {
        if (!validateField(field, formData[field])) isValid = false;
    });
    return isValid;
  };

  const capturePhotos = () => {
    setMessage('Capturing photos... Please stay in front of the camera.');
    let capturedCount = 0;
    setPhotos([]);
    const interval = setInterval(() => {
        if (capturedCount < 10) {
            if (webcamRef.current) {
                const imageSrc = webcamRef.current.getScreenshot();
                setPhotos(prevPhotos => [...prevPhotos, imageSrc]);
                capturedCount++;
                setMessage(`Captured ${capturedCount} of 10 photos.`);
            }
        } else {
            clearInterval(interval);
            setMessage('Photo capture complete. Click "Register" to continue.');
        }
    }, 1000);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || photos.length < 10) {
        setMessage('Please correct errors and ensure 10 photos are captured.');
        window.scrollTo(0, 0);
        return;
    }
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
  setMessage('Registering student...');
  try {
    const response = await fetch(`${API_BASE}/register_student`, {
      method: 'POST', body: JSON.stringify({...formData, photos}), headers: {'Content-Type': 'application/json'},
    });
        if (response.ok) {
            setMessage('Registration successful!');
            alert(`Student registered successfully.`);
            setFormData(initialFormData); setPhotos([]); setErrors({});
        } else {
            const error = await response.json();
            setMessage(`Registration failed: ${error.error || response.statusText}`);
        }
    } catch (error) {
        setMessage('Network error. Please check your backend server and connection.');
    }
  };


  return (
    <div className="card registration-container"> 
      {/* Top logo/header so the man/brand appears above the form */}
      {/* logo removed as requested */}
      
      {/* 1. BLIND CHECKBOX (Required for avatar focus effect) */}
      <input
        value=""
        className="blind-check"
        type="checkbox"
        id="blind-input"
        name="blindcheck"
        hidden
      />

      {/* 2. AVATAR/FIGURE AREA (Human Avatar Structure) */}
      <label htmlFor="blind-input" className="avatar">
        <figure aria-hidden="true" className="human-avatar">
            <div className="person-body"></div>
            <div className="neck skin"></div>
            <div className="head skin">
                {/* EYES and MOUTH for Blinking/Smiling */}
                <div className="eyes"></div>
                <div className="mouth"></div>
            </div>
            <div className="hair"></div>
            <div className="ears"></div>
        </figure>
      </label>
      
      {/* 3. SHOW/HIDE BUTTON - REMOVED AS PER REQUEST FOR THIS FORM SECTION */}
      {/* <label htmlFor="blind-input" className="blind_input">
        <span className="hide">Hide</span>
        <span className="show">Show</span>
      </label> */}

      {/* 4. FORM CONTENT */}
      <form onSubmit={handleSubmit} className="form">
        <div className="title">Student Facial Biometric Registration</div> 
        
        {/* PERSONAL DETAILS - STACKED */}
        <div className="form-group full-width">
            <label className="label_input">First Name</label>
            <input spellcheck="false" className="input" type="text" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={() => validateField('firstName', formData.firstName)} />
            {errors.firstName && <p className="error-message">{errors.firstName}</p>}
        </div>
        <div className="form-group full-width">
            <label className="label_input">Last Name</label>
            <input spellcheck="false" className="input" type="text" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={() => validateField('lastName', formData.lastName)} />
            {errors.lastName && <p className="error-message">{errors.lastName}</p>}
        </div>

        {/* CONTACT/ROLL NO DETAILS - STACKED */}
        <div className="form-group full-width">
            <label className="label_input">Roll No</label>
            <input spellcheck="false" className="input" type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} onBlur={() => validateField('rollNo', formData.rollNo)} />
            {errors.rollNo && <p className="error-message">{errors.rollNo}</p>}
        </div>
        <div className="form-group full-width">
            <label className="label_input">Email</label>
            <input spellcheck="false" className="input" type="email" name="email" value={formData.email} onChange={handleChange} onBlur={() => validateField('email', formData.email)} />
            {errors.email && <p className="error-message">{errors.email}</p>}
        </div>
        
        <div className="form-group full-width">
            <label className="label_input">Contact Number</label>
            <input spellcheck="false" className="input" type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} onBlur={() => validateField('phoneNumber', formData.phoneNumber)} />
            {errors.phoneNumber && <p className="error-message">{errors.phoneNumber}</p>}
        </div>

        {/* ACADEMIC DETAILS - STACKED */}
        <div className="title section-heading">Academic Details</div>
        <div className="form-group full-width">
            <label className="label_input">Year</label>
            <select name="year" className="input" value={formData.year} onChange={handleChange} onBlur={() => validateField('year', formData.year)}>
                <option value="">Select Year</option>
                {YEAR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.year && <p className="error-message">{errors.year}</p>}
        </div>
        <div className="form-group full-width">
            <label className="label_input">Semester</label>
            <select name="semester" className="input" value={formData.semester} onChange={handleChange} onBlur={() => validateField('semester', formData.semester)}>
                <option value="">Select Semester</option>
                {SEMESTER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.semester && <p className="error-message">{errors.semester}</p>}
        </div>
        <div className="form-group full-width">
            <label className="label_input">Branch</label>
            <select name="branch" className="input" value={formData.branch} onChange={handleChange} onBlur={() => validateField('branch', formData.branch)}>
                <option value="">Select Branch</option>
                {BRANCH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.branch && <p className="error-message">{errors.branch}</p>}
        </div>

        {/* BIOMETRIC CAPTURE (Webcam) */}
        <div className="title section-heading">Facial Biometric Capture (10 Photos)</div>
        <div className="webcam-section">
            <div className="webcam-container">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="webcam"
                />
            </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="buttons-container">
            <button type="button" className="submit" onClick={capturePhotos} disabled={photos.length >= 10}>
                {photos.length > 0 ? `Recapture (${photos.length}/10)` : 'Capture 10 Photos'}
            </button>
            <button type="submit" className="submit">Register Student</button>
        </div>

        {/* STATUS AND PREVIEW */}
        {message && <p className="status-message">{message}</p>}
        {photos.length > 0 && (
            <div className="photos-preview">
                <h4 className="label_input">Captured Photos ({photos.length}/10)</h4>
                {photos.map((photo, index) => (
                    <img key={index} src={photo} alt={`Captured ${index + 1}`} className="thumbnail" />
                ))}
            </div>
        )}
      </form>
    </div>
  );
}

export default RegistrationForm;