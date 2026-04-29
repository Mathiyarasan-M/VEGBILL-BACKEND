const mongoose = require('mongoose');
const { getNextSequence } = require('../utils/sequenceGenerator');

const FarmerSchema = new mongoose.Schema({
  farmerCode: { type: String, unique: true },
  name: { type: String, required: true },
  nameTamil: String,
  mobile: { type: String, required: true },
   address: {type:mongoose.Schema.Types.ObjectId, ref: 'Village', required: true},
    addressTamil: {type:mongoose.Schema.Types.ObjectId, ref: 'Village', required: true},
  credit: { type: Number, default: 0 },
  debit: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isSelf: { type: Boolean, default: false }
}, { timestamps: true });

FarmerSchema.pre('save', async function (next) {
  if (this.isNew && !this.farmerCode) {
    const seq = await getNextSequence('farmerCode', this.constructor);
    this.farmerCode = `F${seq.toString().padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Farmer', FarmerSchema);
