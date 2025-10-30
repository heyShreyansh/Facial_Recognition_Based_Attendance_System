// import React, { useState } from 'react';

// const TeacherLogin = () => {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const res = await fetch('http://localhost:5000/api/teacher/login', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username, password }),
//     });

//     const data = await res.json();

//     if (data.token) {
//       localStorage.setItem('teacherToken', data.token);
//       window.location.href = '/teacher/dashboard';
//     } else {
//       alert('Login failed');
//     }
//   };

//   return (
//     <div className="login-container">
//       <h2>Teacher Portal Login</h2>
//       <form onSubmit={handleSubmit}>
//         <div className="form-group">
//           <label htmlFor="username">Username:</label>
//           <input
//             type="text"
//             id="username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             placeholder="Username"
//             required
//           />
//         </div>
//         <div className="form-group">
//           <label htmlFor="password">Password:</label>
//           <input
//             type="password"
//             id="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="Password"
//             required
//           />
//         </div>
//         <button type="submit">Login</button>
//       </form>
//     </div>
//   );
// };

// export default TeacherLogin;





import React, { useState } from 'react';
import './TeacherLogin.css'; // Assuming you name the CSS file 'TeacherLogin.css'
import TeacherForgot from './TeacherForgot';

const TeacherLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/teacher/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            // If response is not ok surface server error to the user
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.message || err.error || 'Login failed. Check your credentials.');
                return;
            }

            const data = await res.json();
            if (data.token) {
                localStorage.setItem('teacherToken', data.token);
                // redirect to dashboard
                window.location.href = '/teacher/dashboard'; 
            } else {
                alert('Login failed. Check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Network error while logging in. Check backend server and console.');
        }
    };

    const [showForgot, setShowForgot] = useState(false);

    return (
        <div className="card login-container">
            
            {/* BLIND CHECKBOX and AVATAR structure remain the same */}
            <input value="" className="blind-check" type="checkbox" id="blind-input" name="blindcheck" hidden />
            <label htmlFor="blind-input" className="avatar">
                <figure aria-hidden="true" className="human-avatar">
                    <div className="person-body"></div><div className="neck skin"></div>
                    <div className="head skin"><div className="eyes"></div><div className="mouth"></div></div>
                    <div className="hair"></div><div className="ears"></div>
                </figure>
            </label>
            <label htmlFor="blind-input" className="blind_input" style={{ visibility: 'hidden' }}></label>


            {/* FORM CONTENT */}
            <form onSubmit={handleSubmit} className="form">
                <div className="title">Teacher Portal Login</div> 
                
                {/* 1. Username Field (Order 1) */}
                <div className="form-group full-width" style={{order: 1}}>
                    <label className="label_input" htmlFor="username">Username:</label>
                    <input
                        spellCheck="false"
                        className="input"
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                
                {/* 2. Password Field & Forgot Link Container (Order 2) */}
                <div className="form-group full-width password-group" style={{order: 2}}>
                    <label className="label_input" htmlFor="password">Password:</label>
                    <input
                        spellCheck="false"
                        className="input"
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {/* Forgot Password Link placed immediately after the input */}
                    <a href="/teacher/forgot-password" className="forgot-link" onClick={(e) => { e.preventDefault(); setShowForgot(true); }}>Forgot password?</a>
                </div>
                
                {/* 3. Submit Button (Order 3) */}
                <div className="buttons-container" style={{order: 3}}>
                    <button type="submit" className="submit">Log In</button>
                </div>
            </form>
            {showForgot ? (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ width: 420, maxWidth: '95%', background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                        <TeacherForgot onClose={() => setShowForgot(false)} />
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default TeacherLogin;
