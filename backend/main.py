# import os
# import pickle
# import numpy as np
# import cv2
# import sys
# import time
# from sklearn.metrics.pairwise import cosine_similarity
# import insightface
# from insightface.app import FaceAnalysis
# from PIL import Image

# # --- DEFINE FILE PATHS AND CONSTANTS ---
# STUDENT_DATA_PATH = os.path.join(os.getcwd(), 'student_data')
# EMBEDDINGS_FILE = "student_embeddings.pkl"
# COSINE_SIMILARITY_THRESHOLD = 0.5
# REGISTRATION_IMAGES_TO_CAPTURE = 10
# REGISTRATION_INTERVAL = 1 # seconds between photos

# # --- LOAD THE INSIGHTFACE MODEL ---
# print("Loading the InsightFace model...")
# app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
# app.prepare(ctx_id=0, det_size=(640, 640))
# print("InsightFace model loaded successfully.")

# # --- NEW FUNCTION FOR AUTOMATED REGISTRATION ---
# def register_new_student_auto(app, student_name):
#     """Opens webcam, captures photos, and generates embeddings for a new student."""
#     student_folder_path = os.path.join(STUDENT_DATA_PATH, student_name)
#     if not os.path.exists(student_folder_path):
#         os.makedirs(student_folder_path)
    
#     cap = cv2.VideoCapture(0)
#     if not cap.isOpened():
#         print("Error: Could not open webcam.")
#         return
    
#     print(f"\nRegistering {student_name}. Please stay in front of the camera.")
#     print(f"Capturing {REGISTRATION_IMAGES_TO_CAPTURE} photos with a {REGISTRATION_INTERVAL} second interval.")
    
#     start_time = time.time()
#     photos_captured = 0
    
#     while photos_captured < REGISTRATION_IMAGES_TO_CAPTURE:
#         ret, frame = cap.read()
#         if not ret:
#             continue
            
#         cv2.putText(frame, f"Capturing: {photos_captured + 1}/{REGISTRATION_IMAGES_TO_CAPTURE}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        
#         # Check if enough time has passed to capture the next photo
#         if time.time() - start_time >= REGISTRATION_INTERVAL:
#             photo_path = os.path.join(student_folder_path, f"photo_{photos_captured}.jpg")
#             cv2.imwrite(photo_path, frame)
#             print(f"Photo {photos_captured + 1} captured.")
#             photos_captured += 1
#             start_time = time.time()
        
#         cv2.imshow('Registration', frame)
        
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break
            
#     cap.release()
#     cv2.destroyAllWindows()
    
#     # After capturing, generate embeddings for all students (including the new one)
#     print("\nPhotos captured. Generating new embeddings for all students...")
import cv2
import numpy as np
from pymongo import MongoClient
from sklearn.metrics.pairwise import cosine_similarity
import insightface
from insightface.app import FaceAnalysis

# --- MongoDB Setup ---
MONGO_URI = "mongodb+srv://deorashivani4:RCkp6bBp2wsFL4SU@shivani.i2jd7gu.mongodb.net/AttendanceSystemDB?retryWrites=true&w=majority&appName=shivani"
client = MongoClient(MONGO_URI)
db = client["AttendanceSystemDB"]
students_collection = db["students"]

# --- Face Model Setup ---
print("Loading the InsightFace model...")
app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace model loaded successfully.")

# --- Attendance Parameters ---
COSINE_SIMILARITY_THRESHOLD = 0.5

