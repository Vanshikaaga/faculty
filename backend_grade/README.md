
# JIIT Grade Prediction Backend

This backend provides an API for predicting student grades using machine learning.

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Installation Steps

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the complete setup:**
   ```bash
   python run_setup.py
   ```

4. **Start the Flask API server:**
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### POST /predict
Predicts a student's grade based on input parameters.

**Request Body:**
```json
{
  "previousSemesterGPA": 8.5,
  "numberOfBacklogs": 0,
  "cumulativeGPA": 7.8,
  "t1Marks": 18,
  "t2Marks": 17,
  "t3Marks": 30,
  "attendancePercentage": 85,
  "taMarks": 22,
  "adherenceToDeadlines": 4
}
```

**Response:**
```json
{
  "predicted_grade": "A",
  "confidence": 92.5,
  "total_score": 87,
  "grade_probabilities": {
    "A+": 15.2,
    "A": 92.5,
    "B+": 2.3,
    ...
  }
}
```

### GET /health
Health check endpoint.

### GET /model-info
Returns information about the loaded model.

## Model Details

- **Algorithm:** XGBoost Classifier
- **Features:** 9 input parameters
- **Grades:** A+, A, B+, B, C+, C, D+, D, F
- **Dataset:** 15,000 synthetic student records
