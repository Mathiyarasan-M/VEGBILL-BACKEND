const Vegetable = require('../models/Vegetable.model');

exports.getVegetables = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { nameEn: { $regex: search, $options: 'i' } },
        { nameTa: { $regex: search, $options: 'i' } },
        { vegetableCode: { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await Vegetable.countDocuments(filter);
    const vegetables = await Vegetable.find(filter)
      .populate('unit')
      .sort({ vegetableCode: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      vegetables,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createVegetable = async (req, res) => {
  try {
    const vegetable = await Vegetable.create(req.body);
    const populatedVegetable = await Vegetable.findById(vegetable._id).populate('unit');
    res.status(201).json(populatedVegetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVegetable = async (req, res) => {
  try {
    const vegetable = await Vegetable.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('unit');
    res.json(vegetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVegetable = async (req, res) => {
  try {
    await Vegetable.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vegetable removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
