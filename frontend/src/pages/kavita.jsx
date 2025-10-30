







// import React, { useEffect, useState, useCallback, useRef } from 'react';
// import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
// import './AttendanceManager.css';

// // Vite exposes env variables via import.meta.env
// const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// export default function AttendanceManager() {
//     const { classId } = useParams();
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const [students, setStudents] = useState([]);
//     const [attendance, setAttendance] = useState([]);
//     const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
//     const [detectorRunning, setDetectorRunning] = useState(false);
//     const [lastUpdated, setLastUpdated] = useState(null);
//     const [loadingStudents, setLoadingStudents] = useState(true);
//     const token = localStorage.getItem('teacherToken');
//     const mountedRef = useRef(true); // Used to fix the duplicate React imports error

//     // Fetch registered students (protected endpoint)
//     useEffect(() => {
//         mountedRef.current = true;
//         const fetchStudents = async () => {
//             if (!token) { navigate('/teacher/login'); return; }
//             try {
//                 const res = await fetch(`${API_BASE}/api/teacher/registered-students`, { headers: { Authorization: `Bearer ${token}` } });
//                 if (!mountedRef.current) return;
//                 if (res.status === 401 || res.status === 403) {
//                     localStorage.removeItem('teacherToken');
//                     navigate('/teacher/login');
//                     return;
//                 }
//                 const data = await res.json().catch(() => ({}));
//                 setStudents(data.students || []);
//             } catch (err) {
//                 console.error('Error fetching registered students', err);
//             } finally {
//                 if (mountedRef.current) setLoadingStudents(false);
//             }
//         };
//         fetchStudents();
//         return () => { mountedRef.current = false; };
//     }, [token, navigate]);

//     // Fetch attendance for class/date
//     const fetchAttendance = useCallback(async () => {
//         if (!token) return;
//         try {
//             const res = await fetch(`${API_BASE}/api/teacher/attendance/${classId}/${date}`, { headers: { Authorization: `Bearer ${token}` } });
//             if (res.status === 401 || res.status === 403) {
//                 localStorage.removeItem('teacherToken');
//                 navigate('/teacher/login');
//                 return;
//             }
//             if (!res.ok) {
//                 setAttendance([]);
//                 return;
//             }
//             const body = await res.json().catch(() => ({}));
//             setAttendance(body.attendance || []);
//             setLastUpdated(new Date());
//         } catch (err) {
//             console.error('Error fetching attendance:', err);
//         }
//     }, [API_BASE, classId, date, token, navigate]);

//     // Poll attendance with adaptive interval depending on detectorRunning
//     useEffect(() => {
//         let interval = null;
//         let alive = true;
        
//         fetchAttendance();

//         const startPolling = () => {
//             const ms = detectorRunning ? 1000 : 5000; // 1s when active, 5s idle
//             interval = setInterval(() => { if (alive) fetchAttendance(); }, ms);
//         };

//         startPolling();
//         return () => { alive = false; if (interval) clearInterval(interval); };
//     }, [detectorRunning, fetchAttendance]);

//     // Poll detector status and trigger immediate refresh on start/stop
//     useEffect(() => {
//         let alive = true;
//         const check = async () => {
//             if (!token) return;
//             try {
//                 const res = await fetch(`${API_BASE}/api/teacher/attendance/status`, { headers: { Authorization: `Bearer ${token}` } });
//                 if (!alive) return;
//                 if (!res.ok) return;
//                 const body = await res.json().catch(() => ({}));
//                 const running = !!body.running;
                
//                 if (running && !detectorRunning) {
//                     setDetectorRunning(true);
//                     fetchAttendance().catch(() => {});
//                 } else if (!running && detectorRunning) {
//                     setDetectorRunning(false);
//                     fetchAttendance().catch(() => {});
//                 } else {
//                     setDetectorRunning(running);
//                 }
//             } catch (e) {
//                 // ignore network errors
//             }
//         };
//         check();
//         const t = setInterval(check, 2000);
//         return () => { alive = false; clearInterval(t); };
//     }, [token, detectorRunning, fetchAttendance]);

//     // autostart support via ?autostart=1
//     useEffect(() => {
//         const auto = searchParams.get('autostart');
//         if (auto === '1') setDetectorRunning(true);
//     }, [searchParams]);
    
//     const handleOverride = async (studentId, status) => {
//         if (new Date(date) > new Date()) { alert('Cannot mark attendance for future dates.'); return; }
//         try {
//             const res = await fetch(`${API_BASE}/api/teacher/attendance`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//                 body: JSON.stringify({ studentId, classId, date, status })
//             });
//             if (!res.ok) {
//                 const b = await res.json().catch(() => ({}));
//                 throw new Error(b && b.message ? b.message : 'Failed to override attendance');
//             }
//             await fetchAttendance();
//         } catch (err) {
//             console.error('Override error:', err);
//             alert('Failed to update attendance: ' + (err.message || ''));
//         }
//     };

