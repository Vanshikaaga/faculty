# Grade Analytics Database Server

This server handles storing and retrieving grade prediction records in MongoDB.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB
Make sure MongoDB is running on your system:
- **Windows**: Start MongoDB service or run `mongod`
- **macOS**: `brew services start mongodb-community`
- **Linux**: `sudo systemctl start mongod`

### 3. Test Database Connection
```bash
node test-connection.js
```

### 4. Start the Server
```bash
npm start
```

The server will run on port 5005.

## API Endpoints

### GET /api/grades/all
Fetches all grade records from the database.

### POST /api/grades/save
Saves a new grade prediction record to the database.

**Request Body:**
```json
{
  "name": "Student Name",
  "rollNo": "Student ID",
  "backlogs": 0,
  "prevSemesterGPA": 8.5,
  "cumulativeGPA": 8.2,
  "test1": 18,
  "test2": 17,
  "test3": 30,
  "attendancePercent": 85,
  "adherenceToDeadlines": 22,
  "grade": "A",
  "course": "CSE201 - Data Structures"
}
```

## Database Schema

The grades are stored in a MongoDB collection with the following schema:
- `name`: Student name
- `rollNo`: Student ID
- `backlogs`: Number of backlogs
- `prevSemesterGPA`: Previous semester GPA
- `cumulativeGPA`: Cumulative GPA
- `test1`: Test 1 marks (out of 20)
- `test2`: Test 2 marks (out of 20)
- `test3`: Test 3 marks (out of 35)
- `attendancePercent`: Attendance percentage
- `adherenceToDeadlines`: TA marks (out of 25)
- `grade`: Predicted grade
- `course`: Course name

## Troubleshooting

1. **MongoDB Connection Error**: Make sure MongoDB is running and accessible
2. **Port Already in Use**: Change the port in `server.js` if 5005 is occupied
3. **CORS Issues**: The server is configured to allow all origins for development 