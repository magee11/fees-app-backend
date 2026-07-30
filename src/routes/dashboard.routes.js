const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', protect, dashboardController.getDashboard);

module.exports = router;
