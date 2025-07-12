import mongoose from 'mongoose';
import Course from './models/Course.js';

const mongoURI = 'mongodb://localhost:27017/faculty';

const sampleCourses = [
  {
    courseName: 'Data Structures',
    courseCode: 'CSE201',
    instructor: 'Prof. Rakesh',
    semester: '5',
    students: [
      { name: 'Aditi Sharma', enrollment: 'JI12345', cgpa: 8.7 },
      { name: 'Rohan Mehta', enrollment: 'JI12346', cgpa: 9.1 }
    ],
    classSchedule: [
      {
        date: '2025-07-11',
        time: '10:00 AM - 11:30 AM',
        room: 'Room 301',
        topic: 'Trees and Graphs'
      },
      {
        date: '2025-07-13',
        time: '2:00 PM - 3:30 PM',
        room: 'Room 205'
      }
    ]
  }
];

async function seedDB() {
  try {
    await mongoose.connect(mongoURI); // ← no options needed
    await Course.deleteMany({});
    await Course.insertMany(sampleCourses);
    console.log('✅ Seed data inserted');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seedDB();
