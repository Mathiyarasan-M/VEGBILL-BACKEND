const express = require('express');
const router = express.Router();
const counterController = require('../controllers/counter.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/next/:id', protect, counterController.getNextCode);

module.exports = router;
