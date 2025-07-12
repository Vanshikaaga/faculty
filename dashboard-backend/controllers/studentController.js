const getAllStudents = async (req, res) => {
  res.json({ message: 'All students endpoint working ✅' });
};

module.exports = {
  getAllStudents,
};
