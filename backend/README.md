# Backend - Facial Attendance (Simple Instructions)

1. Copy the env example:
   cp backend/.env.example backend/.env
   Edit backend/.env and set MONGO_URI (your MongoDB connection string). DO NOT commit backend/.env.

2. Create virtualenv and install:
   cd backend
   python -m venv venv
   source venv/bin/activate     # Windows: venv\Scripts\activate
   pip install -r requirements.txt

3. Start the server:
   python ../app.py

4. Health check:
   curl http://localhost:5000/health

5. Register student:
   Prepare payload.json with base64 images as data URLs (photos array).
   curl -X POST -H "Content-Type: application/json" -d @payload.json http://localhost:5000/register_student

6. Recognize test:
   curl -X POST -F "file=@face.jpg" http://localhost:5000/api/recognize

Notes:
- If insightface installation fails, set USE_GPU=false in backend/.env (CPU mode).
- After registering, the server triggers a background reload of embeddings.
