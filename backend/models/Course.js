import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: String,
  enrollment: String,
  cgpa: Number,
});

const classScheduleSchema = new mongoose.Schema({
  date: String,
  time: String,
  room: String,
  topic: String,
});

const courseSchema = new mongoose.Schema({
  courseName: String,
  courseCode: String,
  instructor: String,
  semester: String,
  students: [studentSchema],
  classSchedule: [classScheduleSchema],
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
