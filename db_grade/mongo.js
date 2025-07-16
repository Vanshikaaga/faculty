const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  name: String,
  rollNo: String,
  backlogs: Number,
  prevSemesterGPA: Number,
  cumulativeGPA: Number,
  test1: Number,
  test2: Number,
  test3: Number,
  attendancePercent: Number,
  adherenceToDeadlines: Number,
  grade: String,
  course: String,
}, { collection: 'grades' });

const Grade = mongoose.model('Grade', gradeSchema);

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://localhost:27017/gradeanalyticsDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
}

module.exports = { connectDB, Grade }; 