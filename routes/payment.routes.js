const express = require('express');
const router = express.Router();
const { getPayments, createPayment, updatePayment, deletePayment, getReturnCommissionReport } = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/return-commission', getReturnCommissionReport);
router.get('/cash-bank-abstract', require('../controllers/payment.controller').getCashBankAbstract);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .put(updatePayment)
  .delete(deletePayment);

module.exports = router;
