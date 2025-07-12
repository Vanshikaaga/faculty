
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from xgboost import XGBClassifier
import joblib
import os

def train_and_save_model():
    # Generate dataset first if it doesn't exist
    if not os.path.exists('clean_student_dataset.csv'):
        print("Dataset not found. Generating dataset...")
        from generate_dataset import generate_clean_student_dataset
        clean_df = generate_clean_student_dataset(15000)
        clean_df.to_csv('clean_student_dataset.csv', index=False)
        print("Dataset generated!")

    # Load the clean dataset
    df = pd.read_csv('clean_student_dataset.csv')
    print(f"Loaded dataset with shape: {df.shape}")

    # Define Final_Grade numeric mapping
    grade_mapping = {
        'A+': 0, 'A': 1, 'B+': 2, 'B': 3,
        'C+': 4, 'C': 5, 'D+': 6, 'D': 7, 'F': 8
    }
    df['Grade_Label'] = df['Final_Grade'].map(grade_mapping)

    # Prepare features and target
    X = df.drop(['Student_ID', 'Final_Grade', 'Grade_Label', 'Total_Score'], axis=1)
    y = df['Grade_Label']

    print(f"Features: {list(X.columns)}")
    print(f"Target distribution:\n{df['Final_Grade'].value_counts()}")

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Feature scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train XGBoost model
    xgb_model = XGBClassifier(
        n_estimators=300,
        use_label_encoder=False,
        random_state=42,
        eval_metric='mlogloss'
    )

    print("Training XGBoost model...")
    xgb_model.fit(X_train_scaled, y_train)

    # Evaluate model
    y_pred = xgb_model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='macro', zero_division=0)
    recall = recall_score(y_test, y_pred, average='macro', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='macro', zero_division=0)

    print(f"\nModel Performance:")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1-score: {f1:.4f}")

    # Save model and scaler
    joblib.dump(xgb_model, 'grade_prediction_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    
    # Save feature names for later use
    feature_names = list(X.columns)
    joblib.dump(feature_names, 'feature_names.pkl')
    
    # Save grade mapping
    reverse_grade_mapping = {v: k for k, v in grade_mapping.items()}
    joblib.dump(reverse_grade_mapping, 'grade_mapping.pkl')

    print("\nModel, scaler, and metadata saved successfully!")
    return xgb_model, scaler, feature_names, reverse_grade_mapping

if __name__ == "__main__":
    train_and_save_model()
