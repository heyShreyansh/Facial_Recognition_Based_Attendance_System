import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin/AdminCreateClass.css';

const AdminCreateClass = () => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [branch, setBranch] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    if (!token) {
      // Don't attempt the request if there's no admin token
      alert('Not authenticated as admin. Please log in.');
      navigate('/admin/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, subject, semester, branch })
      });

      // If backend returns 401/403, surface message and don't blindly redirect
      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        console.error('Auth error creating class', res.status, body);
        alert(body.message || 'Unauthorized. Please log in again.');
        // token may be invalid; redirect to login
        navigate('/admin/login');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('Error creating class', res.status, body);
        alert(body.message || 'Failed to create class');
        return;
      }

      // Success
      alert('Class created');
      navigate('/admin');
    } catch (err) {
      console.error('Network or unexpected error creating class', err);
      alert(err.message || 'Unexpected error');
    }
  };

  return (
    <div className="admin-portal-container admin-create-class-page">
      <h2>Create Class</h2>
      <form onSubmit={submit} className="admin-form">
  <label>Class name (e.g., CS101)</label>
  <input type="text" value={name} onChange={e => setName(e.target.value)} required />

  <label>Subject</label>
  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required />

  <label>Semester</label>
  <input type="text" value={semester} onChange={e => setSemester(e.target.value)} required />

  <label>Branch</label>
  <input type="text" value={branch} onChange={e => setBranch(e.target.value)} required />

        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" type="submit">Create Class</button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateClass;
