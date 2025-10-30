import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import './AttendanceManager.css';

// Vite exposes env variables via import.meta.env
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const AttendanceManager = (props) => {
  // enable manual present/absent controls after Start Attendance
  const [attendanceActive, setAttendanceActive] = useState(false);
  // show controls immediately if AttendanceManager opened with ?mode=start or ?autostart=1
  const location = useLocation();
  const urlMode = new URLSearchParams(location.search).get('mode');
  const urlAutostart = new URLSearchParams(location.search).get('autostart');
  const startMode = urlMode === 'start' || urlAutostart === '1';
  // final flag used in JSX to render Present / Absent buttons
  const showControls = startMode || attendanceActive;

  const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd for native date input max
  // prevent future date selection for the date picker (yyyy-mm-dd)
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // e.g. 'view' for view-only mode
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [detectorRunning, setDetectorRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const token = localStorage.getItem('teacherToken');
  const mountedRef = useRef(true); // Defensive mounted flag

  // Fetch registered students (protected endpoint)
  useEffect(() => {
      mountedRef.current = true;
      const fetchStudents = async () => {
          if (!token) { navigate('/teacher/login'); return; }
          try {
              // Fetch students for this specific class so 'View' only shows class members
              const res = await fetch(`${API_BASE}/api/teacher/class/${classId}/students`, { headers: { Authorization: `Bearer ${token}` } });
              if (!mountedRef.current) return;

              if (res.status === 401) {
                  localStorage.removeItem('teacherToken');
                  navigate('/teacher/login');
                  return;
              }

              // We'll attempt a fallback when access is denied or when the class has no students
              let data = {};
              if (res.ok) {
                  data = await res.json().catch(() => ({}));
              }

              let classStudents = data.students || [];

              // If the endpoint returned populated student objects, use them directly
              const looksPopulated = classStudents.length > 0 && typeof classStudents[0] === 'object' && (classStudents[0].firstName || classStudents[0].rollNo);

              if (looksPopulated) {
                  setStudents(classStudents);
              } else if (classStudents.length > 0) {
                  // classStudents appears to be an array of ids -> fetch registered students and map ids to objects
                  try {
                      const regRes = await fetch(`${API_BASE}/api/teacher/registered-students`, { headers: { Authorization: `Bearer ${token}` } });
                      if (regRes.ok) {
                          const regBody = await regRes.json().catch(() => ({}));
                          const reg = regBody.students || [];
                          const byId = new Map(reg.map(s => [String(s._id), s]));
                          const populated = classStudents.map(id => byId.get(String(id)) || { _id: id, firstName: 'Unknown', lastName: '' });
                          setStudents(populated);
                      } else {
                          // cannot fetch registered students -> show placeholders for ids
                          setStudents(classStudents.map(id => ({ _id: id, firstName: 'Unknown', lastName: '' })));
                      }
                  } catch (e) {
                      console.error('Error mapping class student IDs to registered students', e);
                      setStudents(classStudents.map(id => ({ _id: id, firstName: 'Unknown', lastName: '' })));
                  }
              } else {
                  // classStudents empty or access denied
                  // If we're in view-only mode, attempt branch-based fallback to display the class's registered students by branch.
                  if (mode === 'view') {
                      try {
                          const classesRes = await fetch(`${API_BASE}/api/teacher/classes`, { headers: { Authorization: `Bearer ${token}` } });
                          let branch = null;
                          if (classesRes.ok) {
                              const classesBody = await classesRes.json().catch(() => ({}));
                              const allClasses = classesBody.classes || [];
                              const thisClass = allClasses.find(c => String(c._id) === String(classId));
                              branch = thisClass ? thisClass.branch : null;
                          }

                          if (branch) {
                              const regRes = await fetch(`${API_BASE}/api/teacher/registered-students`, { headers: { Authorization: `Bearer ${token}` } });
                              if (regRes.ok) {
                                  const regBody = await regRes.json().catch(() => ({}));
                                  const reg = regBody.students || [];
                                  // tolerant match on branch
                                  const normalize = str => (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '');
                                  const initials = str => (str || '').toString().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).map(w => w[0]).join('');
                                  const isSubsequence = (small, big) => {
                                      let i = 0, j = 0;
                                      while (i < small.length && j < big.length) {
                                          if (small[i] === big[j]) i++;
                                          j++;
                                      }
                                      return i === small.length;
                                  };
                                  const targetNorm = normalize(branch);
                                  const targetShort = targetNorm;
                                  const matched = reg.filter(s => {
                                      const sb = (s.branch || '') + '';
                                      const sNorm = normalize(sb);
                                      if (!sNorm) return false;
                                      if (sNorm.includes(targetNorm) || targetNorm.includes(sNorm)) return true;
                                      const sInit = initials(sb);
                                      if (isSubsequence(targetShort, sInit) || isSubsequence(sInit, targetShort)) return true;
                                      return false;
                                  });
                                  setStudents(matched);
                              } else {
                                  setStudents([]);
                              }
                          } else {
                              setStudents([]);
                          }
                      } catch (e) {
                          console.error('View-mode fallback error:', e);
                          setStudents([]);
                      }
                  } else {
                      setStudents([]);
                  }
              }
          } catch (err) {
              console.error('Error fetching class students', err);
          } finally {
              if (mountedRef.current) setLoadingStudents(false);
          }
      };
      fetchStudents();
      return () => { mountedRef.current = false; };
  }, [token, navigate, classId]);

  // Fetch attendance for class/date
  const fetchAttendance = useCallback(async () => {
      if (!token) return;
      try {
          const res = await fetch(`${API_BASE}/api/teacher/attendance/${classId}/${date}`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.status === 401 || res.status === 403) {
              localStorage.removeItem('teacherToken');
              navigate('/teacher/login');
              return;
          }
          if (!res.ok) {
              setAttendance([]);
              return;
          }
          const body = await res.json().catch(() => ({}));
          // dev-only console log to help debug missing-present issues
          if (process.env.NODE_ENV !== 'production') console.debug('Attendance API response:', body);
          setAttendance(body.attendance || []);
          setLastUpdated(new Date());
      } catch (err) {
          console.error('Error fetching attendance:', err);
      }
  }, [classId, date, token, navigate]);

  // Poll attendance with adaptive interval depending on detectorRunning
  useEffect(() => {
      let interval = null;
      let alive = true;
      fetchAttendance();

      const startPolling = () => {
          const ms = detectorRunning ? 1000 : 5000; // 1s when active, 5s idle
          interval = setInterval(() => { if (alive) fetchAttendance(); }, ms);
      };

      startPolling();
      return () => { alive = false; if (interval) clearInterval(interval); };
  }, [detectorRunning, fetchAttendance]);

  // Poll detector status and trigger immediate refresh on start/stop
  useEffect(() => {
      let alive = true;
      const check = async () => {
          if (!token) return;
          try {
              const res = await fetch(`${API_BASE}/api/teacher/attendance/status`, { headers: { Authorization: `Bearer ${token}` } });
              if (!alive) return;
              if (!res.ok) return;
              const body = await res.json().catch(() => ({}));
              const running = !!body.running;

                if (running && !detectorRunning) {
                    setDetectorRunning(true);
                    fetchAttendance().catch(() => {});
                } else if (!running && detectorRunning) {
                    setDetectorRunning(false);
                    fetchAttendance().catch(() => {});
                } else {
                    setDetectorRunning(running);
                }
            } catch (e) {
                // ignore network errors
            }
        };
        check();
        const t = setInterval(check, 2000);
        return () => { alive = false; clearInterval(t); };
    }, [token, detectorRunning, fetchAttendance]);

    // autostart support via ?autostart=1 (ignored in view-only mode)
    useEffect(() => {
        const auto = searchParams.get('autostart');
        if (auto === '1' && mode !== 'view') setDetectorRunning(true);
    }, [searchParams, mode]);

    const handleOverride = async (studentId, status) => {
        if (new Date(date) > new Date()) { alert('Cannot mark attendance for future dates.'); return; }
        try {
            const res = await fetch(`${API_BASE}/api/teacher/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ studentId, classId, date, status })
            });
            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                throw new Error(b && b.message ? b.message : 'Failed to override attendance');
            }
            await fetchAttendance();
        } catch (err) {
            console.error('Override error:', err);
            alert('Failed to update attendance: ' + (err.message || ''));
        }
    };

    const handleStopDetector = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/teacher/attendance/stop`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to stop detector');
            setDetectorRunning(false);
            await fetchAttendance();
            alert('Detector stopped');
        } catch (err) {
            console.error('Stop detector error:', err);
            alert('Could not stop detector: ' + (err.message || ''));
        }
    };

    const handleStartDetector = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/teacher/attendance/start`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                throw new Error(b && b.message ? b.message : 'Failed to start detector');
            }
            // Mark running locally and immediately refresh attendance
            setDetectorRunning(true);
            await fetchAttendance();
            alert('Detector started');
        } catch (err) {
            console.error('Start detector error:', err);
            alert('Could not start detector: ' + (err.message || ''));
        }
    };

    // Utility: resolve a readable display name/time from an attendance record
    // Accepts optional `studentObj` (registered student object) to prefer canonical name/roll
    const resolveDisplay = (rec, studentObj = null) => {
        let name = 'Unknown';
        let rollNo = '';

        // Prefer linked student object (from registered students) when available
        if (studentObj) {
            name = `${studentObj.firstName || ''} ${studentObj.lastName || ''}`.trim();
            rollNo = studentObj.rollNo || '';
        } else if (rec && typeof rec.student === 'object' && rec.student && rec.student.firstName) {
            // In case the record contains a populated student object
            name = `${rec.student.firstName || ''} ${rec.student.lastName || ''}`.trim();
            rollNo = rec.student.rollNo || rec.rollNo || '';
        } else if (rec.studentFirstName || rec.studentLastName) {
            // Raw attendance docs may include studentFirstName/studentLastName
            name = `${rec.studentFirstName || ''} ${rec.studentLastName || ''}`.trim();
            if (rec.rollNo) rollNo = rec.rollNo;
        } else if (rec.name || rec.studentName) {
            // Some producers write a combined name field
            name = (rec.name || rec.studentName).trim();
            if (rec.rollNo) rollNo = rec.rollNo;
        } else if (rec.rollNo) {
            // Fallback: match by roll number to registered students
            const s = students.find(s => String(s.rollNo) === String(rec.rollNo));
            if (s) {
                name = `${s.firstName} ${s.lastName}`.trim();
                rollNo = s.rollNo;
            } else {
                name = `Roll No: ${rec.rollNo}`;
                rollNo = rec.rollNo;
            }
        }

        let timeStr = '';
        if (rec.time) timeStr = rec.time;
        else if (rec.timestamp) {
            try { timeStr = new Date(rec.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } catch(e) { timeStr = ''; }
        }

        const rollDisplay = rollNo ? `(${rollNo})` : '';
        return { fullName: `${name} ${rollDisplay}`.trim(), timeStr };
    };

    // Build a quick lookup of which registered students are present according to attendance records.
    // We match by linked student id, by rollNo, or by exact name match as a fallback.
    const presentMap = React.useMemo(() => {
        const map = new Map(); // key: studentId or rawKey -> { student, record }
        const rollToStudentId = new Map();
        students.forEach(s => { if (s.rollNo) rollToStudentId.set(String(s.rollNo), String(s._id)); });

        attendance.forEach(rec => {
            const status = (rec.status || 'Present');
            if (status !== 'Present') return;

            // Try to resolve a registered student id for this record
            let sid = null;
            if (rec.student && typeof rec.student === 'object' && rec.student._id) sid = String(rec.student._id);
            else if (rec.student && typeof rec.student === 'string') sid = String(rec.student);
            else if (rec.studentId) sid = String(rec.studentId);
            else if (rec.rollNo && rollToStudentId.has(String(rec.rollNo))) sid = rollToStudentId.get(String(rec.rollNo));
            else if ((rec.roll_number || rec.roll) && rollToStudentId.has(String(rec.roll_number || rec.roll))) sid = rollToStudentId.get(String(rec.roll_number || rec.roll));
            else {
                // try matching by name
                const rawName = (rec.name || `${rec.studentFirstName || ''} ${rec.studentLastName || ''}`).trim().toLowerCase();
                if (rawName) {
                    const found = students.find(s => ((s.firstName || '') + ' ' + (s.lastName || '')).trim().toLowerCase() === rawName);
                    if (found) sid = String(found._id);
                }
            }

            if (sid) {
                map.set(sid, { student: students.find(s => String(s._id) === String(sid)), record: rec });
            } else {
                // raw unmatched entry - include under a raw key so it appears in Present list
                const rawKey = `raw:${rec._id || Math.random()}`;
                map.set(rawKey, { student: null, record: rec });
            }
        });

        return map;
    }, [attendance, students]);

    // Lookup: studentId -> recorded status (Present/Absent/other). Reused by UI buttons.
    const attendanceStatusMap = React.useMemo(() => {
        const m = new Map();
        attendance.forEach(rec => {
            let sid = null;
            if (rec.student && typeof rec.student === 'object' && rec.student._id) sid = String(rec.student._id);
            else if (rec.student && typeof rec.student === 'string') sid = String(rec.student);
            else if (rec.studentId) sid = String(rec.studentId);
            if (sid) m.set(sid, rec.status || 'Present');
        });
        return m;
    }, [attendance]);

    const presentStudentIds = React.useMemo(() => {
        const s = new Set();
        for (const [key, val] of presentMap.entries()) {
            if (val && val.student && val.student._id) s.add(String(val.student._id));
        }
        return s;
    }, [presentMap]);

    return (
        <div className="dashboard-container class-attendance-container">
            <div className="attendance-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                {/* hide the main heading in view-only mode */}
                {mode !== 'view' && <h2 className="attendance-title">Attendance Manager</h2>}
                <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <button className="btn-back" onClick={() => navigate('/teacher/dashboard', { replace: true })}>&larr; Back</button>
                </div>
            </div>

            {mode !== 'view' && (
                <div style={{ marginBottom: 24 }}>
                    <label htmlFor="date-picker" className="date-label">Attendance for:</label>
                    {/* prevent selecting future dates */}
                    <input id="date-picker" type="date" value={date} onChange={e => setDate(e.target.value)} max={today} />
                    <div style={{ marginTop: 12 }}>
                        {detectorRunning ? (
                            <div className="detector-banner">
                                <div className="detector-dot" />
                                <div style={{ flex: 1 }}>
                                    <strong>Face recognition active</strong>
                                    <div style={{ fontSize: 12, color: '#333' }}>Detections will appear automatically below.</div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                        {!detectorRunning ? (
                            <button className="start-btn-light" onClick={handleStartDetector} aria-label="Start attendance">Start Attendance</button>
                        ) : (
                            <button className="start-btn-light stop" onClick={handleStopDetector} aria-label="Stop attendance">Stop Attendance</button>
                        )}
                    </div>
                </div>
            )}

            <div>
                <h3 className="section-title">All Registered Students</h3>
                {/* fetchMessage/banner removed - showing only class students */}
                {loadingStudents ? (
                    <p className="empty-message">Loading students…</p>
                ) : students.length === 0 ? (
                    <p className="empty-message">No students registered in this class.</p>
                ) : (
                    <ul className="student-list">
                        {students.map(stu => {
                            const name = `${stu.firstName || ''} ${stu.lastName || ''}`.trim() || stu.username || '—';
                            const roll = stu.rollNo || stu.roll || stu.rollNumber || '';
                            // currentStatus lookup kept from existing logic if present
                            const currentStatus = (attendanceStatusMap && attendanceStatusMap.get && attendanceStatusMap.get(String(stu._id))) || (presentStudentIds && presentStudentIds.has && presentStudentIds.has(String(stu._id)) ? 'Present' : '');

                            return (
                                <li key={stu._id} className="student-item" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                                    <div>
                                        <div style={{fontWeight:700}}>{name}</div>
                                        {roll ? <div style={{fontSize:12,color:'#666'}}>{roll}</div> : null}
                                    </div>

                                    {/* show controls only when attendance has been started */}
                                    {showControls ? (
                                      <div style={{display:'flex',gap:8}}>
                                        <button
                                            type="button"
                                            className={`att-btn att-present ${currentStatus === 'Present' ? 'active' : ''}`}
                                            onClick={() => handleOverride ? handleOverride(String(stu._id), 'Present') : null}
                                            aria-pressed={currentStatus === 'Present'}
                                        >
                                            Present
                                        </button>

                                        <button
                                            type="button"
                                            className={`att-btn att-absent ${currentStatus === 'Absent' ? 'active' : ''}`}
                                            onClick={() => handleOverride ? handleOverride(String(stu._id), 'Absent') : null}
                                            aria-pressed={currentStatus === 'Absent'}
                                        >
                                            Absent
                                        </button>
                                      </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {!mode || mode !== 'view' ? (
                <div style={{ marginTop: 18 }}>
                    <h3 className="section-title">Present Students</h3>
                    <ul className="student-list present-list">
                            {presentMap.size === 0 ? (
                            <li className="student-item empty-row" style={{ justifyContent: 'center' }}>No one is marked present yet.</li>
                        ) : (
                            Array.from(presentMap.values()).map(({ student, record }) => {
                                // prefer the registered student object when rendering display
                                const { fullName, timeStr } = resolveDisplay(record, student || null);
                                const key = (student && student._id) || record.student || record._id || fullName;
                                return (
                                    <li key={key} className="student-item">
                                        <div>{fullName}</div>
                                        <div style={{ color: 'var(--success)', fontWeight: 700 }}>{timeStr}</div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            ) : null}

                {/* Debug panel removed per UI request - raw attendance debug output hidden in production and development */}
        </div>
    );
}

/**
 * Minimal safe fallback for AttendanceManager.
 * Replace with your full logic after you collect the runtime error.
 */
export function AttendanceManagerFallback(props) {
  const [started, setStarted] = useState(false);
  const students = props.students || [];

  return (
    <div style={{ padding: 20 }}>
      <h2>Attendance Manager</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setStarted(s => !s)}>
          {started ? 'Attendance Started (toggle)' : 'Start Attendance'}
        </button>
      </div>

      <h3>All Registered Students</h3>
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {students.length === 0 ? (
          <li>No registered students</li>
        ) : (
          students.map(s => (
            <li key={s._id || s.rollNo || Math.random()} style={{ padding: 8, border: '1px solid #eee', marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{(s.firstName || '') + ' ' + (s.lastName || '')}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{s.rollNo || s.roll || ''}</div>
            </li>
          ))
        )}
      </ul>

      <div style={{ marginTop: 24, color: '#888' }}>
        This is a temporary fallback. Paste the runtime error (browser console or terminal) and I will restore the original logic.
      </div>
    </div>
  );
}

export default AttendanceManager;



















