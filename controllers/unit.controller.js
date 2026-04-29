const Unit = require('../models/Unit.model');

exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find({}).sort({ name: 1 });
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUnit = async (req, res) => {
  try {
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Unit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
