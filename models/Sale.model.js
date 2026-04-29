const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const SaleItemSchema = new mongoose.Schema({
  vegetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vegetable', required: true },
  quantity: { type: Number, required: true },
  count: { type: Number, default: 0 },
  rate: { type: Number, required: true },
  coolieRate: { type: Number, default: 0 },
  coolieAmount: { type: Number, default: 0 },
  itemFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
});

const SaleSchema = new mongoose.Schema({
  billNo: { type: String, unique: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmer" },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  totalCoolie: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Credit', 'Bank'], default: 'Cash' },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' },
  oldBalanceAtBill: { type: Number, default: 0 },
  coolieAtBill: { type: Number, default: 0 },
  hasCommission: { type: Boolean, default: false }
}, { timestamps: true });

SaleSchema.pre('save', async function (next) {
  if (this.isNew) {
    const seq = await getNextSequence('saleBillNo', this.constructor);
    this.billNo = `SAL-${seq.toString().padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Sale', SaleSchema);
