const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');

const router = express.Router();

// Get all students for teacher's courses
router.get('/', auth, async (req, res) => {
  try {
    const teacherCourses = await Course.find({ instructor: req.user._id });
    const courseIds = teacherCourses.map(course => course._id);
    
    const students = await Student.find({
      courses: { $in: courseIds },
      isActive: true
    }).populate('courses', 'code name');
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const teacherCourses = await Course.find({ instructor: req.user._id });
    const courseIds = teacherCourses.map(course => course._id);
    
    const student = await Student.findOne({
      _id: req.params.id,
      courses: { $in: courseIds },
      isActive: true
    }).populate('courses', 'code name');
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new student
router.post('/', auth, [
  body('studentId').trim().isLength({ min: 1 }).withMessage('Student ID is required'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('department').trim().isLength({ min: 1 }).withMessage('Department is required'),
  body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('semester').isInt({ min: 1, max: 2 }).withMessage('Semester must be 1 or 2')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, name, email, department, year, semester } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ studentId }, { email }]
    });

    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this ID or email already exists' });
    }

    const student = new Student({
      studentId,
      name,
      email,
      department,
      year,
      semester
    });

    await student.save();
    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('department').optional().trim().isLength({ min: 1 }).withMessage('Department is required'),
  body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('semester').optional().isInt({ min: 1, max: 2 }).withMessage('Semester must be 1 or 2')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('courses', 'code name');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete student (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from all courses
    await Course.updateMany(
      { students: student._id },
      { $pull: { students: student._id } }
    );

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add student to course
router.post('/:studentId/courses/:courseId', auth, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Check if course belongs to the teacher
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not authorized' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if student is already enrolled in the course
    if (course.students.includes(student._id)) {
      return res.status(400).json({ message: 'Student is already enrolled in this course' });
    }

    // Add student to course
    course.students.push(student._id);
    await course.save();

    // Add course to student
    if (!student.courses.includes(course._id)) {
      student.courses.push(course._id);
      await student.save();
    }

    res.json({ message: 'Student added to course successfully' });
  } catch (error) {
    console.error('Error adding student to course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove student from course
router.delete('/:studentId/courses/:courseId', auth, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    // Check if course belongs to the teacher
    const course = await Course.findOne({
      _id: courseId,
      instructor: req.user._id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not authorized' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Remove student from course
    course.students = course.students.filter(id => !id.equals(student._id));
    await course.save();

    // Remove course from student
    student.courses = student.courses.filter(id => !id.equals(course._id));
    await student.save();

    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    console.error('Error removing student from course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get students by course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructor: req.user._id
    }).populate('students', 'studentId name email department year semester');

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not authorized' });
    }

    res.json(course.students);
  } catch (error) {
    console.error('Error fetching students by course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search students
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    
    // Get teacher's courses to limit search scope
    const teacherCourses = await Course.find({ instructor: req.user._id });
    const courseIds = teacherCourses.map(course => course._id);

    const students = await Student.find({
      courses: { $in: courseIds },
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).populate('courses', 'code name')
      .limit(20);

    res.json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Verify student belongs to teacher's courses
    const teacherCourses = await Course.find({ instructor: req.user._id });
    const courseIds = teacherCourses.map(course => course._id);
    
    const student = await Student.findOne({
      _id: studentId,
      courses: { $in: courseIds },
      isActive: true
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get attendance statistics
    const Attendance = require('../models/Attendance');
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          student: student._id,
          course: { $in: courseIds }
        }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get grade statistics
    const Grade = require('../models/Grade');
    const gradeStats = await Grade.aggregate([
      {
        $match: {
          student: student._id,
          course: { $in: courseIds }
        }
      },
      {
        $group: {
          _id: null,
          averageGrade: { $avg: '$percentage' },
          totalAssignments: { $sum: 1 }
        }
      }
    ]);

    const attendance = attendanceStats[0] || { totalClasses: 0, presentClasses: 0 };
    const grades = gradeStats[0] || { averageGrade: 0, totalAssignments: 0 };

    res.json({
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        department: student.department,
        year: student.year,
        semester: student.semester
      },
      attendance: {
        totalClasses: attendance.totalClasses,
        presentClasses: attendance.presentClasses,
        attendanceRate: attendance.totalClasses > 0 
          ? Math.round((attendance.presentClasses / attendance.totalClasses) * 100)
          : 0
      },
      grades: {
        averageGrade: Math.round(grades.averageGrade || 0),
        totalAssignments: grades.totalAssignments
      }
    });
  } catch (error) {
    console.error('Error fetching student statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;