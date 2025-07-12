const express = require('express');
const router = express.Router();
const { getAllStudents } = require('../controllers/studentController'); // ✅ must match file name + export

router.get('/', getAllStudents); // ✅

module.exports = router;
