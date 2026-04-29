const express = require('express');
const router = express.Router();
const { getFarmers, createFarmer, updateFarmer, deleteFarmer } = require('../controllers/farmer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// router.use(protect);

router.route('/')
  .get(getFarmers)
  .post(createFarmer);

router.route('/:id')
  .put(updateFarmer)
  .delete(deleteFarmer);

module.exports = router;
