from flask import Flask, request, jsonify
from flask_cors import CORS
import base64, numpy as np, cv2, joblib, os
from datetime import datetime
import json
import face_recognition
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'models')
DATASET_DIR = os.path.join(BASE_DIR, 'dataset')
STUDENTS_DB_PATH = os.path.join(BASE_DIR, 'students.json')

# Ensure directories exist
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

# Global variables for models
model = None
scaler = None
pca = None
target_names = None

def load_models():
    """Load trained models"""
    global model, scaler, pca, target_names
    try:
        if os.path.exists(os.path.join(MODEL_DIR, 'svm_face_model.pkl')):
            model = joblib.load(os.path.join(MODEL_DIR, 'svm_face_model.pkl'))
            logger.info("SVM model loaded successfully")
        
        if os.path.exists(os.path.join(MODEL_DIR, 'scaler.pkl')):
            scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
            logger.info("Scaler loaded successfully")
        else:
            # Create default scaler
            scaler = StandardScaler()
            logger.info("Created new scaler")
        
        if os.path.exists(os.path.join(MODEL_DIR, 'pca.pkl')):
            pca = joblib.load(os.path.join(MODEL_DIR, 'pca.pkl'))
            logger.info("PCA loaded successfully")
        else:
            # Create default PCA
            pca = PCA(n_components=50)
            logger.info("Created new PCA")
        
        if os.path.exists(os.path.join(MODEL_DIR, 'target_names.pkl')):
            target_names = joblib.load(os.path.join(MODEL_DIR, 'target_names.pkl'))
            logger.info("Target names loaded successfully")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        # Initialize default models
        scaler = StandardScaler()
        pca = PCA(n_components=50)

