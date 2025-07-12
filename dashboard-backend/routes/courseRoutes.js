const express = require('express');
const { getCourses, getStats } = require('../controllers/courseController');
const router = express.Router();

router.get('/', getCourses);
router.get('/stats', getStats);

module.exports = router;
