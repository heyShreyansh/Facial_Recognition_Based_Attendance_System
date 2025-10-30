import React, { useState } from 'react';
import './AdminLogin.css'; // ensure CSS is imported (or import the specific Auth.css if used)

export default function Login() {
  const [showForgot, setShowForgot] = useState(false);
  const [fpUser, setFpUser] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  async function sendForgot() {
    setFpLoading(true);
    setFpMsg('');
    try {
      const res = await fetch('/api/admin/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: fpUser }),
      });
      const body = await res.json().catch(() => ({}));
      setFpMsg(body.message || 'If an account exists, a reset email has been sent.');
    } catch (e) {
      setFpMsg('Failed to send request. Try again later.');
    } finally {
      setFpLoading(false);
    }
  }

  return (
    <div className="login-form">
      {/* ...existing username/password inputs... */}

      {/* forgot link under password, right-aligned */}
      <div className="forgot-row">
        <a
          href="#"
          className="forgot-link"
          onClick={(e) => { e.preventDefault(); setFpUser(''); setFpMsg(''); setShowForgot(true); }}
          aria-label="Forgot password"
        >
          Forgot password?
        </a>
      </div>

      {/* forgot modal */}
      {showForgot && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Forgot password</h3>
            <p>Enter your username or email. If an account exists, a reset email will be sent.</p>
            <input value={fpUser} onChange={e => setFpUser(e.target.value)} placeholder="username or email" className="input" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => setShowForgot(false)}>Cancel</button>
              <button className="btn-primary" onClick={sendForgot} disabled={fpLoading}>
                {fpLoading ? 'Sending…' : 'Send'}
              </button>
            </div>
            {fpMsg && <div style={{ marginTop: 12 }}>{fpMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}