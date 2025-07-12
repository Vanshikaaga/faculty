from flask import request, jsonify
import csv
import os
from datetime import datetime

def save_attendance():
    data = request.get_json()
    course_id = data.get('courseId')
    records = data.get('attendance', [])

    filename = f'attendance_{course_id}_{datetime.now().strftime("%Y%m%d")}.csv'
    filepath = os.path.join('attendance.csv')

    with open(filepath, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Name', 'Roll Number', 'Status', 'Confidence', 'Timestamp'])
        for student in records:
            writer.writerow([student['name'], student['rollNo'], student['status'], student['confidence'], student['timestamp']])

    return jsonify({'status': 'success'})
