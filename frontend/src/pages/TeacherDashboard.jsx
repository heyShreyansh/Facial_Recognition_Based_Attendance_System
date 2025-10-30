import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherDashboard.css'; 

const TeacherDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [teacherInfo, setTeacherInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('teacherToken');
        if (!token) {
            navigate('/teacher/login');
            return;
        }

        const fetchTeacherInfo = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/teacher/profile', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setTeacherInfo(data.teacher);
                }
            } catch (err) {
                // Handle token/fetch error silently for profile
            }
        };

        const fetchClasses = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/teacher/classes', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch classes. Access denied or token expired.');
                }
                const data = await response.json();
                setClasses(data.classes);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
                if (err.message.includes('Access denied')) {
                    localStorage.removeItem('teacherToken');
                    navigate('/teacher/login');
                }
            }
        };

        fetchTeacherInfo();
        fetchClasses();
    }, [navigate]);

    const handleClassClick = (classId) => {
        // Navigates to the attendance manager for the selected class (route defined in App.jsx)
        // view-only mode: show only registered students
        navigate(`/teacher/class/${classId}?mode=view`);
    };

    if (loading) return <p className="loading">Loading classes...</p>;
    if (error) return <p className="error-message">Error: {error}</p>;
    
    // --- StartAttendanceButton Component Definition (Assumed to be in this file) ---
    // NOTE: Actual logic is complex; this is a simplified structure for rendering.
    const StartAttendanceButton = ({ classId, centerGreen = false }) => {
      const [running] = React.useState(false); 
      const [loading] = React.useState(false);
      const navigate = useNavigate();

      const handleStart = () => {
          // open AttendanceManager in "start" mode so manual controls are available immediately
          navigate(`/teacher/class/${classId}?mode=start`);
      };
  
      return (
        <button
          onClick={handleStart}
          disabled={loading || running}
          className="start-attendance-btn" 
        >
          {loading ? 'Starting…' : (running ? 'Running' : 'Start Attendance')}
        </button>
      );
    };

    return (
        <div className="dashboard-container">
            
            {teacherInfo && (
                <section className="teacher-card">
                    <div className="teacher-card-left">
                        <h2 className="teacher-name">Hello, {teacherInfo.firstName} {teacherInfo.lastName}!</h2>
                        <p className="teacher-email">
                           <span className="meta-detail">ID: {teacherInfo._id}</span> 
                           <span className="meta-detail">Email: {teacherInfo.email}</span>
                        </p>
                    </div>
                </section>
            )}

            {/* CRITICAL FIX: Added zIndex to the wrapper to force visibility */}
            {classes.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, zIndex: 15, position: 'relative' }}>
                    <StartAttendanceButton classId={classes[0]._id} centerGreen={true} />
                </div>
            )}
            
            <h2 className="section-heading">Classes for Attendance Tracking</h2>

            {classes.length === 0 ? (
                <p className="empty-message">You are not currently assigned to any classes.</p>
            ) : (
                <div className="class-list">
                    {classes.map((cls) => (
                        <div 
                            key={cls._id} 
                            className="class-card" 
                            onClick={() => handleClassClick(cls._id)}
                        >
                            <div className="class-card-body">
                                <h3 className="class-title">{cls.name} ({cls.subject})</h3>
                                <p className="meta">Branch: {cls.branch}</p>
                                <p className="meta">Semester: {cls.semester}</p>
                            </div>
                            <div className="class-card-cta">
                                View &rarr;
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;

// when rendering AttendanceManager for start attendance:
// <AttendanceManager attendanceActive={true} ...otherProps />

















