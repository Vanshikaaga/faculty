// models/Grade.js
const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assessment: {
    type: String,
    required: true // e.g., "Midterm", "Final", "Assignment 1"
  },
  score: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate percentage and letter grade before saving
gradeSchema.pre('save', function(next) {
  this.percentage = (this.score / this.maxScore) * 100;
  
  if (this.percentage >= 97) this.letterGrade = 'A+';
  else if (this.percentage >= 93) this.letterGrade = 'A';
  else if (this.percentage >= 90) this.letterGrade = 'A-';
  else if (this.percentage >= 87) this.letterGrade = 'B+';
  else if (this.percentage >= 83) this.letterGrade = 'B';
  else if (this.percentage >= 80) this.letterGrade = 'B-';
  else if (this.percentage >= 77) this.letterGrade = 'C+';
  else if (this.percentage >= 73) this.letterGrade = 'C';
  else if (this.percentage >= 70) this.letterGrade = 'C-';
  else if (this.percentage >= 60) this.letterGrade = 'D';
  else this.letterGrade = 'F';
  
  next();
});

module.exports = mongoose.model('Grade', gradeSchema);