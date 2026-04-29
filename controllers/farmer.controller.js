const Farmer = require('../models/Farmer.model');

exports.getFarmers = async (req, res) => {
  try {
    const { isActive, isSelf, page = 1, limit = 10, search = '' } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (isSelf !== undefined) {
      filter.isSelf = isSelf === 'true';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameTamil: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { farmerCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const totalCount = await Farmer.countDocuments(filter);
    const farmers = await Farmer.find(filter)
      .populate('address')
      .populate('addressTamil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      farmers,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.create(req.body);
    const populatedFarmer = await Farmer.findById(farmer._id)
      .populate('address')
      .populate('addressTamil');
    res.status(201).json(populatedFarmer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateFarmer = async (req, res) => {
  try {
    const farmer = await Farmer.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('address')
      .populate('addressTamil');
    res.json(farmer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteFarmer = async (req, res) => {
  try {
    await Farmer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Farmer removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
