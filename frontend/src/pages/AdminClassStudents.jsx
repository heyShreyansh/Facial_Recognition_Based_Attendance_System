import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminClassStudents.css';
import AttendanceManager from './AttendanceManager';

const AdminClassStudents = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('adminToken');
        console.log('[AdminClassStudents] classId=', classId, 'tokenPresent=', !!token);

        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`http://localhost:5000/api/admin/classes/${classId}/students`, { headers });
        console.log('[AdminClassStudents] fetch status=', res.status);
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`Request failed ${res.status} ${txt}`);
        }
        const data = await res.json();
        console.log('[AdminClassStudents] response:', data);
        setStudents(data.students || []);
      } catch (err) {
        console.error('[AdminClassStudents] error:', err);
        setError(String(err.message || err));
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classId]);

  return (
    <div className="admin-class-students-page">
      <div className="admin-portal-container">
        <button className="btn-ghost" onClick={() => navigate(-1)}>&larr; Back</button>
        <h2>Students in Class</h2>

        {loading && <p>Loading students…</p>}
        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

        {!loading && !error && students.length === 0 && (
          <p>No students registered in this class.</p>
        )}

        {!loading && students.length > 0 && (
          <ul className="student-list">
            {students.map(s => {
              const name = s.firstName ? `${s.firstName} ${s.lastName || ''}` : (s.username || '—');
              const roll = s.rollNo ?? s.roll ?? s.rollNumber ?? 'No roll';
              return (
                <li
                  key={s._id || s.username}
                  className="student-item"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}
                >
                  <div style={{ fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>{roll}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminClassStudents;
