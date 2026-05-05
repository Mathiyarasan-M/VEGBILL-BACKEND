const express = require('express');
const router = express.Router();
const { getFarmers, createFarmer, updateFarmer, deleteFarmer, getFarmerLedger, getFarmerVegAbstract, getFarmerVegDetail } = require('../controllers/farmer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// router.use(protect);

router.get('/ledger', getFarmerLedger);
router.get('/veg-abstract', getFarmerVegAbstract);
router.get('/veg-detail', getFarmerVegDetail);
router.get('/seller-veg-payment-details', require('../controllers/farmer.controller').getSellerVegPaymentDetails);

router.route('/')
  .get(getFarmers)
  .post(createFarmer);

router.route('/:id')
  .put(updateFarmer)
  .delete(deleteFarmer);

module.exports = router;
