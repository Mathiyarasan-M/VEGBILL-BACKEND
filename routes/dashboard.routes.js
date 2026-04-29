const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
// Add auth middleware if needed, for now keeping it simple as per other routes
// const { protect } = require('../middleware/auth.middleware');

router.get('/stats', dashboardController.getStats);

module.exports = router;
