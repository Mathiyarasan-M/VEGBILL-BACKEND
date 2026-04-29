const Village = require('../models/Village.model');

exports.getVillages = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { nameEn: { $regex: search, $options: 'i' } },
        { nameTa: { $regex: search, $options: 'i' } }
      ];
    }

    const totalCount = await Village.countDocuments(filter);
    const villages = await Village.find(filter)
      .sort({ nameEn: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      villages,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVillageById = async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);
    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }
    res.json(village);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createVillage = async (req, res) => {
  try {
    const village = await Village.create(req.body);
    res.status(201).json(village);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVillage = async (req, res) => {
  try {
    const village = await Village.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }
    res.json(village);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVillage = async (req, res) => {
  try {
    const village = await Village.findByIdAndDelete(req.params.id);
    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }
    res.json({ message: 'Village removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
