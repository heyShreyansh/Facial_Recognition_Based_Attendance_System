// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import './TeacherPortal.css';

// const AdminDashboard = () => {
//   const [classes, setClasses] = useState([]);
//   const [teacherCount, setTeacherCount] = useState(0);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem('adminToken');
//     fetch('http://localhost:5000/api/admin/classes', {
//       headers: { Authorization: `Bearer ${token}` }
//     })
//       .then(res => res.json())
//       .then(data => setClasses(data.classes || []))
//       .catch(err => console.error(err));
//     // also fetch teacher count for quick link
//     fetch('http://localhost:5000/api/admin/teachers', { headers: { Authorization: `Bearer ${token}` } })
//       .then(res => res.json())
//       .then(data => setTeacherCount((data.teachers || []).length))
//       .catch(() => setTeacherCount(0));
//   }, []);

//   return (
//     <div className="dashboard-container">
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <h2>Admin Portal</h2>
//         <div style={{ display: 'flex', gap: 12 }}>
//           <button className="btn-primary" onClick={() => navigate('/admin/create-teacher')}>Create Teacher</button>
//           <button className="btn-primary" onClick={() => navigate('/admin/create-class')}>Create Class</button>
//           <button className="btn-primary" onClick={() => navigate('/admin/teachers')}>Manage Teachers ({teacherCount})</button>
//         </div>
//       </div>

//       <div style={{ marginTop: 20 }}>
//         <h3>Classes</h3>
//         {classes.length === 0 ? (
//           <p>No classes found.</p>
//         ) : (
//           <ul className="student-list">
//             {classes.map(c => (
//               <li key={c._id} className="student-item">
//                 <div>
//                   <strong>{c.name}</strong> — {c.subject} ({c.semester} - {c.branch})
//                 </div>
//                 <div>
//                   <span style={{ marginRight: 12 }}>{c.studentCount} students</span>
//                   <button className="btn-primary" onClick={() => navigate(`/admin/class/${c._id}/students`)}>View Students</button>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;






