import React from 'react';
import RegistrationForm from '../components/RegistrationForm';
import './TeacherPortal.css';

export default function StudentPortal() {
  return (
    <div className="dashboard-container">
      <div className="teacher-card">
        <div>
          <h2 className="teacher-name">Student Portal</h2>
          <p className="teacher-email">Register your biometric profile here to allow attendance tracking.</p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <RegistrationForm />
      </div>
    </div>
  );
}
