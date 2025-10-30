import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminForgot({ onClose } = {}) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resetLink, setResetLink] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);
    try {
      // Call admin reset endpoint which will send to the configured admin email
      const res = await fetch(`${API_BASE}/api/admin/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setStatus('If the account exists, a reset link was sent to the email on file.');
        if (json && json.previewUrl) setPreviewUrl(json.previewUrl);
        if (json && json.resetLink) setResetLink(json.resetLink);
      } else {
        setStatus('Request failed. Please try again later.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error. See console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Reset password</h2>
      <form onSubmit={submit}>
        <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Username" />
        <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      </form>
      {status && <p>{status}</p>}
      {previewUrl ? <p>Preview URL (dev): <a href={previewUrl} target="_blank" rel="noreferrer">open</a></p> : null}
      {resetLink ? <p>Reset link (dev): <code>{resetLink}</code></p> : null}
      {onClose ? (
        <div style={{ marginTop: 8 }}>
          <button onClick={onClose}>Close</button>
        </div>
      ) : null}
    </div>
  );
}
