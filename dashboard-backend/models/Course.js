const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  time: String,
  room: String,
  semester: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  assignments: [{ title: String, description: String, dueDate: Date }],
  grades: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    score: Number
  }],
  attendanceRecords: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    date: Date,
    present: Boolean
  }]
});

module.exports = mongoose.model('Course', courseSchema);
