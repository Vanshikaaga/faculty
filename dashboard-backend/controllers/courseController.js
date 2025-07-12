const Course = require('../models/Course');
const Student = require('../models/Student');

exports.getCourses = async (req, res) => {
  const courses = await Course.find().populate('students');
  res.json(courses);
};

exports.getStats = async (req, res) => {
  const totalStudents = await Student.countDocuments();
  const activeCourses = await Course.countDocuments({ semester: 'current' }); // Example field
  const attendanceRate = 87; // Placeholder or compute from attendance records
  const gradeAvg = 8.2; // Placeholder or compute from grades

  res.json({
    totalStudents,
    activeCourses,
    attendanceRate,
    gradeAvg
  });
};
