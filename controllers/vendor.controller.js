const Vendor = require('../models/Vendor.model');

exports.getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameTamil: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { vendorCode: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const totalCount = await Vendor.countDocuments(filter);
    const vendors = await Vendor.find(filter)
      .populate('address')
      .populate('addressTamil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      vendors,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    const populatedVendor = await Vendor.findById(vendor._id)
      .populate('address')
      .populate('addressTamil');
    res.status(201).json(populatedVendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('address')
      .populate('addressTamil');
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
