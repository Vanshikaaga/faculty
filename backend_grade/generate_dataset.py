
import pandas as pd
import numpy as np
import random
from scipy.stats import truncnorm

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

def truncated_normal(mean, std, lower, upper):
    a, b = (lower - mean) / std, (upper - mean) / std
    return truncnorm.rvs(a, b, loc=mean, scale=std)

def generate_clean_student_dataset(n_students=15000):
    students = []

    for i in range(n_students):
        student_id = f"S{i+1:05d}"

        # Attendance and adherence
        attendance = int(round(truncated_normal(80, 10, 30, 100)))
        adherence = int(round(truncated_normal(4, 1, 0, 5)))

        # TA marks are influenced by attendance and adherence
        ta_base = (attendance / 100) * 15 + (adherence / 5) * 10  # total weight = 25
        ta_marks = int(round(min(25, max(0, ta_base + np.random.normal(0, 1.5)))))

        # Backlogs (random, but can affect test performance)
        backlogs = np.random.choice([0, 1, 2, 3], p=[0.7, 0.2, 0.07, 0.03])

        # Test marks are influenced negatively by backlogs
        distraction_penalty = backlogs * 1.5

        t1_marks = int(round(truncated_normal(15 - distraction_penalty, 2, 0, 20)))
        t2_marks = int(round(truncated_normal(15 - distraction_penalty, 2, 0, 20)))
        t3_marks = int(round(truncated_normal(27 - distraction_penalty, 3, 0, 35)))

        # GPA fields are random (they don't affect grade)
        prev_gpa = round(truncated_normal(6.5, 1.2, 0, 10), 2)
        cum_gpa = round(truncated_normal(6.8, 1.1, 0, 10), 2)

        # Total score (T1 + T2 + T3 + TA)
        total_score = t1_marks + t2_marks + t3_marks + ta_marks

        # Grade mapping
        if total_score >= 90:
            grade = 'A+'
        elif total_score >= 85:
            grade = 'A'
        elif total_score >= 75:
            grade = 'B+'
        elif total_score >= 65:
            grade = 'B'
        elif total_score >= 55:
            grade = 'C+'
        elif total_score >= 45:
            grade = 'C'
        elif total_score >= 35:
            grade = 'D+'
        elif total_score >= 25:
            grade = 'D'
        else:
            grade = 'F'

        student = {
            'Student_ID': student_id,
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
        }

        students.append(student)

    return pd.DataFrame(students)

if __name__ == "__main__":
    # Generate the clean dataset
    clean_df = generate_clean_student_dataset(15000)
    clean_df.to_csv('clean_student_dataset.csv', index=False)
    print("Dataset generated and saved as 'clean_student_dataset.csv'")
    print(f"Dataset shape: {clean_df.shape}")
    print("\nFirst 5 rows:")
    print(clean_df.head())
