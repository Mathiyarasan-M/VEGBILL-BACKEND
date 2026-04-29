const mongoose = require('mongoose');

const ExpenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseCategory', ExpenseCategorySchema);
