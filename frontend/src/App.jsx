import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './TeacherPortal.css'; 

// Import all required components
import RegistrationForm from './components/RegistrationForm';
import MainLanding from './pages/MainLanding';
import TeacherLogin from './pages/TeacherLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import AttendanceManager from './pages/AttendanceManager';
import AttendanceHistory from './pages/AttendanceHistory'; // Newly added import
import Gate from './components/Gate'; // The route protector
import AdminDashboard from './pages/AdminDashboard';
import AdminClassStudents from './pages/AdminClassStudents';
import AdminCreateTeacher from './pages/AdminCreateTeacher';
import AdminLogin from './pages/AdminLogin';
import AdminCreateClass from './pages/AdminCreateClass';
import AdminTeachers from './pages/AdminTeachers';
import AdminAssignClasses from './pages/AdminAssignClasses';
import AdminLayout from './pages/admin/AdminLayout';
import TeacherForgot from './pages/TeacherForgot';
import TeacherResetPassword from './pages/TeacherResetPassword';
import AdminResetPassword from './pages/AdminResetPassword';
import AdminManageTeacher from './pages/AdminManageTeacher';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLanding />} />
          <Route path="/student/register" element={<RegistrationForm />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/forgot-password" element={<TeacherForgot />} />
          <Route path="/teacher/reset-password" element={<TeacherResetPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />

          {/* --- Protected Routes (Teacher Portal) --- */}
          {/* Only users with a 'teacherToken' can access nested routes */}
          <Route element={<Gate role="teacher" />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/class/:classId" element={<AttendanceManager />} />
            <Route path="/teacher/class/:classId/history" element={<AttendanceHistory />} /> {/* Newly added route */}
          </Route>
          
          {/* Fallback route */}
          <Route path="*" element={<h2>404 Not Found</h2>} />
          {/* Admin Routes */}
          {/* Serve the login page when the user navigates to /admin */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<Gate role="admin" />}>
            {/* Protected admin pages live under /admin/... Layout loads shared AdminPortal.css */}
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/class/:classId/students" element={<AdminClassStudents />} />
              <Route path="/admin/create-teacher" element={<AdminCreateTeacher />} />
              <Route path="/admin/create-class" element={<AdminCreateClass />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route path="/admin/teacher/:teacherId/assign" element={<AdminAssignClasses />} />
              <Route path="/admin/teachers/:id" element={<AdminManageTeacher />} />
              <Route path="/admin/teachers/:id/assign" element={<AdminManageTeacher />} /> {/* reuse: assign handled via page or implement assign UI */}
            </Route>
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;