def fetch_student_embeddings():
    """Fetch all students and their embeddings from MongoDB.

    Returns a list of student dicts: { 'rollNo', 'name', 'embeddings': [np arrays] }
    This function will try to decode stored binary `encodings`, and if missing will
    attempt to generate embeddings from stored base64 `photos` using the face model.
    """
    cursor = students_collection.find({})
    students_data = []
    for student in cursor:
        first = student.get("firstName", "")
        last = student.get("lastName", "")
        name = f"{first} {last}".strip() or "Unknown"
        roll = student.get("rollNo") or student.get("roll_number") or student.get("roll") or None
        embeddings_field = student.get("encodings", []) or []
        np_embeddings = []

        # If encodings are present (stored as binary), convert them
        for emb in embeddings_field:
            try:
                # emb may be BSON Binary or raw bytes
                if hasattr(emb, 'raw'):
                    buf = emb.raw
                else:
                    buf = emb
                arr = np.frombuffer(buf, dtype=np.float32)
                if arr.size > 0:
                    np_embeddings.append(arr)
            except Exception as e:
                print(f"Failed to decode stored encoding for {name}: {e}")

        # Fallback: if no encodings stored, try generating embeddings from stored photos (base64)
        if not np_embeddings and student.get("photos"):
            photos = student.get("photos", [])
            for idx, b64 in enumerate(photos):
                try:
                    # strip data URI header if present
                    if ',' in b64:
                        _, b64data = b64.split(',', 1)
                    else:
                        b64data = b64
                    img_bytes = np.frombuffer(__import__('base64').b64decode(b64data), dtype=np.uint8)
                    img = cv2.imdecode(img_bytes, cv2.IMREAD_COLOR)
                    if img is None:
                        continue
                    faces = app.get(img)
                    if faces and getattr(faces[0], 'embedding', None) is not None:
                        arr = faces[0].embedding.astype(np.float32)
                        np_embeddings.append(arr)
                except Exception as e:
                    print(f"Error generating embedding from photo {idx} for {name}: {e}")

        print(f"Loaded {len(np_embeddings)} embeddings for student: {name} (roll: {roll})")
        students_data.append({ 'rollNo': roll, 'name': name, 'embeddings': np_embeddings })

    print(f"DEBUG: Total students prepared for matching: {len(students_data)}")
    return students_data

