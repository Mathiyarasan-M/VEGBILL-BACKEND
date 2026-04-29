const express = require('express');
const router = express.Router();
const { getVendors, createVendor, updateVendor, deleteVendor } = require('../controllers/vendor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// router.use(protect);

router.route('/')
  .get(getVendors)
  .post(createVendor);

router.route('/:id')
  .put(updateVendor)
  .delete(deleteVendor);

module.exports = router;
