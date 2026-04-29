const mongoose = require('mongoose');

const InvestmentCategorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // This is the Investor Name
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InvestmentCategory', InvestmentCategorySchema);
