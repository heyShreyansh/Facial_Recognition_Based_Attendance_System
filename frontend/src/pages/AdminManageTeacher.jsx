import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import './admin/AdminManageTeacher.css';

export default function AdminManageTeacher() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true); setError('');
    try {
      const [tRes, cRes] = await Promise.all([
        fetchWithAuth(`/api/admin/teachers/${id}`),
        fetchWithAuth('/api/admin/classes'),
      ]);
      if (!tRes.ok) {
        const txt = await tRes.text().catch(()=>'');
        throw new Error(`Load teacher failed: ${tRes.status} ${txt}`);
      }
      const tBody = await tRes.json();
      setTeacher(tBody.teacher || null);

      if (cRes.ok) {
        const cBody = await cRes.json();
        setClassesList(cBody.classes || []);
      } else setClassesList([]);
    } catch (err) {
      setError(String(err.message || err));
    } finally { setLoading(false); }
  }

  async function removeAssignedClass(classId) {
    if (!confirm('Remove this class from teacher?')) return;
    const res = await fetchWithAuth(`/api/admin/teachers/${id}/assigned-classes/${classId}`, { method: 'DELETE' });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      setError(`Remove class failed: ${res.status} ${txt}`);
      return;
    }
    await load();
  }

  if (loading) return <div>Loading...</div>;
  if (!teacher) return <div>{error || 'Teacher not found'}</div>;

  return (
    <div className="admin-manage-teacher">
      <button onClick={() => navigate(-1)} style={{marginBottom:12}}>← Back</button>
      <h2>{teacher.firstName ? `${teacher.firstName} ${teacher.lastName}` : teacher.username}</h2>

      <div style={{marginTop:8,fontSize:14,color:'#444'}}>
        <div><strong>Email:</strong> {teacher.email || '—'}</div>
        <div><strong>Username:</strong> {teacher.username || '—'}</div>
      </div>

      <h3 style={{marginTop:20}}>Assigned classes ({(teacher.assignedClasses || []).length})</h3>
      <div style={{marginTop:8}}>
        {(teacher.assignedClasses || []).length === 0 && <div>No assigned classes.</div>}
        <ul>
          {(teacher.assignedClasses || []).map(a => {
            const classObj = (typeof a === 'object') ? a : classesList.find(c => String(c._id||c.id) === String(a));
            return (
              <li key={typeof a === 'object' ? (a._id||a.id) : a} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0'}}>
                <div>{classObj ? (classObj.name || classObj.title) : a}</div>
                <button className="btn-ghost" onClick={() => removeAssignedClass(typeof a === 'object' ? (a._id||a.id) : a)}>Remove</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}