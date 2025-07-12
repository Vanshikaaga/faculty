const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');  // ✅ Correct path from dashboard-backend/server.js
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/courses', require('./routes/courseRoutes'));    // ✅ ./routes/...
app.use('/api/students', require('./routes/studentRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