//     const handleStopDetector = async () => {
//         if (!token) return;
//         try {
//             const res = await fetch(`${API_BASE}/api/teacher/attendance/stop`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
//             if (!res.ok) throw new Error('Failed to stop detector');
//             setDetectorRunning(false);
//             await fetchAttendance();
//             alert('Detector stopped');
//         } catch (err) {
//             console.error('Stop detector error:', err);
//             alert('Could not stop detector: ' + (err.message || ''));
//         }
//     };

//     // Utility: resolve a readable display name/time from an attendance record
//     const resolveDisplay = (rec) => {
//         const studentObj = rec.student || rec.studentDoc || null;
//         let name = 'Unknown';
//         let rollNo = '';
        
//         // 1. Resolve Name
//         if (studentObj) {
//              name = `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim();
//              rollNo = studentObj.rollNo || '';
//         } else if (rec.rollNo) {
//             const s = students.find(s => String(s.rollNo) === String(rec.rollNo));
//             if (s) {
//                  name = `${s.firstName} ${s.lastName}`.trim();
//                  rollNo = s.rollNo;
//             } else {
//                  name = `Roll No: ${rec.rollNo}`;
//                  rollNo = rec.rollNo;
//             }
//         }

//         // 2. Resolve Time
//         let timeStr = '';
//         if (rec.time) timeStr = rec.time;
//         else if (rec.timestamp) {
//             try { timeStr = new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch(e) { timeStr = ''; }
//         }
        
//         const rollDisplay = rollNo ? `(${rollNo})` : '';

//         return { fullName: `${name} ${rollDisplay}`.trim(), timeStr };
//     };

//     return (
//         <div className="dashboard-container class-attendance-container">
//             <div className="attendance-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
//                 <h2 className="attendance-title">Attendance Manager</h2>
//                 <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
//                     {detectorRunning && <button className="btn-ghost" onClick={handleStopDetector}>Stop Detector</button>}
//                     <button className="btn-back" onClick={() => navigate('/teacher/dashboard', { replace: true })}>&larr; Back</button>
//                 </div>
//             </div>

//             <div style={{ marginBottom: 24 }}>
//                 <label htmlFor="date-picker" className="date-label">Attendance for:</label>
//                 <input id="date-picker" type="date" value={date} onChange={e => setDate(e.target.value)} className="date-picker" />
//                 <div style={{ marginTop: 12 }}>
//                     {detectorRunning ? (
//                         <div className="detector-banner">
//                             <div className="detector-dot" />
//                             <div style={{ flex: 1 }}>
//                                 <strong>Face recognition active</strong>
//                                 <div style={{ fontSize: 12, color: '#333' }}>Detections will appear automatically below.</div>
//                                 {lastUpdated && <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</div>}
//                             </div>
//                         </div>
//                     ) : null}
//                 </div>
//             </div>

//             <div>
//                 <h3 className="section-title">All Registered Students</h3>
//                 {loadingStudents ? (
//                     <p className="empty-message">Loading students…</p>
//                 ) : students.length === 0 ? (
//                     <p className="empty-message">No students registered in this class.</p>
//                 ) : (
//                     <ul className="student-list">
//                         {students.map(stu => (
//                             <li key={stu._id} className="student-item">
//                                 {/* Display Name and Roll Number */}
//                                 <span>{stu.firstName} {stu.lastName} {stu.rollNo ? `(${stu.rollNo})` : ''}</span>
                                
//                                 <span>
//                                     <button disabled={new Date(date) > new Date()} onClick={() => handleOverride(stu._id, 'Present')} className="btn-present">Present</button>
//                                     <button disabled={new Date(date) > new Date()} onClick={() => handleOverride(stu._id, 'Absent')} className="btn-absent">Absent</button>
//                                 </span>
//                             </li>
//                         ))}
//                     </ul>
//                 )}
//             </div>

//             <div style={{ marginTop: 18 }}>
//                 <h3 className="section-title">Present Students</h3>
//                 <ul className="student-list present-list">
//                     {attendance.filter(a => (a.status || 'Present') === 'Present').length === 0 ? (
//                         <li className="student-item empty-row" style={{ justifyContent: 'center' }}>No one is marked present yet.</li>
//                     ) : (
//                         attendance.filter(a => (a.status || 'Present') === 'Present').map(a => {
//                             const { fullName, timeStr } = resolveDisplay(a);
//                             return (
//                                 <li key={a._id || (a.student && a.student._id) || fullName} className="student-item">
//                                     <div>{fullName}</div>
//                                     <div style={{ color: 'var(--success)', fontWeight: 700 }}>{timeStr}</div>
//                                 </li>
//                             );
//                         })
//                     )}
//                 </ul>
//             </div>
//         </div>
//     );
// }
