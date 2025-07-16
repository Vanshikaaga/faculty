const express = require('express');
const cors = require('cors');
const { fetchAllGrades } = require('./fetchGrades');
const { connectDB, Grade } = require('./mongo');

const app = express(); // <--- THIS LINE IS REQUIRED

app.use(cors());
app.use(express.json());

app.get('/api/grades/all', async (req, res) => {
  try {
    const grades = await fetchAllGrades();
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New endpoint to save grade prediction records
app.post('/api/grades/save', async (req, res) => {
  try {
    await connectDB();
    
    const gradeData = req.body;
    console.log('Saving grade record:', gradeData);
    
    const newGrade = new Grade(gradeData);
    const savedGrade = await newGrade.save();
    
    console.log('Grade record saved successfully:', savedGrade);
    res.status(201).json({ 
      message: 'Grade record saved successfully', 
      data: savedGrade 
    });
  } catch (error) {
    console.error('Error saving grade record:', error);
    res.status(500).json({ 
      message: 'Failed to save grade record', 
      error: error.message 
    });
  }
});

const PORT = 5005;
app.listen(PORT, () => {
  console.log(`Grade analytics backend running on port ${PORT}`);
});