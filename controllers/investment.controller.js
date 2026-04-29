const Investment = require('../models/Investment.model');
const InvestmentCategory = require('../models/InvestmentCategory.model');

exports.getCategories = async (req, res) => {
  try {
    const categories = await InvestmentCategory.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new InvestmentCategory(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await InvestmentCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find().populate('category').sort({ date: -1 });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createInvestment = async (req, res) => {
  try {
    const investment = new Investment(req.body);
    await investment.save();
    const populated = await Investment.findById(investment._id).populate('category');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteInvestment = async (req, res) => {
  try {
    await Investment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Investment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
