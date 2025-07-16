const { connectDB, Grade } = require('./mongo');

async function fetchAllGrades() {
  await connectDB();
  return Grade.find({});
}

module.exports = { fetchAllGrades };