import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './admin/AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const AdminDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [teacherCount, setTeacherCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('adminToken');

        fetch(`${API_BASE}/api/admin/classes`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setClasses(data.classes || []))
            .catch(err => console.error(err));

        fetch(`${API_BASE}/api/admin/teachers`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setTeacherCount((data.teachers || []).length))
            .catch(() => setTeacherCount(0));
    }, []);

    const deleteClass = async (id) => {
        if (!confirm('Delete this class? This will remove the class and unassign it from teachers/students.')) return;
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert('Not authenticated as admin. Please log in.');
            navigate('/admin/login');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/admin/classes/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const txt = await res.text();
                let body;
                try { body = JSON.parse(txt); } catch (e) { body = { message: txt }; }
                console.error('Failed to delete class', res.status, res.url, body);
                alert(`Failed to delete class (${res.status}) at ${res.url}: ${body.message || JSON.stringify(body)}`);
                return;
            }

            // remove from state
            setClasses(prev => prev.filter(c => c._id !== id));
            alert('Class deleted');
        } catch (err) {
            console.error('Error deleting class', err);
            alert(`Unexpected error: ${err.message || err}`);
        }
    };

    return (
        <div className="full-screen-wrapper admin-dashboard-page">
            <div className="left-dashboard-area">
                <div className="admin-portal-container dashboard-container">
                    <div className="dashboard-header-row">
                        <h2>Admin Portal</h2>
                        <div className="action-buttons-group">
                            <Link to="/admin/create-teacher" className="btn-create">Create Teacher</Link>
                            <Link to="/admin/create-class" className="btn-create">Create Class</Link>
                            <Link to="/admin/teachers" className="btn-create">Manage Teachers ({teacherCount})</Link>
                        </div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <h3>Classes</h3>
                        {classes.length === 0 ? (
                            <p>No classes found.</p>
                        ) : (
                            <ul className="student-list">
                                {classes.map(c => (
                                    <li key={c._id} className="student-item">
                                        <div>
                                            <strong>{c.name}</strong> — {c.subject} ({c.semester} - {c.branch})
                                            <span className="student-count-meta">{c.studentCount} students</span>
                                            <button className="btn-view-students" onClick={() => navigate(`/admin/class/${c._id}/students`)}>View Students</button>
                                            <button className="btn-ghost btn-delete-class" onClick={() => deleteClass(c._id)}>Delete</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="right-graphic-area">
                <div className="img">
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 731.67004 550.61784">
                        <path d="M0,334.13393c0,.66003,.53003,1.19,1.19006,1.19H730.48004c.65997,0,1.19-.52997,1.19-1.19,0-.65997-.53003-1.19-1.19-1.19H1.19006c-.66003,0-1.19006,.53003-1.19006,1.19Z" fill="var(--svg-dark)"></path>
                        <polygon points="466.98463 81.60598 470.81118 130.55703 526.26809 107.39339 494.98463 57.60598 466.98463 81.60598" fill="var(--svg-secondary)"></polygon>
                        <circle cx="465.32321" cy="55.18079" r="41.33858" fill="var(--svg-secondary)"></circle>
                        <polygon points="387.98463 440.60598 394.98463 503.39339 345.98463 496.60598 361.98463 438.60598 387.98463 440.60598" fill="var(--svg-secondary)"></polygon>
                        <polygon points="578.98463 449.60598 585.98463 512.39339 536.98463 505.60598 552.98463 447.60598 578.98463 449.60598" fill="var(--svg-secondary)"></polygon>
                        <path d="M462.48463,260.10598c-.66897,0-54.14584,2.68515-89.47714,4.46286-16.72275,.84141-29.45202,15.31527-28.15459,32.00884l12.63173,162.5283,36,1,.87795-131,71.12205,4-3-73Z" fill="var(--svg-mid)"></path>
                        <path d="M619.48463,259.10598s9,69,2,76c-7,7-226.5-5.5-226.5-5.5,0,0,48.15354-69.53704,56.82677-71.51852,8.67323-1.98148,146.67323-8.98148,146.67323-8.98148l21,10Z" fill="var(--svg-mid)"></path>
                        <path id="uuid-91047c5b-47d7-4179-8a16-40bd6d529b28-203" d="M335.12666,172.23337c-8.35907-11.69074-9.10267-25.48009-1.66174-30.79863,7.44093-5.31854,20.24665-.15219,28.60713,11.54383,3.40375,4.62627,5.65012,10.00041,6.55111,15.67279l34.79215,49.9814-19.8001,13.70807-35.7745-48.83421c-5.07753-2.68845-9.43721-6.55406-12.71405-11.27326Z" fill="var(--svg-secondary)"></path>
                        <path d="M464.98463,112.60598l51-21,96,148s-67,15-90,18c-23,3-49-9-49-9l-8-136Z" fill="var(--svg-primary)"></path>
                        <path d="M526.98463,137.60598l-18.5-57.70866,24,18.20866s68,45,68,64c0,19,21,77,21,77,0,0,23.5,19.5,15.5,37.5-8,18,10.5,15.5,12.5,28.5,2,13-28.5,30.5-28.5,30.5,0,0-7.5-73.5-31.5-73.5-24,0-62.5-124.5-62.5-124.5Z" fill="var(--svg-dark)"></path>
                        <path d="M468.56831,111.13035l-25.08368,9.97563s4,70,8,76c4,6,18,38,18,38v10.42913s-28,8.57087-27,13.57087c1,5,66,19,66,19,0,0-13-40-21-53-8-13-18.91632-113.97563-18.91632-113.97563Z" fill="var(--svg-dark)"></path>
                        <path d="M452.48463,121.10598s-29-4-34,30c-5,34-1.82283,38.5-1.82283,38.5l-8.17717,19.5-27-30-26,17s47,76,66,74c19-2,47-57,47-57l-16-92Z" fill="var(--svg-dark)"></path>
                        <path d="M597.32321,270.14478l-14.83858,209.96121-38.5-1.5s-8.5-198.5-8.5-201.5c0-3,4-20,29-21,25-1,32.83858,14.03879,32.83858,14.03879Z" fill="var(--svg-mid)"></path>
                        <path d="M541.48463,484.10598s20-6,23-2c3,4,20,6,20,6l5,49s-14,10-16,12-55,4-56-8c-1-12,14-27,14-27l10-30Z" fill="var(--svg-mid)"></path>
                        <path d="M394.48463,470.10598s6-5,8,9c2,14,9,37-1,40-10,3-110,4-110-5v-9l9-7,18.00394-2.869s34.99606-32.131,38.99606-32.131c4,0,17,13,17,13l20-6Z" fill="var(--svg-mid)"></path>
                        <path d="M505.98463,77.60598s-20-24-28-22-3,5-3,5l-20-22s-16-6-31,13c0,0-9-16,0-25,9-9,12-8,14-13,2-5,16-9,16-9,0,0-.80315-7.19685,3.59843-3.59843s15.3937,3.59843,15.3937,3.59843c0,0,.06299-4,4.53543,0,4.47244,4,9.47244,2,9.47244,2,0,0,0,6.92126,3.5,6.96063,3.5,.03937,9.5-4.96063,10.5-.96063,1,4,8,6,9,18,1,12-4,47-4,47Z" fill="var(--svg-mid)"></path>
                        <g>
                            <path d="M342.99463,178.84874l-114.2362,78.82694c-3.94205,2.72015-9.36214,1.72624-12.08229-2.21581l-32.16176-46.60891c-2.72015-3.94205-1.7259-9.36208,2.21615-12.08223l114.2362-78.82694c3.94205-2.72015,9.36214-1.72624,12.08229,2.21581l32.16176,46.60891c2.72015,3.94205,1.7259,9.36208-2.21615,12.08223Z" fill="white"></path>
                        </g>
                        <g>
                            <path d="M456.25926,381.80874h-138.79336c-4.78947,0-8.68608-3.89636-8.68608-8.68583v-56.62834c0-4.78947,3.89661-8.68583,8.68608-8.68583h138.79336c4.78947,0,8.68608,3.89636,8.68608,8.68583v56.62834c0,4.78947-3.89661,8.68583-8.68608,8.68583Z" fill="#fff"></path>
                            <path d="M464.69017,316.49482v56.62784c0,4.65939-3.77152,8.43091-8.43091,8.43091h-68.11583c-9.87497-11.72273-15.82567-26.8544-15.82567-43.37931,0-10.82439,2.55172-21.04674,7.08876-30.11034h76.85275c4.65939,0,8.43091,3.77152,8.43091,8.43091Z" fill="#e6e6e6"></path>
                        </g>
                        <path id="uuid-c026fd96-7d81-4b34-bb39-0646c0e08e96-204" d="M465.67391,331.01678c-12.74718,6.63753-26.5046,5.44058-30.72743-2.67249-4.22283-8.11308,2.6878-20.06802,15.44041-26.70621,5.05777-2.72156,10.69376-4.19231,16.43644-4.28916l54.36547-27.44139,10.79681,21.52636-53.36733,28.57487c-3.37375,4.65048-7.81238,8.42516-12.94437,11.00803Z" fill="#a0616a"></path>
                        <path d="M527.48463,97.10598s56-3,68,27c12,30,22,128,22,128l-122,66.37402-21-32.37402,82-64-29-125Z" fill="#3f3d56"></path>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;