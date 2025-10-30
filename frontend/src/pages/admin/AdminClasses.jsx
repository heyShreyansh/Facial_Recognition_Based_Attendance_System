import React, { useState, useEffect } from 'react';
import './AdminClasses.css'; // keep your styles

export default function AdminClasses() {
  const [classesList, setClassesList] = useState([]);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [studentsForClass, setStudentsForClass] = useState([]);
  const [modalClass, setModalClass] = useState(null);

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    const res = await fetch('/api/admin/classes');
    if (res.ok) {
      const body = await res.json();
      setClassesList(body.classes || []);
    }
  }

  async function viewStudents(cls) {
    setModalClass(cls);
    setStudentsForClass([]);
    setStudentsModalOpen(true);
    try {
      const res = await fetch(`/api/admin/classes/${cls._id || cls.id}/students`);
      if (res.ok) {
        const body = await res.json();
        setStudentsForClass(body.students || []);
      } else {
        setStudentsForClass([]);
      }
    } catch (err) {
      console.error(err);
      setStudentsForClass([]);
    }
  }

  return (
    <div className="classes-page">
      {classesList.map(cls => (
        <div key={cls._id || cls.id} className="class-card">
          <div className="class-title">{cls.code || cls.name}</div>
          <div className="class-desc">{cls.name} — {cls.branch}</div>
          <div className="class-actions">
            <button onClick={() => viewStudents(cls)} className="btn-primary">View Students</button>
          </div>
        </div>
      ))}

      {studentsModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Students — {modalClass?.name || modalClass?.code}</h3>
            <div style={{ maxHeight: '320px', overflow: 'auto', marginTop: 8 }}>
              {studentsForClass.length === 0 && <div>No students registered for this class.</div>}
              {studentsForClass.map(s => (
                <div key={s._id || s.username} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  <div style={{ fontWeight: 700 }}>{s.firstName ? `${s.firstName} ${s.lastName}` : s.username}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{s.roll ? `Roll: ${s.roll} • ` : ''}{s.branch}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => setStudentsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}