import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin/AdminCreateTeacher.css';

const AdminCreateTeacher = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch('http://localhost:5000/api/admin/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClasses(data.classes || []))
      .catch(err => console.error(err));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token) {
      alert('You must be logged in as admin to perform this action.');
      return navigate('/admin/login');
    }

    try {
      const res = await fetch('http://localhost:5000/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, username, password, email })
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = body && body.message ? body.message : `Failed to create teacher (status ${res.status})`;
        console.error('Create teacher failed:', message, body);
        alert(message);
        return;
      }

      const teacherId = body.teacherId;

      if (selected.length > 0) {
        const assignRes = await fetch(`http://localhost:5000/api/admin/teachers/${teacherId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ classIds: selected })
        });
        const assignBody = await assignRes.json().catch(() => ({}));
        if (!assignRes.ok) {
          const msg = assignBody && assignBody.message ? assignBody.message : `Failed to assign classes (status ${assignRes.status})`;
          console.error('Assign classes failed:', msg, assignBody);
          alert(msg);
          // still proceed — teacher created but assignment failed
        }
      }

      alert('Teacher created');
      navigate('/admin/teachers');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unexpected error while creating teacher');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="dashboard-container admin-create-teacher-page admin-create-teacher-wrapper">
      <h2>Create Teacher</h2>
      <form onSubmit={submit} style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input type="text" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          <input type="text" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>
        <div style={{ marginTop: 12 }}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div style={{ marginTop: 12 }}>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        </div>
        <div style={{ marginTop: 12 }}>
          <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>Assign Classes (optional)</h4>
          {classes.map(c => (
            <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggleSelect(c._id)} />
              <div>{c.name} — {c.subject}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <button className="btn-primary" type="submit">Create Teacher</button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateTeacher;
