import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import AdminForgot from './AdminForgot';
import { API_BASE } from '../utils/api'; // or import default then use .API_BASE

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // No hardcoded credentials — start with empty inputs and authenticate via backend
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/teacher/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({ message: 'Invalid username or password' }));
        setError(err.message || 'Invalid username or password');
        return;
      }
      const data = await res.json();
      // store token for subsequent API calls
      const token = data.token || data.accessToken || data.jwt || data.idToken || (data.data && data.data.token) || '';
      if (token) localStorage.setItem('adminToken', token);
      // optional: also store username
      localStorage.setItem('adminUsername', username);
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  }

  return (
    <div className="admin-login-root">
      <div className="admin-login-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="admin-login-field">
            <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="admin-login-field">
            <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="admin-login-error">{error}</div>}
          <div className="forgot-row" style={{ marginTop: 8 }}>
            <a
              href="#"
              className="admin-forgot-link"
              onClick={(e) => { e.preventDefault(); setShowForgot(true); }}
              aria-label="Forgot password"
            >
              Forgot password?
            </a>
          </div>
          <div className="admin-login-actions">
            <button className="admin-login-btn" type="submit">Log in as Admin</button>
          </div>
        </form>
  {showForgot ? <AdminForgot onClose={() => setShowForgot(false)} /> : null}
      </div>
    </div>
  );
};

export default AdminLogin;



