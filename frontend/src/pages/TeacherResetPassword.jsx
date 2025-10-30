import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function TeacherResetPassword() {
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const username = search.get('username') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return setStatus('Passwords do not match');
    try {
      const res = await fetch(`${API_BASE}/api/teacher/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, token, newPassword: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('Password reset successful. Redirecting to login...');
        setTimeout(() => navigate('/teacher/login'), 1500);
      } else {
        setStatus(data.error || 'Reset failed');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error. Check console.');
    }
  };

  return (
    <div className="login-container">
      <h2>Create a new password</h2>
      <form onSubmit={submit}>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="New password" required />
        <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm password" required />
        <button type="submit">Reset password</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}