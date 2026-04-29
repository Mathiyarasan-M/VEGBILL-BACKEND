const mongoose = require('mongoose');

const VillageSchema = new mongoose.Schema({
  villageId: { type: Number, unique: true },
  nameTa: { type: String, required: true },
  nameEn: { type: String, required: true }, 
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Village', VillageSchema);