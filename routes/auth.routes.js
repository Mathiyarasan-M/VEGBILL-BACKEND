const express = require('express');
const router = express.Router();
const { login, getProfile, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);

module.exports = router;