def load_students_db():
    """Load students database from JSON file"""
    try:
        if os.path.exists(STUDENTS_DB_PATH):
            with open(STUDENTS_DB_PATH, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading students database: {e}")
        return []

def save_students_db(students_db):
    """Save students database to JSON file"""
    try:
        atomic_write_json(STUDENTS_DB_PATH, students_db)

    except Exception as e:
        logger.error(f"Error saving students database: {e}")

def decode_base64_image(image_data):
    """Decode base64 image data"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        image_data = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_data, np.uint8)
        return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None
def atomic_write_json(path, data):
    import tempfile
    try:
        with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False) as tmp:
            json.dump(data, tmp, indent=2)
            tmp.flush()
            os.fsync(tmp.fileno())
        if os.path.exists(path):
            os.remove(path)
        os.replace(tmp.name, path)
    except Exception as e:
        logger.error(f"Atomic write failed for {path}: {e}")
        raise

def retrain_model():
    """Retrain the model with all available data"""
    global model, scaler, pca, target_names

    try:
        X, y = [], []

        for student_id in os.listdir(DATASET_DIR):
            student_path = os.path.join(DATASET_DIR, student_id)
            if not os.path.isdir(student_path):
                continue

            for file in os.listdir(student_path):
                if file.endswith('.npy'):
                    encoding = np.load(os.path.join(student_path, file))
                    if encoding.shape == (128,):
                        X.append(encoding)
                        y.append(student_id)

        if not X:
            logger.warning("No training data found")
            return False

        if len(set(y)) < 2:
            logger.warning("Need at least 2 different students to train model")
            return False

        X = np.array(X)
        y = np.array(y)

        X_scaled = scaler.fit_transform(X)
        X_pca = pca.fit_transform(X_scaled)

        model = SVC(kernel='linear', probability=True, random_state=42)
        model.fit(X_pca, y)

        joblib.dump(model, os.path.join(MODEL_DIR, 'svm_face_model.pkl'))
        joblib.dump(scaler, os.path.join(MODEL_DIR, 'scaler.pkl'))
        joblib.dump(pca, os.path.join(MODEL_DIR, 'pca.pkl'))
        joblib.dump(np.unique(y), os.path.join(MODEL_DIR, 'target_names.pkl'))

        target_names = np.unique(y)
        logger.info(f"Model retrained on {len(X)} samples from students: {sorted(set(y))}")

        # --------------------------------------------
        # Append students.json data to final.json
        # --------------------------------------------
        final_path = os.path.join(BASE_DIR, 'final.json')
        students_db = load_students_db()

        # Load existing final.json
        if os.path.exists(final_path):
            with open(final_path, 'r') as f:
                final_data = json.load(f)
        else:
            final_data = []

        # Merge data without duplicating roll numbers
        existing_roll_nos = {s['rollNo'] for s in final_data}
        new_students = [s for s in students_db if s['rollNo'] not in existing_roll_nos]
        final_data.extend(new_students)

        atomic_write_json(final_path, final_data)
        logger.info(f"Appended {len(new_students)} new students to final.json")

        return True

    except Exception as e:
        logger.error(f"Error retraining model: {e}")
        return False


# Initialize models on startup
load_models()


@app.route('/api/register', methods=['POST'])
def register_student():
    """Register a new student (writes to pending until complete)"""
    try:
        data = request.get_json()
        image_b64 = data.get('image')
        name = data.get('name')
        roll_no = data.get('rollNo')

        if not all([image_b64, name, roll_no]):
            return jsonify({"error": "Missing image, name or roll number"}), 400

        # Decode image
        frame = decode_base64_image(image_b64)
        if frame is None:
            return jsonify({"error": "Invalid image data"}), 400

        # Detect face
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        if not face_encodings:
            return jsonify({"error": "No face detected"}), 400

        face_encoding = face_encodings[0]

        # Save encoding to dataset
        student_id = roll_no
        folder = os.path.join(DATASET_DIR, student_id)
        os.makedirs(folder, exist_ok=True)
        existing_files = [f for f in os.listdir(folder) if f.endswith(".npy")]
        sample_count = len(existing_files)

        if sample_count >= 50:
            return jsonify({
                "message": "Already collected 50 samples. Registration complete.",
                "registrationComplete": True,
                "sampleCount": sample_count
            }), 200

        index = sample_count + 1
        np.save(os.path.join(folder, f"{index}.npy"), face_encoding)

        # Load or initialize pending DB
        pending_path = os.path.join(BASE_DIR, 'pending_students.json')
        if os.path.exists(pending_path):
            with open(pending_path, 'r') as f:
                pending_db = json.load(f)
        else:
            pending_db = []

        # Find existing pending entry
        existing_student = next((s for s in pending_db if s['rollNo'] == roll_no), None)

        if existing_student:
            existing_student['sampleCount'] = index
            existing_student['registrationComplete'] = (index >= 50)
        else:
            existing_student = {
                "name": name,
                "rollNo": roll_no,
                "sampleCount": index,
                "registrationComplete": (index >= 50),
                "createdAt": datetime.now().isoformat()
            }
            pending_db.append(existing_student)

        # Save updated pending DB
        

        

        # If registration complete, move to final DB
        if index >= 50:
            # Load students.json
            students_db = load_students_db()

            # Check again to prevent duplicates
            if not any(s['rollNo'] == roll_no for s in students_db):
                students_db.append(existing_student)
                save_students_db(students_db)

            # Remove from pending
            pending_db = [s for s in pending_db if s['rollNo'] != roll_no]
            atomic_write_json(pending_path, pending_db)

            retrain_model()

        return jsonify({
            "message": f"Frame {index} saved for {name}",
            "sampleCount": index,
            "registrationComplete": index >= 50
        }), 200

    except Exception as e:
        logger.error(f"Error in register endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """Recognize a face in uploaded image"""
    try:
        if model is None:
            return jsonify({"error": "Model not trained yet"}), 400
        
        data = request.get_json()
        image_b64 = data.get('image')
        
        if not image_b64:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode image
        frame = decode_base64_image(image_b64)
        if frame is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        # Convert to RGB and detect faces
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        if not face_encodings:
            return jsonify({"error": "No face detected"}), 400
        
        # Preprocess face encoding
        face_encoding = face_encodings[0].reshape(1, -1)
        face_encoding_scaled = scaler.transform(face_encoding)
        face_encoding_pca = pca.transform(face_encoding_scaled)
        
        # Predict
        prediction_proba = model.predict_proba(face_encoding_pca)[0]
        predicted_class = model.predict(face_encoding_pca)[0]
        confidence = max(prediction_proba)
        
        # Check confidence threshold
        if confidence < 0.6:
            return jsonify({"error": "Face not recognized with sufficient confidence"}), 400
        
        return jsonify({
            "success": True,
            "prediction": predicted_class,
            "confidence": float(confidence),
            "timestamp": datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in recognize endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get list of registered students"""
    try:
        students_db = load_students_db()
        return jsonify({"students": students_db}), 200
        
    except Exception as e:
        logger.error(f"Error in students endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/retrain', methods=['POST'])
def retrain_model_endpoint():
    """Retrain the face recognition model"""
    try:
        success = retrain_model()
        if success:
            return jsonify({"success": True, "message": "Model retrained successfully"}), 200
        else:
            return jsonify({"error": "Failed to retrain model"}), 400
        
    except Exception as e:
        logger.error(f"Error in retrain endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        students_db = load_students_db()
        
        # Count total samples
        total_samples = 0
        for student_dir in os.listdir(DATASET_DIR):
            student_path = os.path.join(DATASET_DIR, student_dir)
            if os.path.isdir(student_path):
                total_samples += len([f for f in os.listdir(student_path) if f.endswith('.npy')])
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "students_count": len(students_db),
            "total_samples": total_samples,
            "model_trained": model is not None
        }), 200
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/reset', methods=['POST'])
def reset_system():
    """Reset the entire system (for development/testing)"""
    try:
        # Clear dataset directory
        if os.path.exists(DATASET_DIR):
            for item in os.listdir(DATASET_DIR):
                item_path = os.path.join(DATASET_DIR, item)
                if os.path.isdir(item_path):
                    for file in os.listdir(item_path):
                        os.remove(os.path.join(item_path, file))
                    os.rmdir(item_path)
                else:
                    os.remove(item_path)
        
        # Clear model files
        model_files = ['svm_face_model.pkl', 'scaler.pkl', 'pca.pkl', 'target_names.pkl']
        for file_name in model_files:
            file_path = os.path.join(MODEL_DIR, file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Clear students database
        if os.path.exists(STUDENTS_DB_PATH):
            os.remove(STUDENTS_DB_PATH)
        
        # Reset global variables
        global model, scaler, pca, target_names
        model = None
        scaler = StandardScaler()
        pca = PCA(n_components=50)
        target_names = None
        
        return jsonify({"success": True, "message": "System reset successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error resetting system: {e}")
        return jsonify({"error": "Reset failed"}), 500
    
@app.route('/api/recognize_multiple', methods=['POST'])
def recognize_multiple_faces():
    """Recognize multiple faces in uploaded image"""
    try:
        if model is None:
            return jsonify({"error": "Model not trained yet"}), 400
        
        data = request.get_json()
        image_b64 = data.get('image')
        
        if not image_b64:
            return jsonify({"error": "No image provided"}), 400
        
        # Decode image
        frame = decode_base64_image(image_b64)
        if frame is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        # Convert to RGB and detect faces
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        if not face_encodings:
            return jsonify({"error": "No faces detected"}), 400
        
        detected_faces = []
        
        # Process each detected face
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            try:
                # Preprocess face encoding using your trained model pipeline
                face_encoding_reshaped = face_encoding.reshape(1, -1)
                face_encoding_scaled = scaler.transform(face_encoding_reshaped)
                face_encoding_pca = pca.transform(face_encoding_scaled)
                
                # Predict using your trained SVM model
                prediction_proba = model.predict_proba(face_encoding_pca)[0]
                predicted_class = model.predict(face_encoding_pca)[0]
                confidence = max(prediction_proba)
                
                # Check confidence threshold
                if confidence >= 0.6:
                    name = predicted_class
                    
                    # Load student name from database
                    students_db = load_students_db()
                    student_name = None
                    for student in students_db:
                        if student['rollNo'] == predicted_class:
                            student_name = student['name']
                            break
                    
                    if student_name:
                        name = student_name
                else:
                    name = "Unknown"
                    confidence = 0.0
                
                detected_faces.append({
                    'name': name,
                    'confidence': float(confidence),
                    'rollNo': predicted_class if confidence >= 0.6 else None,
                    'x': left,
                    'y': top,
                    'width': right - left,
                    'height': bottom - top
                })
                
            except Exception as e:
                logger.error(f"Error processing face: {e}")
                # Add unknown face if processing fails
                detected_faces.append({
                    'name': "Unknown",
                    'confidence': 0.0,
                    'rollNo': None,
                    'x': left,
                    'y': top,
                    'width': right - left,
                    'height': bottom - top
                })
        
        return jsonify({
            'success': True,
            'faces': detected_faces,
            'total_faces': len(detected_faces),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in recognize_multiple_faces endpoint: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Face Recognition API Server...")
    print("Server will run on http://localhost:5001")
    print("Available endpoints:")
    print("  POST /api/register - Register a new student")
    print("  POST /api/recognize - Recognize a face")
    print("  GET  /api/students - Get registered students")
    print("  POST /api/retrain - Retrain the model")
    print("  GET  /api/health - Health check")
    print("  POST /api/reset - Reset system (dev only)")
    print()
    print("Make sure the following directories exist:")
    print(f"  - {MODEL_DIR}")
    print(f"  - {DATASET_DIR}")
    print()
    
    app.run(debug=True, host='0.0.0.0', port=5001)
