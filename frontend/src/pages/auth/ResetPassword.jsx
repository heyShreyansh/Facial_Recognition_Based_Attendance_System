import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Auth.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password || password !== confirm) {
      setMsg('Passwords must match.');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.message || `Failed: ${res.status}`);
      } else {
        setMsg('Password updated. Redirecting to login…');
        setTimeout(() => navigate('/admin/login'), 1200);
      }
    } catch (err) {
      setMsg('Server error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reset-page-card">
      <h2>Set a new password</h2>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="label">Enter password</span>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="input" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(s => !s)} className="eye-toggle" aria-label="Toggle password">
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="label">Confirm password</span>
          <div style={{ position: 'relative' }}>
            <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="input" autoComplete="new-password" />
            <button type="button" onClick={() => setShowConfirm(s => !s)} className="eye-toggle" aria-label="Toggle confirm password">
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Password'}</button>
        </div>

        {msg && <div style={{ color: '#b00020' }}>{msg}</div>}
      </form>
    </div>
  );
}