const Purchase = require('../models/Purchase.model');

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({}).populate({
      path: 'farmerId',
      populate: { path: 'address' }
    }).populate('items.vegetableId').sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.create(req.body);
    const populatedPurchase = await Purchase.findById(purchase._id).populate({
      path: 'farmerId',
      populate: { path: 'address' }
    }).populate('items.vegetableId');
    res.status(201).json(populatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate({
      path: 'farmerId',
      populate: { path: 'address' }
    }).populate('items.vegetableId');
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Purchase removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
