import pandas as pd
import numpy as np
import random
from scipy.stats import truncnorm
from sklearn.preprocessing import RobustScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import pennylane as qml
from pennylane import numpy as qnp
from sklearn.svm import SVC
from tqdm import tqdm
import sys
import json
import joblib # Import joblib
import os # Import os for path checking

# --- Constants for model paths ---
anomaly_qsvm_model_path = 'anomaly_qsvm_model.pkl'
anomaly_xtrain_small_path = 'anomaly_xtrain_small.pkl'

def truncated_normal(mean, std, lower, upper):
    a, b = (lower - mean) / std, (upper - mean) / std
    return truncnorm.rvs(a, b, loc=mean, scale=std)

def generate_clean_student_dataset(n_students=500):
    students = []
    for i in range(n_students):
        attendance = int(round(truncated_normal(80, 10, 30, 100)))
        adherence = int(round(truncated_normal(4, 1, 0, 5)))
        ta_base = (attendance / 100) * 15 + (adherence / 5) * 10
        ta_marks = int(round(min(25, max(0, ta_base + np.random.normal(0, 1.5)))) )
        backlogs = np.random.choice([0, 1, 2, 3], p=[0.7, 0.2, 0.07, 0.03])
        distraction_penalty = backlogs * 1.5
        t1_marks = int(round(truncated_normal(15 - distraction_penalty, 2, 0, 20)))
        t2_marks = int(round(truncated_normal(15 - distraction_penalty, 2, 0, 20)))
        t3_marks = int(round(truncated_normal(27 - distraction_penalty, 3, 0, 35)))
        prev_gpa = round(truncated_normal(6.5, 1.2, 0, 10), 2)
        cum_gpa = round(truncated_normal(6.8, 1.1, 0, 10), 2)
        total_score = t1_marks + t2_marks + t3_marks + ta_marks
        grade = 'A+' if total_score >= 90 else 'F'
        students.append({
            'Previous_Semester_GPA': prev_gpa,
            'No_of_Backlogs': backlogs,
            'Cumulative_GPA': cum_gpa,
            'T1_Marks': t1_marks,
            'T2_Marks': t2_marks,
            'T3_Marks': t3_marks,
            'Attendance_Percentage': attendance,
            'TA_Marks': ta_marks,
            'Adherence_to_Deadlines': adherence,
            'Total_Score': total_score,
            'Final_Grade': grade
        })
    return pd.DataFrame(students)

def inject_anomalies(df, anomaly_fraction=1.0):
    df = df.copy()
    n_anomalies = int(len(df) * anomaly_fraction)
    anomalies = []
    for _ in range(n_anomalies):
        a = df.sample(1).copy().iloc[0]
        a['Attendance_Percentage'] = random.randint(0, 20)
        a['Cumulative_GPA'] = round(random.uniform(8.5, 10.0), 2)
        a['TA_Marks'] = 25
        a['T1_Marks'] = 0
        a['T2_Marks'] = 0
        a['T3_Marks'] = 0
        a['No_of_Backlogs'] = 3
        a['Anomaly_Label'] = 1
        anomalies.append(a)
    normal_df = df.copy()
    normal_df['Anomaly_Label'] = 0
    return pd.concat([normal_df, pd.DataFrame(anomalies)], ignore_index=True).sample(frac=1).reset_index(drop=True)

# ========== 2. Data Prep ==========
# df = inject_anomalies(generate_clean_student_dataset(500), anomaly_fraction=1.0) # Moved to __main__
features = ['Cumulative_GPA', 'No_of_Backlogs', 'T1_Marks', 'T2_Marks', 'Attendance_Percentage', 'TA_Marks']
# X = df[features].values # Moved to __main__
# y = df['Anomaly_Label'].values # Moved to __main__
# X_scaled = RobustScaler().fit_transform(X) # Moved to __main__

# X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.3, stratify=y, random_state=42) # Moved to __main__
# X_val, X_test, y_val, y_test = train_test_split(X_test, y_test, test_size=0.5, stratify=y_test, random_state=42) # Moved to __main__

# X_train_small = X_train[:300] # Moved to __main__
# y_train_small = y_train[:300] # Moved to __main__
# X_test_small = X_test[:150] # Moved to __main__
# y_test_small = y_test[:150] # Moved to __main__

# ========== 3. QSVM with Angle Embedding ==========
n_qubits = len(features)
dev = qml.device("default.qubit", wires=n_qubits)

