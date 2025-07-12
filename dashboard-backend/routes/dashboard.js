const express = require('express');
const moment = require('moment');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');

const router = express.Router();

// Get dashboard data
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's courses
    const userCourses = await Course.find({ 
      instructor: userId,
      isActive: true 
    }).populate('students');

    // Calculate stats
    const totalStudents = await Student.countDocuments({
      courses: { $in: userCourses.map(c => c._id) },
      isActive: true
    });

    const activeCourses = userCourses.length;

    // Calculate attendance rate for last 30 days
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          course: { $in: userCourses.map(c => c._id) },
          date: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentRecords: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          }
        }
      }
    ]);

    const attendanceRate = attendanceStats.length > 0 
      ? Math.round((attendanceStats[0].presentRecords / attendanceStats[0].totalRecords) * 100)
      : 0;

    // Calculate grade average
    const gradeStats = await Grade.aggregate([
      {
        $match: {
          course: { $in: userCourses.map(c => c._id) }
        }
      },
      {
        $group: {
          _id: null,
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);

    const gradeAverage = gradeStats.length > 0 
      ? Math.round(gradeStats[0].averagePercentage) + '%'
      : 'N/A';

    // Get today's classes
    const today = moment().format('dddd');
    const upcomingClasses = userCourses
      .filter(course => 
        course.schedule.some(schedule => schedule.day === today)
      )
      .map(course => {
        const todaySchedule = course.schedule.find(s => s.day === today);
        return {
          course: course.name,
          code: course.code,
          time: `${todaySchedule.startTime} - ${todaySchedule.endTime}`,
          room: todaySchedule.room
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    res.json({
      totalStudents,
      activeCourses,
      attendanceRate: `${attendanceRate}%`,
      gradeAverage,
      upcomingClasses
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;