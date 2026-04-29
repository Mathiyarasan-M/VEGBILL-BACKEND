const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const VendorSchema = new mongoose.Schema({
  vendorCode: { type: String, unique: true },
  name: { type: String, required: true },
  nameTamil: String,
  shopName: String,
  mobile: { type: String, required: true },
  address: {type:mongoose.Schema.Types.ObjectId, ref: 'Village', required: true},
  addressTamil: {type:mongoose.Schema.Types.ObjectId, ref: 'Village', required: true},
  credit: { type: Number, default: 0 },
  debit: { type: Number, default: 0 }
}, { timestamps: true });

VendorSchema.pre('save', async function (next) {
  if (this.isNew && !this.vendorCode) {
    const seq = await getNextSequence('vendorCode', this.constructor);
    this.vendorCode = `V${seq.toString().padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Vendor', VendorSchema);
