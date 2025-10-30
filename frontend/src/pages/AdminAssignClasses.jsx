import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './admin/AdminAssignClasses.css';

const AdminAssignClasses = () => {
  const { teacherId } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`http://localhost:5000/api/admin/teachers/${teacherId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setTeacher(data.teacher))
      .catch(err => console.error(err));

    fetch('http://localhost:5000/api/admin/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClasses(data.classes || []))
      .catch(err => console.error(err));
  }, [teacherId]);

  useEffect(() => {
    if (teacher && teacher.assignedClasses) {
      setSelected(teacher.assignedClasses.map(c => c._id));
    }
  }, [teacher]);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/teachers/${teacherId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classIds: selected })
      });
      if (!res.ok) throw new Error('Failed to assign classes');
      alert('Assigned classes');
      navigate('/admin/teachers');
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  if (!teacher) return (
    <div className="admin-assign-classes-page">
      <div className="admin-portal-container">Loading...</div>
    </div>
  );

  return (
    <div className="admin-assign-classes-page">
      <div className="admin-portal-container">
        <div className="back-button-container">
          <button className="back-button" onClick={() => navigate('/admin/teachers')}>← Back</button>
        </div>
        <h2>Assign Classes to {teacher.firstName} {teacher.lastName}</h2>
        <form onSubmit={submit} className="admin-form">
          {classes.map(c => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} />
              <div>{c.name} — {c.subject} ({c.branch} - {c.semester})</div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <button className="btn-primary" type="submit">Save Assignments</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAssignClasses;
