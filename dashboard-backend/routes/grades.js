const express = require('express');
const auth = require('../middleware/auth');
const Grade = require('../models/Grade');
const Course = require('../models/Course');

const router = express.Router();

// Get grades for a course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user._id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const grades = await Grade.find({ course: course._id })
      .populate('student', 'name studentId')
      .sort({ createdAt: -1 });
    
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit grade
router.post('/submit', auth, async (req, res) => {
  try {
    const { courseId, studentId, assessment, score, maxScore } = req.body;
    
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const grade = new Grade({
      course: courseId,
      student: studentId,
      assessment,
      score,
      maxScore,
      submittedBy: req.user._id
    });
    
    await grade.save();
    res.status(201).json(grade);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;