const express = require('express');
const router = express.Router();
const { 
  getCategories, createCategory, updateCategory, 
  getInvestments, createInvestment, deleteInvestment 
} = require('../controllers/investment.controller');

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

router.get('/', getInvestments);
router.post('/', createInvestment);
router.delete('/:id', deleteInvestment);

module.exports = router;
