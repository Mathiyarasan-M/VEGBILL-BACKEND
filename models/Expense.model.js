const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const ExpenseSchema = new mongoose.Schema({
  receiptNo: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
  amount: { type: Number, required: true },
  paidTo: { type: String },
  note: { type: String },
  paymentMethod: { type: String, enum: ['Cash', 'Bank', 'UPI'], default: 'Cash' }
}, { timestamps: true });

ExpenseSchema.pre('save', async function (next) {
  if (this.isNew) {
    const seq = await getNextSequence('expenseReceiptNo', this.constructor);
    this.receiptNo = `EXP-${seq.toString().padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Expense', ExpenseSchema);
