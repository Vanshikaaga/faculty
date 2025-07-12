from flask import request, jsonify
import cv2
import numpy as np
import face_recognition
import base64
import joblib
from datetime import datetime
import os

# Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, '..', 'models')

# Load models
model = joblib.load(os.path.join(MODEL_DIR, 'svm_face_model.pkl'))
scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
pca = joblib.load(os.path.join(MODEL_DIR, 'pca.pkl'))
target_names = joblib.load(os.path.join(MODEL_DIR, 'target_names.pkl'))  # Optional

def recognize_face():
    try:
        data = request.get_json()
        image_b64 = data.get('image')

        # Check if image is valid
        if not image_b64 or ',' not in image_b64:
            return jsonify([]), 200  # Respond with empty list instead of 400 for frontend compatibility

        # Decode image
        image_bytes = base64.b64decode(image_b64.split(',')[1])
        np_array = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify([]), 200  # Avoid crashing on corrupted image

        # Process image
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)
        face_encodings = face_recognition.face_encodings(rgb, face_locations)

        recognized = []
        for encoding in face_encodings:
            embedding = encoding.reshape(1, -1)
            scaled = scaler.transform(embedding)
            reduced = pca.transform(scaled)
            pred = model.predict(reduced)[0]
            confidence = round(np.max(model.predict_proba(reduced)) * 100, 2)
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            recognized.append({
                'id': pred,
                'name': pred,        # You can map `pred` to `target_names[pred]` if needed
                'rollNo': pred,
                'status': 'present',
                'confidence': confidence,
                'timestamp': timestamp
            })

        return jsonify(recognized)

    except Exception as e:
        print(f"[ERROR] in /api/recognize: {e}")
        return jsonify([]), 200  # Still return a list to keep frontend stable
