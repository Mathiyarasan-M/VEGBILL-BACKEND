const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const PurchaseItemSchema = new mongoose.Schema({
  vegetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vegetable', required: true },
  grossWeight: { type: Number, required: true },
  payableWeight: { type: Number },
  count: { type: Number, default: 0 },
  commissionQty: { type: Number, default: 0 },
  actualRate: { type: Number }, // Original Sale Rate
  actualAmount: { type: Number }, // Original Sale Amount
  rate: { type: Number, default: 0 }, // Farmer payout rate (after 10% ded)
  totalAmount: { type: Number, default: 0 },
});

PurchaseItemSchema.pre('save', function (next) {
  if (this.payableWeight === undefined) {
    this.payableWeight = this.grossWeight;
  }
});

const PurchaseSchema = new mongoose.Schema({
  billNo: { type: String, unique: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  items: [PurchaseItemSchema],
  totalAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Credit'], default: 'Credit' },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  advanceAtBill: { type: Number, default: 0 },
  oldBalanceAtBill: { type: Number, default: 0 },
  sourceSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });

PurchaseSchema.pre('save', async function (next) {
  if (this.isNew) {
    const seq = await getNextSequence('purchaseBillNo', this.constructor);
    this.billNo = `PUR-${seq.toString().padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Purchase', PurchaseSchema);
