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
exports.getVendorLedger = async (req, res) => {
  try {
    const { vendorId, startDate, endDate } = req.query;
    if (!vendorId) return res.status(400).json({ message: 'Vendor ID is required' });

    const vendor = await Vendor.findById(vendorId).populate('address addressTamil');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const start = new Date(startDate || '2000-01-01');
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');

    // 1. Get Opening Balance (records before startDate)
    const salesBefore = await Sale.find({ vendorId, date: { $lt: start } });
    const paymentsBefore = await Payment.find({ 
      partyId: vendorId, 
      partyType: 'Vendor', 
      type: 'IN', 
      date: { $lt: start } 
    });

    const totalSalesBefore = salesBefore.reduce((a, s) => a + (s.totalAmount || 0), 0);
    const totalPaymentsBefore = paymentsBefore.reduce((a, p) => a + (p.amount || 0), 0);
    const openingBalance = (vendor.oldBalance || 0) + totalSalesBefore - totalPaymentsBefore;

    // 2. Get Transactions in range
    const salesInRange = await Sale.find({ vendorId, date: { $gte: start, $lte: end } });
    const paymentsInRange = await Payment.find({ 
      partyId: vendorId, 
      partyType: 'Vendor', 
      type: 'IN', 
      date: { $gte: start, $lte: end } 
    });

    // Format combined transactions
    const transactions = [
      ...salesInRange.map(s => ({
        date: s.date,
        type: 'SALE',
        billNo: s.billNo,
        debit: s.totalAmount || 0,
        credit: 0,
        id: s._id
      })),
      ...paymentsInRange.map(p => ({
        date: p.date,
        type: 'PAYMENT',
        receiptNo: p.receiptNo,
        debit: 0,
        credit: p.amount || 0,
        id: p._id
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      vendor,
      openingBalance,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOutstanding = async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const end = new Date(asOfDate || new Date());
    end.setHours(23, 59, 59, 999);

    const vendors = await Vendor.find();
    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');

    const sales = await Sale.find({ date: { $lte: end } }).select('vendorId totalAmount');
    const payments = await Payment.find({ partyType: 'Vendor', type: 'IN', date: { $lte: end } }).select('partyId amount');

    const outstandingList = vendors.map(v => {
      const vSales = sales.filter(s => s.vendorId && s.vendorId.toString() === v._id.toString());
      const vPayments = payments.filter(p => p.partyId && p.partyId.toString() === v._id.toString());
      
      const totalSales = vSales.reduce((a, s) => a + (s.totalAmount || 0), 0);
      const totalPayments = vPayments.reduce((a, p) => a + (p.amount || 0), 0);
      
      const balance = (v.oldBalance || 0) + totalSales - totalPayments;
      return { vendor: v, balance };
    });

    res.json(outstandingList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