def mark_attendance():
    students_data = fetch_student_embeddings()
    print("Attendance system ready. Press 'q' to quit.")

    # Build a working list of students with embeddings only
    students_with_embeddings = [s for s in students_data if s.get('embeddings')]
    print(f"DEBUG: Students with embeddings: {len(students_with_embeddings)}")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    from datetime import datetime
    attendance_collection = db["attendance"]
    marked_rolls = set()
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        display_text = None
        faces = app.get(frame)
        if faces:
            query_embedding = faces[0].embedding.astype(np.float32).reshape(1, -1)
            found = False
            roll_number = None
            matched_name = None

            # iterate over the prepared students and their embeddings
            for s in students_with_embeddings:
                s_roll = s.get('rollNo')
                s_name = s.get('name')
                for emb in s.get('embeddings', []):
                    try:
                        emb_vec = np.array(emb, dtype=np.float32).reshape(1, -1)
                        sim = cosine_similarity(query_embedding, emb_vec)[0][0]
                    except Exception as e:
                        # skip bad embedding
                        print(f"Error comparing embedding for {s_name}: {e}")
                        continue
                    if sim >= COSINE_SIMILARITY_THRESHOLD:
                        roll_number = s_roll or ''
                        matched_name = s_name
                        display_text = f"{matched_name} | Roll No: {roll_number}"
                        print(f"Attendance marked for: {matched_name} (Roll No: {roll_number}) (Similarity: {sim:.2f})")
                        # Attendance record
                        now = datetime.now()
                        date_str = now.strftime("%Y-%m-%d")
                        time_str = now.strftime("%H:%M:%S")
                        # Avoid duplicate marking in one session
                        if roll_number not in marked_rolls:
                            attendance_doc = {
                                "rollNo": roll_number,
                                "name": matched_name,
                                "date": date_str,
                                "time": time_str
                            }
                            attendance_collection.insert_one(attendance_doc)
                            marked_rolls.add(roll_number)
                        found = True
                        break
                if found:
                    break
            if not found:
                display_text = "No matching student found."
        else:
            display_text = "No face detected."

        # Show text below the face
        if faces and faces[0].bbox is not None:
            x1, y1, x2, y2 = [int(v) for v in faces[0].bbox]
            text_x = x1
            text_y = y2 + 30
            cv2.putText(frame, display_text, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        else:
            cv2.putText(frame, display_text, (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        cv2.imshow('Attendance', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    mark_attendance()
#         else:
#             print("Embeddings file found. Skipping initial generation...")
            
#         print("Running the attendance system...")
#         run_attendance_system(app)
#     else:
#         print("Invalid choice.")





# import os
# import pickle
# import numpy as np
# import cv2
# import sys
# import time
# from sklearn.metrics.pairwise import cosine_similarity
# import insightface
# from insightface.app import FaceAnalysis
# from PIL import Image

# # --- DEFINE FILE PATHS AND CONSTANTS ---
# STUDENT_DATA_PATH = os.path.join(os.getcwd(), 'student_data')
# EMBEDDINGS_FILE = "student_embeddings.pkl"
# COSINE_SIMILARITY_THRESHOLD = 0.5
# REGISTRATION_IMAGES_TO_CAPTURE = 10
# REGISTRATION_INTERVAL = 1 # seconds between photos

# # --- FUNCTIONS FOR EMBEDDING GENERATION ---
# def process_student_data(app):
#     """Processes all student images and saves face embeddings."""
#     known_embeddings = {}
    
#     if not os.path.exists(STUDENT_DATA_PATH):
#         print(f"Error: {STUDENT_DATA_PATH} not found. Please make sure it's in the same directory as main.py.")
#         return False
        
#     for student_name in os.listdir(STUDENT_DATA_PATH):
#         student_path = os.path.join(STUDENT_DATA_PATH, student_name)
#         if not os.path.isdir(student_path):
#             continue
#         print(f"Processing student: {student_name}")
#         student_embeddings = []
#         for img_name in os.listdir(student_path):
#             img_path = os.path.join(student_path, img_name)
#             try:
#                 img = cv2.imread(img_path)
#                 faces = app.get(img)
#                 if faces:
#                     embedding = faces[0].embedding
#                     student_embeddings.append(embedding)
#             except Exception as e:
#                 print(f"Error processing {img_path}: {e}")
#                 continue
#         if student_embeddings:
#             avg_embedding = np.mean(student_embeddings, axis=0)
#             known_embeddings[student_name] = avg_embedding
#             print(f"Created averaged embedding for {student_name}")
#     with open(EMBEDDINGS_FILE, "wb") as f:
#         pickle.dump(known_embeddings, f)
#     print(f"Successfully saved {len(known_embeddings)} student embeddings.")
#     return True

# # --- NEW FUNCTION FOR AUTOMATED REGISTRATION ---
# def register_new_student_auto(app, student_name):
#     """Opens webcam, captures photos, and generates embeddings for a new student."""
#     student_folder_path = os.path.join(STUDENT_DATA_PATH, student_name)
#     if not os.path.exists(student_folder_path):
#         os.makedirs(student_folder_path)
    
#     cap = cv2.VideoCapture(0)
#     if not cap.isOpened():
#         print("Error: Could not open webcam.")
#         return
    
#     print(f"\nRegistering {student_name}. Please stay in front of the camera.")
#     print(f"Capturing {REGISTRATION_IMAGES_TO_CAPTURE} photos with a {REGISTRATION_INTERVAL} second interval.")
    
#     start_time = time.time()
#     photos_captured = 0
    
#     while photos_captured < REGISTRATION_IMAGES_TO_CAPTURE:
#         ret, frame = cap.read()
#         if not ret:
#             continue
            
#         cv2.putText(frame, f"Capturing: {photos_captured + 1}/{REGISTRATION_IMAGES_TO_CAPTURE}", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        
#         if time.time() - start_time >= REGISTRATION_INTERVAL:
#             photo_path = os.path.join(student_folder_path, f"photo_{photos_captured}.jpg")
#             cv2.imwrite(photo_path, frame)
#             print(f"Photo {photos_captured + 1} captured.")
#             photos_captured += 1
#             start_time = time.time()
        
#         cv2.imshow('Registration', frame)
        
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break
            
#     cap.release()
#     cv2.destroyAllWindows()
    
#     print("\nPhotos captured. Generating new embeddings for all students...")
#     process_student_data(app)
    
#     print("\nRegistration complete. You can now use the attendance system.")


# # --- FUNCTIONS FOR ATTENDANCE SYSTEM ---
# def run_attendance_system(app):
#     known_embeddings = load_embeddings()
#     if known_embeddings is None:
#         print("Embeddings file not found. Please run the embedding generation first.")
#         return

#     known_names = list(known_embeddings.keys())
#     known_embedding_list = list(known_embeddings.values())
#     attendance_marked = set()
    
#     cap = cv2.VideoCapture(0)
#     if not cap.isOpened():
#         print("Error: Could not open webcam.")
#         return
        
#     print("Attendance system is ready. Press 'q' to exit.")
    
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             print("Failed to grab frame.")
#             break
            
#         faces = app.get(frame)
        
#         if faces:
#             for face in faces:
#                 live_embedding = face.embedding
#                 similarities = cosine_similarity([live_embedding], known_embedding_list)[0]
#                 best_match_index = np.argmax(similarities)
#                 best_match_score = similarities[best_match_index]
#                 name = "Unknown"
                
#                 if best_match_score > COSINE_SIMILARITY_THRESHOLD:
#                     name = known_names[best_match_index]
                    
#                     if name not in attendance_marked:
#                         print(f"Attendance marked for: {name} (Score: {best_match_score:.2f})")
#                         attendance_marked.add(name)
                        
#                 bbox = face.bbox.astype(np.int32)
#                 x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
#                 color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
#                 cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#                 cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
        
#         cv2.imshow('Attendance System', frame)
        
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break
    
#     cap.release()
#     cv2.destroyAllWindows()
#     print("Attendance session ended.")


# def load_embeddings():
#     if not os.path.exists(EMBEDDINGS_FILE):
#         return None
#     with open(EMBEDDINGS_FILE, "rb") as f:
#         return pickle.load(f)


# # --- MAIN EXECUTION LOGIC ---
# if __name__ == "__main__":
    
#     print("Loading the InsightFace model...")
#     app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
#     app.prepare(ctx_id=0, det_size=(640, 640))
#     print("InsightFace model loaded successfully.")

#     # You can now choose what to do from the command line
#     user_choice = input("Enter '1' to register a new student, or '2' to run attendance: ")
    
#     if user_choice == '1':
#         # Prompt for student name and run the new function
#         student_name = input("Enter the student's name: ")
#         register_new_student_auto(app, student_name)
    
#     elif user_choice == '2':
#         # Run the standard attendance system
#         if not os.path.exists(EMBEDDINGS_FILE):
#             print("Embeddings file not found. Generating new embeddings for all existing students...")
#             success = process_student_data(app)
#             if not success:
#                 sys.exit("Embeddings generation failed. Cannot proceed.")
#         else:
#             print("Embeddings file found. Skipping initial generation...")
            
#         print("Running the attendance system...")
#         run_attendance_system(app)
#     else:
#         print("Invalid choice.")



# import os
# import pickle
# import numpy as np
# import cv2
# import sys
# import time
# from sklearn.metrics.pairwise import cosine_similarity
# import insightface
# from insightface.app import FaceAnalysis
# from pymongo import MongoClient
# from bson.binary import Binary

# # --- DATABASE CONNECTION (Ensure this matches app.py) ---

# MONGO_URI = "mongodb+srv://deorashivani4:RCkp6bBp2wsFL4SU@shivani.i2jd7gu.mongodb.net/AttendanceSystemDB?retryWrites=true&w=majority&appName=shivani"
# DB_NAME = "AttendanceSystemDB"
# STUDENTS_COLLECTION_NAME = "students"

# # --- DEFINE FILE PATHS AND CONSTANTS ---
# # This is now only a cache file, not the source of truth.
# EMBEDDINGS_CACHE_FILE = "student_embeddings_cache.pkl" 
# COSINE_SIMILARITY_THRESHOLD = 0.50


# # --- NEW/MODIFIED FUNCTION: FETCH FROM MONGO ---
# def cache_all_embeddings_from_mongo(app):
#     """Fetches all student embeddings directly from MongoDB and creates a local cache."""
#     print("Connecting to MongoDB to fetch student embeddings...")
    
#     try:
#         # Connect to MongoDB
#         client = MongoClient(MONGO_URI)
#         db = client[DB_NAME]
#         students_collection = db[STUDENTS_COLLECTION_NAME]
        
#         known_embeddings = {}
#         total_docs = students_collection.count_documents({})
#         print(f"DEBUG: Total documents in 'students' collection: {total_docs}")

#         # 1. Fetch all students who have embeddings
#         cursor = students_collection.find(
#             {}, # Find records where 'encodings' exists and is not empty
#             {"rollNo": 1, "encodings": 1, "_id": 0}      # Project only rollNo and encodings
#         )
        
#         total_students = 0
        
#         for student in cursor:
#             roll_no = student.get('rollNo')
#             encodings = student.get('encodings', [])
            
#             if not roll_no or not encodings:
#                 continue

#             # 2. Convert Binary data back to NumPy arrays and calculate the average
#             student_embedding_arrays = []
#             for binary_data in encodings:
#                 # Convert BSON Binary object back to NumPy array (assuming float32 or float64)
#                 print(f"DEBUG: Data type received for image {i}: {type(binary_data)}")
#                 if isinstance(binary_data, (Binary, bytes)):
#                     # InsightFace embeddings are typically float32 (4 bytes per number)
#                     byte_stream = binary_data.raw if isinstance(binary_data, Binary) else binary_data
#                     embedding_array = np.frombuffer(byte_stream, dtype=np.float32) 
                 
#                     student_embedding_arrays.append(embedding_array)
#                 else:
#                     print(f"DEBUG: Skipping image {i}. Not recognized as BSON Binary.")
                
#             if student_embedding_arrays:
#                 # Average the 10 embeddings for a more stable representation
#                 all_student_embeddings = np.array(student_embedding_arrays)
                 
#                 # known_embeddings[roll_no] = avg_embedding
#                 known_embeddings[roll_no]=all_student_embeddings
                  
    
#                 total_students += 1
#                 print(f"DEBUG: Added {roll_no}. Current known count: {len(known_embeddings)}")

#         # 3. Save the averaged embeddings to a local pickle file (cache)
#         print(f"DEBUG: Final number of students prepared for cache: {len(known_embeddings)}")
#         with open(EMBEDDINGS_CACHE_FILE, "wb") as f:
#             pickle.dump(known_embeddings, f)
            
#         print(f"✅ Successfully fetched and cached embeddings for {total_students} students.")
#         return True

#     except Exception as e:
#         print(f"FATAL ERROR during MongoDB fetch: {e}")
#         return False

# # --- FUNCTIONS FOR ATTENDANCE SYSTEM ---
# def run_attendance_system(app):
#     known_embeddings_dict = load_embeddings()
#     if known_embeddings_dict is None:
#         print("Embeddings cache not found or empty. Cannot run attendance.")
#         return

#     known_names = list(known_embeddings.keys())
#     known_embedding_list = np.array(list(known_embeddings.values())) 

#     attendance_marked = set()
    
#     cap = cv2.VideoCapture(0)
#     if not cap.isOpened():
#         print("Error: Could not open webcam.")
#         return
        
#     print("\n--- Attendance System Ready ---")
#     print(f"Recognizing {len(known_names)} students. Press 'q' to exit.")
    
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             print("Failed to grab frame.")
#             break
            
#         faces = app.get(frame)
        
#         if faces:
#             for face in faces:
#                 live_embedding = face.embedding
#                 live_embedding_2d = live_embedding.reshape(1, -1)
#                 # Use cosine_similarity to compare live face with all known faces
#                 similarities = cosine_similarity(live_embedding_2d, known_embedding_list)[0]
#                 best_match_index = np.argmax(similarities)
#                 best_match_score = similarities[best_match_index]
#                 name = "Unknown"

#                 print(f"DEBUG: Best Match: {known_names[best_match_index]} | Score: {best_match_score:.2f} | Required: {COSINE_SIMILARITY_THRESHOLD}", end='\r')
                
#                 if best_match_score > COSINE_SIMILARITY_THRESHOLD:
#                     name = known_names[best_match_index]
                    
#                     if name not in attendance_marked:
#                         print(f"✅ ATTENDANCE MARKED: {name} (Score: {best_match_score:.2f})")
#                         attendance_marked.add(name)
                        
#                 # Draw bounding box and name
#                 bbox = face.bbox.astype(np.int32)
#                 x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
#                 color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
#                 cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#                 cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
                
#         cv2.imshow('Attendance System', frame)
        
#         if cv2.waitKey(1) & 0xFF == ord('q'):
#             break
    
#     cap.release()
#     cv2.destroyAllWindows()
#     print("Attendance session ended.")


# def load_embeddings():
#     if not os.path.exists(EMBEDDINGS_CACHE_FILE):
#         return None
#     with open(EMBEDDINGS_CACHE_FILE, "rb") as f:
#         return pickle.load(f)


# # --- MAIN EXECUTION LOGIC ---
# if __name__ == "__main__":
    
#     print("Initializing Facial Recognition Model...")
#     app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
#     app.prepare(ctx_id=0, det_size=(640, 640))
#     print("InsightFace model ready.")

#     print("\nStarting Attendance System...")
    
#     # 🎯 Check if a cached file exists. If not, generate it from the database.
#     if not os.path.exists(EMBEDDINGS_CACHE_FILE):
#         print("Embeddings cache not found. Generating cache from MongoDB...")
#         success = cache_all_embeddings_from_mongo(app) # Call the Mongo fetch function
#         if not success:
#             sys.exit("Initial cache generation failed. Cannot proceed.")
#     else:
#         print(f"Cache ({EMBEDDINGS_CACHE_FILE}) found. Proceeding to run attendance.")
        
#     run_attendance_system(app)











import os
import pickle
import numpy as np
import cv2
import sys
import time
from sklearn.metrics.pairwise import cosine_similarity
import insightface
from insightface.app import FaceAnalysis
from pymongo import MongoClient
from bson.binary import Binary

# --- DATABASE CONNECTION (Ensure this matches app.py) ---
MONGO_URI = "mongodb+srv://deorashivani4:RCkp6bBp2wsFL4SU@shivani.i2jd7gu.mongodb.net/AttendanceSystemDB?retryWrites=true&w=majority&appName=shivani"
DB_NAME = "AttendanceSystemDB"
STUDENTS_COLLECTION_NAME = "students"

# --- DEFINE FILE PATHS AND CONSTANTS ---
EMBEDDINGS_CACHE_FILE = "student_embeddings_cache.pkl" 
COSINE_SIMILARITY_THRESHOLD = 0.70 # Adjusted to a more realistic initial threshold

# --- NEW/MODIFIED FUNCTION: FETCH FROM MONGO ---
def cache_all_embeddings_from_mongo(app):
    """Fetches all student embeddings directly from MongoDB and creates a local cache."""
    print("Connecting to MongoDB to fetch student embeddings...")
    
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        students_collection = db[STUDENTS_COLLECTION_NAME]
        
        # known_embeddings will now map rollNo to a (N, 512) NumPy array
        known_embeddings = {}
        total_students = 0
        
        cursor = students_collection.find(
            {}, 
            {"rollNo": 1, "encodings": 1, "_id": 0}
        )
        
        for student in cursor:
            roll_no = student.get('rollNo')
            encodings = student.get('encodings', [])
            
            if not roll_no or not encodings:
                continue

            student_embedding_arrays = []
            
            # Use tuple (Binary, bytes) for robust check
            for binary_data in encodings:
                if isinstance(binary_data, (Binary, bytes)):
                    # Get the raw bytes
                    byte_stream = binary_data.raw if isinstance(binary_data, Binary) else binary_data
                    
                    # Convert bytes to NumPy array
                    embedding_array = np.frombuffer(byte_stream, dtype=np.float32) 
                    student_embedding_arrays.append(embedding_array)
                
            if student_embedding_arrays:
                # CRITICAL CHANGE 1: Stack all 10 arrays into a single (N, 512) array
                all_student_embeddings = np.array(student_embedding_arrays)
                
                known_embeddings[roll_no] = all_student_embeddings
                total_students += 1

        print(f"✅ Successfully fetched and cached embeddings for {total_students} students.")
        
        # 3. Save the embeddings dictionary to a local pickle file (cache)
        with open(EMBEDDINGS_CACHE_FILE, "wb") as f:
            pickle.dump(known_embeddings, f)
            
        return True

    except Exception as e:
        print(f"FATAL ERROR during MongoDB fetch: {e}", file=sys.stderr)
        return False

# --- FUNCTIONS FOR ATTENDANCE SYSTEM ---
def run_attendance_system(app):
    known_embeddings_dict = load_embeddings()
    if known_embeddings_dict is None or not known_embeddings_dict:
        print("Embeddings cache not found or empty. Cannot run attendance.")
        return

    # --- CRITICAL FIX: Flatten and Label Embeddings for Best-of-N Comparison ---
    
    known_embedding_matrix = [] # Holds all embeddings (N*10, 512)
    known_labels = []            # Holds the RollNo for each embedding

    for roll_no, embedding_block in known_embeddings_dict.items():
        # embedding_block is the (N, 512) array for one student
        
        if embedding_block.ndim == 1:
             # Handle case where the array might have saved as 1D (shouldn't happen with the fix, but good for safety)
             embedding_block = embedding_block.reshape(1, -1) 
        
        # Add the block of embeddings to the matrix
        known_embedding_matrix.append(embedding_block)
        
        # Add the label (RollNo) once for EVERY embedding in the block
        num_embeddings = embedding_block.shape[0]
        known_labels.extend([roll_no] * num_embeddings)

    # Convert the list of arrays into one large matrix for scikit-learn
    known_embedding_matrix = np.vstack(known_embedding_matrix)

    attendance_marked = set()
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return
        
    print("\n--- Attendance System Ready ---")
    print(f"Recognizing {len(known_embeddings_dict)} unique students. Press 'q' to exit.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break
            
        faces = app.get(frame)
        
        if faces:
            for face in faces:
                live_embedding = face.embedding
                # CRITICAL FIX 2: Reshape the single live embedding into a 2D array (1 sample, 512 features)
                live_embedding_2d = live_embedding.reshape(1, -1)
                
                # 3. Use cosine_similarity with the flattened matrix:
                # similarities is an array of scores against every single stored embedding (N*10 scores)
                similarities = cosine_similarity(live_embedding_2d, known_embedding_matrix)[0]
                
                # 4. Find the single best match across the entire matrix
                best_match_index_flat = np.argmax(similarities)
                best_match_score = similarities[best_match_index_flat]
                
                # 5. Get the corresponding label (RollNo)
                name = "Unknown"
                if best_match_score > COSINE_SIMILARITY_THRESHOLD:
                    name = known_labels[best_match_index_flat] # Retrieve label from the flattened list
                    
                    if name not in attendance_marked:
                        print(f"✅ ATTENDANCE MARKED: {name} (Score: {best_match_score:.2f})")
                        attendance_marked.add(name)
                        
                # Draw bounding box and name
                bbox = face.bbox.astype(np.int32)
                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
                color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
                
        cv2.imshow('Attendance System', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    print("Attendance session ended.")


def load_embeddings():
    if not os.path.exists(EMBEDDINGS_CACHE_FILE):
        return None
    with open(EMBEDDINGS_CACHE_FILE, "rb") as f:
        return pickle.load(f)


# --- MAIN EXECUTION LOGIC ---
if __name__ == "__main__":
    
    print("Initializing Facial Recognition Model...")
    app = FaceAnalysis(allowed_modules=['detection', 'recognition'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    print("InsightFace model ready.")

    print("\nStarting Attendance System...")
    
    # Check if a cached file exists. If not, generate it from the database.
    if not os.path.exists(EMBEDDINGS_CACHE_FILE):
        print("Embeddings cache not found. Generating cache from MongoDB...")
        success = cache_all_embeddings_from_mongo(app) 
        if not success:
            sys.exit("Initial cache generation failed. Cannot proceed.")
    else:
        print(f"Cache ({EMBEDDINGS_CACHE_FILE}) found. Proceeding to run attendance.")
        
    run_attendance_system(app)