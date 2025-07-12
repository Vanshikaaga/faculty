
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load model and preprocessor at startup
model = None
scaler = None
feature_names = None
grade_mapping = None

def load_model_components():
    global model, scaler, feature_names, grade_mapping
    
    try:
        # Check if model files exist, if not train the model
        if not all(os.path.exists(f) for f in ['grade_prediction_model.pkl', 'scaler.pkl', 'feature_names.pkl', 'grade_mapping.pkl']):
            print("Model files not found. Training model...")
            from train_model import train_and_save_model
            train_and_save_model()
        
        # Load the trained model and components
        model = joblib.load('grade_prediction_model.pkl')
        scaler = joblib.load('scaler.pkl')
        feature_names = joblib.load('feature_names.pkl')
        grade_mapping = joblib.load('grade_mapping.pkl')
        
        print("Model loaded successfully!")
        print(f"Expected features: {feature_names}")
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise e

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Grade prediction API is running"})

@app.route('/predict', methods=['POST'])
def predict_grade():
    try:
        # Get data from request
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        print(f"Received data: {data}")
        
        # Create feature array in the correct order
        # Expected order: Previous_Semester_GPA, No_of_Backlogs, Cumulative_GPA, T1_Marks, T2_Marks, T3_Marks, Attendance_Percentage, TA_Marks, Adherence_to_Deadlines
        features = [
            float(data['previousSemesterGPA']),
            int(data['numberOfBacklogs']),
            float(data['cumulativeGPA']),
            int(data['t1Marks']),
            int(data['t2Marks']),
            int(data['t3Marks']),
            int(data['attendancePercentage']),
            int(data['taMarks']),
            int(data['adherenceToDeadlines'])
        ]
        
        print(f"Features array: {features}")
        
        # Convert to numpy array and reshape
        features_array = np.array(features).reshape(1, -1)
        
        # Scale features
        features_scaled = scaler.transform(features_array)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        prediction_proba = model.predict_proba(features_scaled)[0]
        
        # Get predicted grade
        predicted_grade = grade_mapping[prediction]
        confidence = float(max(prediction_proba) * 100)
        
        print(f"Prediction: {prediction} -> {predicted_grade} (confidence: {confidence:.2f}%)")
        
        # Calculate total score for additional info
        total_score = sum(features[3:7])  # T1 + T2 + T3 + TA
        
        response = {
            "predicted_grade": predicted_grade,
            "confidence": round(confidence, 2),
            "total_score": total_score,
            "grade_probabilities": {
                grade_mapping[i]: round(float(prob) * 100, 2) 
                for i, prob in enumerate(prediction_proba)
            }
        }
        
        return jsonify(response)
        
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    try:
        return jsonify({
            "model_type": "XGBoost Classifier",
            "features": feature_names,
            "possible_grades": list(grade_mapping.values()),
            "status": "ready"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Grade Prediction API...")
    load_model_components()
    print("Server starting on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
