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
exports.getFarmerLedger = async (req, res) => {
  try {
    const { farmerId, startDate, endDate } = req.query;
    if (!farmerId) return res.status(400).json({ message: 'Farmer ID is required' });

    const farmer = await Farmer.findById(farmerId).populate('address addressTamil');
    if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

    const start = new Date(startDate || '2000-01-01');
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const Purchase = require('../models/Purchase.model');
    const Payment = require('../models/Payment.model');

    // 1. Get Opening Balance (records before startDate)
    // For Farmer: Purchase is Credit (+), Payment OUT is Debit (-)
    const purchasesBefore = await Purchase.find({ farmerId, date: { $lt: start } });
    const paymentsBefore = await Payment.find({ 
      partyId: farmerId, 
      partyType: 'Farmer', 
      type: 'OUT', 
      date: { $lt: start } 
    });

    const totalPurchasesBefore = purchasesBefore.reduce((a, s) => a + (s.totalAmount || 0), 0);
    const totalPaymentsBefore = paymentsBefore.reduce((a, p) => a + (p.amount || 0), 0);
    const openingBalance = (farmer.oldBalance || 0) + totalPurchasesBefore - totalPaymentsBefore;

    // 2. Get Transactions in range
    const purchasesInRange = await Purchase.find({ farmerId, date: { $gte: start, $lte: end } });
    const paymentsInRange = await Payment.find({ 
      partyId: farmerId, 
      partyType: 'Farmer', 
      type: 'OUT', 
      date: { $gte: start, $lte: end } 
    });

    // Format combined transactions
    const transactions = [
      ...purchasesInRange.map(s => ({
        date: s.date,
        type: 'PURCHASE',
        billNo: s.billNo,
        debit: 0,
        credit: s.totalAmount || 0,
        id: s._id
      })),
      ...paymentsInRange.map(p => ({
        date: p.date,
        type: 'PAYMENT',
        receiptNo: p.receiptNo,
        debit: p.amount || 0,
        credit: 0,
        id: p._id
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      farmer,
      openingBalance,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFarmerVegAbstract = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Date range is required' });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const Purchase = require('../models/Purchase.model');
    
    const abstract = await Purchase.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$farmerId',
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'farmers',
          localField: '_id',
          foreignField: '_id',
          as: 'farmer'
        }
      },
      { $unwind: '$farmer' },
      {
        $lookup: {
          from: 'villages',
          localField: 'farmer.address',
          foreignField: '_id',
          as: 'village'
        }
      },
      { $unwind: { path: '$village', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'villages',
          localField: 'farmer.addressTamil',
          foreignField: '_id',
          as: 'villageTamil'
        }
      },
      { $unwind: { path: '$villageTamil', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          farmerName: '$farmer.name',
          farmerNameTamil: '$farmer.nameTamil',
          villageName: '$village.nameEn',
          villageNameTamil: '$villageTamil.nameTa',
          totalAmount: 1
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(abstract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFarmerVegDetail = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Date range is required' });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const Sale = require('../models/Sale.model');
    const Farmer = require('../models/Farmer.model');
    
    // We get all sales that have a farmerId and fall within the range
    const sales = await Sale.find({ 
      farmerId: { $exists: true, $ne: null },
      date: { $gte: start, $lte: end }
    })
    .populate('farmerId vendorId')
    .populate({
      path: 'items.vegetableId',
      select: 'name nameTamil'
    })
    .populate({
      path: 'farmerId',
      populate: { path: 'address addressTamil' }
    })
    .populate({
      path: 'vendorId',
      populate: { path: 'address addressTamil' }
    })
    .sort({ farmerId: 1, date: 1 });

    // Group by farmer
    const grouped = sales.reduce((acc, sale) => {
      const fId = sale.farmerId._id.toString();
      if (!acc[fId]) {
        acc[fId] = {
          farmer: sale.farmerId,
          sales: []
        };
      }
      
      sale.items.forEach(item => {
        acc[fId].sales.push({
          date: sale.date,
          vegetable: item.vegetableId,
          count: item.count,
          weight: item.quantity,
          rate: item.rate,
          amount: item.totalAmount,
          buyer: sale.vendorId
        });
      });
      
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
