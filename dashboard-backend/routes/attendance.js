const express = require('express');
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

const router = express.Router();

// Get attendance for a course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user._id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const attendance = await Attendance.find({ course: course._id })
      .populate('student', 'name studentId')
      .sort({ date: -1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark attendance
router.post('/mark', auth, async (req, res) => {
  try {
    const { courseId, studentId, date, status } = req.body;
    
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    const attendance = new Attendance({
      course: courseId,
      student: studentId,
      date: new Date(date),
      status,
      markedBy: req.user._id
    });
    
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Attendance already marked for this date' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

module.exports = router;