 Facial Recognition Attendance System
 Key Features
This system provides automated attendance tracking and robust management via three distinct user portals.

1. Core Facial Recognition Module
Live Check-In: Students capture their image via webcam for instant attendance verification.

Face Enrollment: Secure process for students to upload/capture facial data (embeddings) required for training the recognition model.

High Accuracy Verification: Uses deep learning models (CNNs) to compare live image embeddings against stored student profiles.

2. Student Portal
Self-Login & Attendance: Students use their credentials to access the portal and initiate the facial recognition attendance process.

Attendance History: Students can view their personal attendance record across all enrolled classes.

3. Teacher Portal
Class Control: Teachers can initiate and terminate the official attendance session for a class.

Real-Time Monitoring: View a live list of students checked in or marked absent during the session.

Manual Override: Teachers can manually mark a student as present or absent, with a mandatory field for logging the reason (creates an audit trail).

4. Admin Portal
User Management: Create, update, and manage accounts for Teachers and Students.

Class & Subject Management: Define new classes, subjects, and assign teachers to specific courses.

System Reports: Access summarized reports on overall attendance rates, teacher activity, and facial recognition model performance (e.g., failed check-ins).




Component,Technology / Language,Purpose
Backend API,"[e.g., Python Flask / Node.js Express]","Business logic, authentication, data processing."
Database,"[e.g., PostgreSQL]","Stores all user, class, and attendance data, including facial embeddings."
Facial Recognition,"[e.g., Dlib, Face Recognition Library, OpenCV]",Core CV libraries for feature extraction and comparison.
Frontend UI,"[e.g., React / Vue]",Single-Page Application (SPA) for the three user portals.
Environment,"Docker, Git",Containerization and version control.



Security and Environment Configuration
CRITICAL WARNING: DO NOT COMMIT SECRETS

Environment variables containing database passwords, API keys, and secret keys must be kept out of source control. We use .env files for this purpose.

Local Environment Setup
Prerequisites: Ensure you have Docker, Docker Compose, and Node.js/npm (or Python/pip) installed.

Create .env Files:

Navigate to the backend/ directory and create a file named .env. Copy the variables from the backend/.env.example file and populate them with your local credentials.

Navigate to the frontend/ directory and create a file named .env. Copy the variables from the frontend/.env.example file and populate them.
