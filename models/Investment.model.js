const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'InvestmentCategory', required: true }, // Investor Reference
  amount: { type: Number, required: true },
  mode: { type: String, enum: ['Credit', 'Return'], required: true },
  remarks: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Investment', InvestmentSchema);
