const express = require('express');
const router = express.Router();
const { getVegetables, createVegetable, updateVegetable, deleteVegetable } = require('../controllers/vegetable.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// router.use(protect);

router.route('/')
  .get(getVegetables)
  .post(createVegetable);

router.route('/:id')
  .put(updateVegetable)
  .delete(deleteVegetable);

module.exports = router;
