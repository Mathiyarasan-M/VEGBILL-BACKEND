const mongoose = require('mongoose');

const UnitSchema = new mongoose.Schema({
  nameTa: { type: String, required: true, unique: true },
  nameEn: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Unit', UnitSchema);
