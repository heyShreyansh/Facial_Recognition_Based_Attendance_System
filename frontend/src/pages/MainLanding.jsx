
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainLanding.css';

import thumbnail from '../assets/thumb.jpg'; 
import heroImg1 from '../assets/image2.png';
import heroImg2 from '../assets/image1.png';

export default function MainLanding() {
  const portalRef = useRef(null);
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false); 

  const handleStartNow = (e) => {
    e.preventDefault(); 
    if (portalRef.current) {
      portalRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePortalClick = (portalType) => {
    switch (portalType) {
      case 'student':
        navigate('/student/register'); 
        break;
      case 'teacher':
        navigate('/teacher/login'); 
        break;
      case 'admin':
        navigate('/admin'); 
        break;
      default:
        console.error("Unknown portal clicked.");
    }
  };
  
  // LOGIC TO HANDLE THE FADE-IN ANIMATION WHEN SCROLLED TO
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 } 
    );

    if (portalRef.current) {
      observer.observe(portalRef.current);
    }

    return () => {
      if (portalRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(portalRef.current);
      }
    };
  }, []);

  // --- Reusable SVG for the Fancy Button Icon (Uiverse Arrow) ---
  const FancyButtonIcon = () => (
    <svg
      height="24"
      width="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 0h24v24H0z" fill="none"></path>
      <path
        d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
        fill="currentColor"
      ></path>
    </svg>
  );

  return (
    <main className="main-landing-root">
      {/* -------------------- HEADER -------------------- */}
      <header className="kairn-header-row">
        <div className="kairn-logo-area">
          {/* Logo removed as requested */}
        </div>

        {/* navigation is handled by the portal buttons below */}

        {/* Header Start Now Button (FANCY UIVERSE STRUCTURE) */}
        <button className="kairn-try-btn" onClick={handleStartNow}>
            Get Started
            <div className="icon">
                <FancyButtonIcon />
            </div>
        </button>
      </header>
      <div className="kairn-header-separator" />
      
      {/* -------------------- HERO SECTION -------------------- */}
      <section className="kairn-hero-section">
        <div className="kairn-hero-left">
          <h1 className="kairn-hero-headline">
            Validate <span className="kairn-highlight">Identity</span>
            Automate Presence.
          </h1>
          <p className="kairn-hero-subtext">
            Stop rushing—centralize, automate, and track student attendance. Teachers and Admins maintain full control and oversight with FaceAttend.
          </p>
          {/* Hero Start Now Button (FANCY UIVERSE STRUCTURE) */}
          <button className="kairn-try-btn kairn-try-btn-hero" onClick={handleStartNow}>
         Get Started
            <div className="icon">
                <FancyButtonIcon />
            </div>
          </button>
        </div>
        <div className="kairn-hero-right">
          <img src={heroImg1} alt="FaceAttend screen preview 1" className="kairn-hero-img" />
          <img src={heroImg2} alt="FaceAttend screen preview 2" className="kairn-hero-img" />
        </div>
      </section>
      
      {/* -------------------- PORTAL SECTION (SCROLL DESTINATION) -------------------- */}
      <section className="portal-section" ref={portalRef}>
        <h2>Select Your Portal</h2>
        {/* Conditional class for smooth fade-in effect */}
        <div className={`portal-btns-row ${isVisible ? 'is-visible' : ''}`}>
          <button className="portal-btn" onClick={() => handlePortalClick('admin')}>
            Admin Portal
          </button>
          <button className="portal-btn" onClick={() => handlePortalClick('teacher')}>
            Teacher Portal
          </button>
          <button className="portal-btn" onClick={() => handlePortalClick('student')}>
            Student Portal
          </button>
        </div>
      </section>
    </main>
  );
}