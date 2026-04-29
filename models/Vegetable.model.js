const mongoose = require('mongoose');

const VegetableSchema = new mongoose.Schema({
  vegetableCode: { type: String, unique: true },
  nameEn: { type: String, required: true },
  nameTa: { type: String, required: true },
  unit:   {type:mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true},
  commission: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Vegetable', VegetableSchema);
