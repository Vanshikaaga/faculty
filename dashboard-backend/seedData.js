const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Student = require('./models/Student');
const Course = require('./models/Course');

dotenv.config(); // ✅ This line loads your .env file!

const seed = async () => {
  await connectDB();

  try {
    await Student.deleteMany();
    await Course.deleteMany();

    // Insert Students
    const students = await Student.insertMany([
      { name: 'Alice Johnson', email: 'alice@example.com', department: 'CSE' },
      { name: 'Bob Smith', email: 'bob@example.com', department: 'CSE' },
      { name: 'Charlie Brown', email: 'charlie@example.com', department: 'ECE' },
    ]);

    // Insert Courses
    const courses = await Course.insertMany([
      {
        name: 'Data Structures',
        code: 'CSE201',
        semester: 'current',
        time: '10:00 AM - 11:30 AM',
        room: 'Room 301',
        students: [students[0]._id, students[1]._id],
        grades: [
          { student: students[0]._id, score: 8.5 },
          { student: students[1]._id, score: 9.0 },
        ],
      },
      {
        name: 'Database Management',
        code: 'CSE301',
        semester: 'current',
        time: '2:00 PM - 3:30 PM',
        room: 'Room 205',
        students: [students[1]._id, students[2]._id],
        grades: [
          { student: students[1]._id, score: 8.0 },
          { student: students[2]._id, score: 8.7 },
        ],
      },
      {
        name: 'Software Engineering',
        code: 'CSE401',
        semester: 'current',
        time: '4:00 PM - 5:30 PM',
        room: 'Room 102',
        students: [students[0]._id, students[2]._id],
        grades: [
          { student: students[0]._id, score: 7.8 },
          { student: students[2]._id, score: 8.9 },
        ],
      },
    ]);

    // Update enrolledCourses for each student
    for (const student of students) {
      const enrolled = courses.filter(course =>
        course.students.includes(student._id)
      );
      student.enrolledCourses = enrolled.map(course => course._id);
      await student.save();
    }

    console.log('✅ Seed data inserted!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
