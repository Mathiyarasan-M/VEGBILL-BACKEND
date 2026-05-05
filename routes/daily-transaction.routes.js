const express = require('express');
const router = express.Router();
const dailyTransactionController = require('../controllers/daily-transaction.controller');

router.get('/', dailyTransactionController.getDailyTransactions);
router.get('/abstract', dailyTransactionController.getDailyTransactionAbstract);
router.get('/important', dailyTransactionController.getDailyTransactionImportant);
router.get('/payment-ledger', dailyTransactionController.getDailyPaymentLedger);

module.exports = router;
