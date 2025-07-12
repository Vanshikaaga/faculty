const express = require('express');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Student = require('../models/Student');

const router = express.Router();

// Get all courses for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find({ 
      instructor: req.user._id 
    }).populate('students', 'name studentId email');
    
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new course
router.post('/', auth, async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user._id
    };
    
    const course = new Course(courseData);
    await course.save();
    
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Course code already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Get course by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      instructor: req.user._id
    }).populate('students', 'name studentId email');
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course
router.put('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      req.body,
      { new: true }
    );
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete course
router.delete('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      instructor: req.user._id
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;