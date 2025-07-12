const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    const courses = await Course.find({ semester: 'current' });

    const totalStudents = students.length;
    const activeCourses = courses.length;

    // Grade average calculation
    let totalGrades = 0;
    let totalCount = 0;
    courses.forEach(course => {
      course.grades.forEach(g => {
        totalGrades += g.score;
        totalCount++;
      });
    });
    const gradeAverage = totalCount > 0 ? (totalGrades / totalCount).toFixed(1) : 0;

    // Upcoming classes for today
    const upcomingClasses = courses.map(course => ({
      course: course.name,
      code: course.code,
      time: course.time,
      room: course.room
    }));

    res.json({
      totalStudents,
      activeCourses,
      gradeAverage,
      upcomingClasses
    });
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
