const express = require('express');
const router = express.Router();
const { 
  getCategories, createCategory, updateCategory, 
  getExpenses, createExpense, deleteExpense 
} = require('../controllers/expense.controller');

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);

router.get('/', getExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
