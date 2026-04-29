const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const PaymentSchema = new mongoose.Schema({
  receiptNo: { type: String, unique: true },
  partyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  partyType: { type: String, enum: ['Farmer', 'Vendor'], required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true }, // IN for Receipts, OUT for Payments
  paymentMethod: { type: String, enum: ['Cash', 'Bank', 'UPI'], default: 'Cash' },
  date: { type: Date, default: Date.now },
  note: { type: String },
  billId: { type: mongoose.Schema.Types.ObjectId }, // Link to Sale or Purchase
  billType: { type: String, enum: ['Sale', 'Purchase'] },
  billInfo: { type: mongoose.Schema.Types.Mixed }, // Store snapshot for PDF/Voucher
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // Optional manual reference
  isAdvance: { type: Boolean, default: false }
}, { timestamps: true });

PaymentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const isIN = this.type === 'IN';
    const prefix = isIN ? 'RCV' : 'PAY';
    const seqId = isIN ? 'paymentInSeq' : 'paymentOutSeq';
    
    // Check count for specific type to reset if empty
    const seq = await getNextSequence(seqId, this.constructor, { type: this.type });
    this.receiptNo = `${prefix}-${seq.toString().padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Payment', PaymentSchema);
