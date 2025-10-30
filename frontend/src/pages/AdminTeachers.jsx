import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/api';
import './admin/AdminTeachers.css';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignModalFor, setAssignModalFor] = useState(null); // teacher object
  const [selectedClasses, setSelectedClasses] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [tRes, cRes] = await Promise.all([
        fetchWithAuth('/api/admin/teachers'),
        fetchWithAuth('/api/admin/classes'),
      ]);
      if (!tRes.ok) throw new Error('Failed to load teachers');
      const tBody = await tRes.json();
      setTeachers(tBody.teachers || []);
      if (cRes.ok) {
        const cBody = await cRes.json();
        setClassesList(cBody.classes || []);
      } else {
        setClassesList([]);
      }
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function openAssignModal(teacher) {
    setAssignModalFor(teacher);
    const assigned = new Set((teacher.assignedClasses || []).map(id => String((id && (id._id || id)) || id)));
    setSelectedClasses(assigned);
  }

  function toggleClass(classId) {
    setSelectedClasses(prev => {
      const next = new Set(prev);
      const key = String(classId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveAssignments() {
    if (!assignModalFor) return;
    setSaving(true);
    try {
      const teacherId = assignModalFor._id || assignModalFor.id;
      const prevAssigned = new Set((assignModalFor.assignedClasses || []).map(id => String((id && (id._id || id)) || id)));
      const wanted = new Set(Array.from(selectedClasses).map(String));

      // determine additions and removals
      const toAssign = Array.from(wanted).filter(id => !prevAssigned.has(id));
      const toRemove = Array.from(prevAssigned).filter(id => !wanted.has(id));

      // perform requests
      await Promise.all([
        ...toAssign.map(id =>
          fetchWithAuth(`/api/admin/teachers/${teacherId}/assign-class`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: id }),
          })
        ),
        ...toRemove.map(id =>
          fetchWithAuth(`/api/admin/teachers/${teacherId}/assigned-classes/${id}`, {
            method: 'DELETE',
          })
        ),
      ]);

      await loadData();
      setAssignModalFor(null);
      setSelectedClasses(new Set());
    } catch (err) {
      console.error(err);
      setError('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  }

  async function removeTeacher(teacherId) {
    if (!confirm('Remove teacher permanently?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/teachers/${teacherId}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        throw new Error(`Remove failed: ${res.status} ${txt}`);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      setError(String(err.message || 'Failed to remove teacher'));
    }
  }

  return (
    <div className="admin-main-box">
      <div className="admin-header">
        <h2 className="admin-heading">Teachers ({teachers.length})</h2>
        <button className="btn-create" onClick={() => navigate('/admin/create-teacher')}>Create Teacher</button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading...</div>}

      <div className="teacher-list">
        {teachers.map(t => (
          <div key={t._id || t.id} className="teacher-card">
            <div className="teacher-name">{t.firstName ? `${t.firstName} ${t.lastName}` : (t.username || '—')}</div>
            <div className="teacher-actions">
              <button className="btn-primary" onClick={() => navigate(`/admin/teachers/${t._id || t.id}`)}>Manage</button>
              <button className="btn-primary" onClick={() => openAssignModal(t)}>Assign Classes</button>
              <button className="btn-ghost" onClick={() => removeTeacher(t._id || t.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Classes Modal */}
      {assignModalFor && (
        <div style={{
          position:'fixed', left:0, top:0, right:0, bottom:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.4)', zIndex:9999
        }}>
          <div style={{width:720, maxWidth:'95%', background:'#fff', padding:20, borderRadius:12}}>
            <h3>Assign classes to {assignModalFor.firstName ? `${assignModalFor.firstName} ${assignModalFor.lastName}` : assignModalFor.username}</h3>
            <div style={{maxHeight:360, overflow:'auto', marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
              {classesList.length === 0 && <div>No classes available.</div>}
              {classesList.map(cls => {
                const id = String(cls._id || cls.id);
                return (
                  <label key={id} style={{display:'flex',alignItems:'center',gap:10,padding:8,borderRadius:8,border:'1px solid #f2f0ff'}}>
                    <input type="checkbox" checked={selectedClasses.has(id)} onChange={()=>toggleClass(id)} />
                    <div>
                      <div style={{fontWeight:700}}>{cls.name || cls.title}</div>
                      <div style={{fontSize:12,color:'#666'}}>{cls.description || ''}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}>
              <button className="btn-ghost" onClick={()=>{ setAssignModalFor(null); setSelectedClasses(new Set()); }}>Cancel</button>
              <button className="btn-primary" onClick={saveAssignments} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