@qml.qnode(dev)
def kernel_circuit(x1, x2):
    qml.templates.AngleEmbedding(x1, wires=range(n_qubits))
    qml.adjoint(qml.templates.AngleEmbedding)(x2, wires=range(n_qubits))
    return qml.probs(wires=range(n_qubits))

def quantum_kernel_matrix(X1, X2, disable_tqdm=False):
    kernel = np.zeros((len(X1), len(X2)))
    # Explicitly set file=sys.stderr for tqdm output
    for i in tqdm(range(len(X1)), desc="Computing quantum kernel", disable=disable_tqdm, file=sys.stderr):
        for j in range(len(X2)):
            kernel[i, j] = kernel_circuit(X1[i], X2[j])[0]
    return kernel

# Global variables for loaded models/scalers
loaded_qsvm_model = None
loaded_xtrain_small = None

def load_anomaly_detection_model():
    global loaded_qsvm_model, loaded_xtrain_small
    if loaded_qsvm_model is None or loaded_xtrain_small is None:
        # Check if model files exist, if not train the model
        if not all(os.path.exists(f) for f in [anomaly_qsvm_model_path, anomaly_xtrain_small_path]):
            print("Anomaly detection model files not found. Training model...", file=sys.stderr)
            # Re-run data prep for model training
            df = inject_anomalies(generate_clean_student_dataset(500), anomaly_fraction=1.0)
            X = df[features].values
            y = df['Anomaly_Label'].values
            X_scaled = RobustScaler().fit_transform(X)

            X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.3, stratify=y, random_state=42)
            X_val, X_test, y_val, y_test = train_test_split(X_test, y_test, test_size=0.5, stratify=y_test, random_state=42)

            X_train_small_trained = X_train[:300]
            y_train_small_trained = y_train[:300]

            kernel_train = quantum_kernel_matrix(X_train_small_trained, X_train_small_trained, disable_tqdm=True)
            qsvm_trained = SVC(kernel='precomputed', C=10, class_weight='balanced')
            qsvm_trained.fit(kernel_train, y_train_small_trained)

            # Save the trained model and X_train_small
            joblib.dump(qsvm_trained, anomaly_qsvm_model_path)
            joblib.dump(X_train_small_trained, anomaly_xtrain_small_path)
            print("Anomaly detection model trained and saved.", file=sys.stderr)

        # Load the trained model and X_train_small
        loaded_qsvm_model = joblib.load(anomaly_qsvm_model_path)
        loaded_xtrain_small = joblib.load(anomaly_xtrain_small_path)
        print("Anomaly detection model loaded successfully!", file=sys.stderr)

# ========== Anomaly Detection Function ==========
def is_anomaly(record):
    print("is_anomaly: Starting...", file=sys.stderr)
    load_anomaly_detection_model() # Ensure model is loaded
    print("is_anomaly: Model loaded.", file=sys.stderr)

    X_input = np.array([[record['Cumulative_GPA'], record['No_of_Backlogs'], record['T1_Marks'], record['T2_Marks'], record['Attendance_Percentage'], record['TA_Marks']]])
    X_scaled_input = RobustScaler().fit_transform(X_input)
    print("is_anomaly: Input scaled.", file=sys.stderr)
    
    # Use the loaded X_train_small for kernel computation
    kernel = quantum_kernel_matrix(X_scaled_input, loaded_xtrain_small, disable_tqdm=True)
    print("is_anomaly: Kernel computed.", file=sys.stderr)
    pred = loaded_qsvm_model.predict(kernel)
    print("is_anomaly: Prediction made.", file=sys.stderr)
    return int(pred[0])

if __name__ == '__main__':
    # This block is for direct script execution for testing/debugging
    # It will train and save the model if not already present.
    load_anomaly_detection_model() # Ensure model is trained/loaded when run directly
    print("anomaly_detection.py: Ready for input.", file=sys.stderr)

    try:
        input_data = json.loads(sys.stdin.read())
        print(f"anomaly_detection.py: Received input: {input_data}", file=sys.stderr)
        result = is_anomaly(input_data)
        print(json.dumps({"anomaly": bool(result)}))
        print("anomaly_detection.py: Sent output.", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"anomaly_detection.py Error: JSONDecodeError - {e}", file=sys.stderr)
        print(json.dumps({"error": f"JSON input error: {e}"}))
    except Exception as e:
        print(f"anomaly_detection.py Error: {e}", file=sys.stderr)
        print(json.dumps({"error": f"An unexpected error occurred: {e}"})) 