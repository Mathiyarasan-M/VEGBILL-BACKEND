const express = require('express');
const router = express.Router();
const { getPurchases, createPurchase, updatePurchase, deletePurchase } = require('../controllers/purchase.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(createPurchase);

router.route('/:id')
  .put(updatePurchase)
  .delete(deletePurchase);

module.exports = router;
