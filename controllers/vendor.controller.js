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

exports.getBuyerLongPending = async (req, res) => {
  try {
    const vendors = await Vendor.find({}).populate('address addressTamil');
    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');

    const result = await Promise.all(vendors.map(async (vendor) => {
      // Calculate current balance
      // Based on the ledger logic: (oldBalance + totalSales - totalPayments)
      const sales = await Sale.find({ vendorId: vendor._id });
      const payments = await Payment.find({ 
        partyId: vendor._id, 
        partyType: 'Vendor', 
        type: 'IN' 
      });

      const totalSales = sales.reduce((a, s) => a + (s.totalAmount || 0), 0);
      const totalPayments = payments.reduce((a, p) => a + (p.amount || 0), 0);
      
      // In this system, it seems debit/credit are also used, but oldBalance is the primary tracker for settlements.
      // Let's use the consistent ledger logic.
      const currentBalance = (vendor.oldBalance || 0) + totalSales - totalPayments;

      // We only care about pending balances (debit)
      // If the screenshot shows negative values, maybe the balance is stored as (Payments - Sales)?
      // But "Long Pending" usually means amount OWE.
      // Let's assume positive means they owe us.
      
      if (currentBalance <= 0) return null;

      // Calculate Age: Days since the oldest sale or the date of the last payment?
      // Usually, it's the date of the oldest unpaid bill.
      // We'll take the oldest sale date as a proxy for the pending age.
      const oldestSale = await Sale.findOne({ vendorId: vendor._id }).sort({ date: 1 });
      let age = 0;
      if (oldestSale) {
        const diffTime = Math.abs(new Date() - new Date(oldestSale.date));
        age = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        vendor,
        openingBalance: currentBalance, // In this report, opening/closing are usually the same point-in-time balance
        closingBalance: currentBalance,
        age: age
      };
    }));

    res.json(result.filter(Boolean).sort((a, b) => b.closingBalance - a.closingBalance));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBuyerExcessReturn = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Start and end dates are required' });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const vendors = await Vendor.find({}).populate('address addressTamil');
    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');

    const result = await Promise.all(vendors.map(async (vendor) => {
      // 1. Opening Balance (before startDate)
      const salesBefore = await Sale.find({ vendorId: vendor._id, date: { $lt: start } });
      const paymentsBefore = await Payment.find({ 
        partyId: vendor._id, 
        partyType: 'Vendor', 
        type: 'IN', 
        date: { $lt: start } 
      });

      const totalSalesBefore = salesBefore.reduce((a, s) => a + (s.totalAmount || 0), 0);
      const totalPaymentsBefore = paymentsBefore.reduce((a, p) => a + (p.amount || 0), 0);
      const openingBalance = (vendor.oldBalance || 0) + totalSalesBefore - totalPaymentsBefore;

      // 2. Transactions in Range
      const salesInRange = await Sale.find({ vendorId: vendor._id, date: { $gte: start, $lte: end } });
      const paymentsInRange = await Payment.find({ 
        partyId: vendor._id, 
        partyType: 'Vendor', 
        type: 'IN', 
        date: { $gte: start, $lte: end },
        entryType: { $ne: 'Return Commission' }
      });
      const returnCommInRange = await Payment.find({ 
        partyId: vendor._id, 
        partyType: 'Vendor', 
        type: 'IN', 
        date: { $gte: start, $lte: end },
        entryType: 'Return Commission'
      });

      const totalActSales = salesInRange.reduce((a, s) => a + (s.totalAmount - (s.totalCoolie || 0)), 0);
      const totalBagComm = salesInRange.reduce((a, s) => a + (s.totalCoolie || 0), 0);
      const totalRecd = paymentsInRange.reduce((a, p) => a + (p.amount || 0), 0);
      const totalReturnComm = returnCommInRange.reduce((a, p) => a + (p.amount || 0), 0);

      // Closing Balance
      const closingBalance = openingBalance + salesInRange.reduce((a, s) => a + (s.totalAmount || 0), 0) - totalRecd - totalReturnComm;

      // 3% Return Logic
      const targetReturn = totalActSales * 0.03;
      const excessReturn = targetReturn - totalReturnComm;

      // Only include if there were any sales or payments or non-zero balances
      if (totalActSales === 0 && totalRecd === 0 && openingBalance === 0 && closingBalance === 0) return null;

      return {
        vendor,
        openingBalance,
        totalActSales,
        totalBagComm,
        totalRecd,
        totalReturnComm,
        closingBalance,
        targetReturn,
        excessReturn
      };
    }));

    res.json(result.filter(Boolean).sort((a, b) => b.totalActSales - a.totalActSales));
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

exports.getBuyerConsumptionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate || '2000-01-01');
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const Vendor = require('../models/Vendor.model');
    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');

    const vendors = await Vendor.find({}).populate('address addressTamil').lean();
    const result = [];

    for (const vendor of vendors) {
      const vendorId = vendor._id;

      // Before Range (for Opening)
      const salesBefore = await Sale.find({ vendorId, date: { $lt: start } }).lean();
      const paymentsBefore = await Payment.find({ 
        partyId: vendorId, partyType: 'Vendor', type: 'IN', date: { $lt: start } 
      }).lean();

      const totalSalesBefore = salesBefore.reduce((a, s) => a + (s.totalAmount || 0), 0);
      const totalPaymentsBefore = paymentsBefore.reduce((a, p) => a + (p.amount || 0), 0);
      
      const openingDebt = (vendor.oldBalance || 0) + totalSalesBefore - totalPaymentsBefore;
      const opening = -openingDebt;

      // In Range
      const salesInRange = await Sale.find({ vendorId, date: { $gte: start, $lte: end } }).lean();
      const paymentsInRange = await Payment.find({ 
        partyId: vendorId, partyType: 'Vendor', type: 'IN', date: { $gte: start, $lte: end } 
      }).lean();

      let actSales = 0;
      let bagComm = 0;
      
      for (const s of salesInRange) {
        let billBagComm = 0;
        if (s.items && Array.isArray(s.items)) {
           billBagComm = s.items.reduce((a, item) => a + (item.itemFee || 0), 0);
        }
        bagComm += billBagComm;
        actSales += ((s.totalAmount || 0) - billBagComm);
      }

      let cashRecd = 0;
      let bankRecd = 0;
      let returnComm = 0;

      for (const p of paymentsInRange) {
        if (p.entryType === 'Return Commission') {
          returnComm += (p.amount || 0);
        } else {
          if (p.paymentMethod === 'Cash') {
            cashRecd += (p.amount || 0);
          } else {
            bankRecd += (p.amount || 0);
          }
        }
      }

      const totalRecd = cashRecd + bankRecd;
      
      const closingDebt = openingDebt + actSales + bagComm - totalRecd - returnComm;
      const closing = -closingDebt;

      if (opening === 0 && actSales === 0 && bagComm === 0 && totalRecd === 0 && returnComm === 0 && closing === 0) {
        continue;
      }

      result.push({
        vendor,
        opening,
        actSales,
        bagComm,
        cashRecd,
        bankRecd,
        totalRecd,
        returnComm,
        closing
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBuyerBalanceAbstract = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate || new Date(new Date().getFullYear(), 3, 1)); // Default Apr 1
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || new Date());
    end.setHours(23, 59, 59, 999);

    const Vendor = require('../models/Vendor.model');
    const Sale = require('../models/Sale.model');
    const Payment = require('../models/Payment.model');
    const Purchase = require('../models/Purchase.model');
    const Expense = require('../models/Expense.model');

    const vendors = await Vendor.find({}).lean();
    
    // Identify vendor types
    const isOwn = (v) => /own consumption|சொந்த/i.test(v.name || '') || /own consumption|சொந்த/i.test(v.nameTamil || '');
    const isWastage = (v) => /wastage|கழிவு/i.test(v.name || '') || /wastage|கழிவு/i.test(v.nameTamil || '');
    const isSeller = (v) => /seller|விற்பனை/i.test(v.name || '') || /seller|விற்பனை/i.test(v.nameTamil || '');
    const isBuyer = (v) => !isOwn(v) && !isWastage(v) && !isSeller(v);

    const buyerVendorIds = vendors.filter(isBuyer).map(v => v._id.toString());
    const ownVendorIds = vendors.filter(isOwn).map(v => v._id.toString());
    const wastageVendorIds = vendors.filter(isWastage).map(v => v._id.toString());
    const sellerVendorIds = vendors.filter(isSeller).map(v => v._id.toString());

    // Generate month keys
    const months = [];
    let curr = new Date(start);
    curr.setDate(1);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = curr.getMonth() + 1;
      const key = `${y}-${m.toString().padStart(2, '0')}`;
      months.push(key);
      curr.setMonth(curr.getMonth() + 1);
    }

    const report = {
      months: months.map(m => {
        const [y, mo] = m.split('-');
        const date = new Date(parseInt(y), parseInt(mo) - 1, 1);
        const en = date.toLocaleString('en-US', { month: 'short' });
        const ta = ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"][parseInt(mo) - 1];
        return { key: m, labelEn: `${en}'${y}`, labelTa: `${ta}'${y}` };
      }),
      data: {}
    };

    // Calculate Overall Opening Balance for Buyers
    let overallOpeningDebt = 0;
    for (const v of vendors.filter(isBuyer)) {
      overallOpeningDebt += (v.oldBalance || 0);
    }
    
    const salesBefore = await Sale.find({ vendorId: { $in: buyerVendorIds }, date: { $lt: start } }).lean();
    const paymentsBefore = await Payment.find({ partyId: { $in: buyerVendorIds }, partyType: 'Vendor', type: 'IN', date: { $lt: start } }).lean();
    
    let totalSalesBefore = 0;
    for (const s of salesBefore) {
      totalSalesBefore += (s.totalAmount || 0);
    }
    
    const totalPaymentsBefore = paymentsBefore.reduce((a, p) => a + (p.amount || 0), 0);
    overallOpeningDebt = overallOpeningDebt + totalSalesBefore - totalPaymentsBefore;

    let currentDebt = overallOpeningDebt;

    // Grouping data by month
    for (const monthKey of months) {
      const [y, mo] = monthKey.split('-');
      const mStart = new Date(parseInt(y), parseInt(mo) - 1, 1);
      const mEnd = new Date(parseInt(y), parseInt(mo), 0, 23, 59, 59, 999);
      
      const realStart = mStart < start ? start : mStart;
      const realEnd = mEnd > end ? end : mEnd;

      const sales = await Sale.find({ date: { $gte: realStart, $lte: realEnd } }).lean();
      const payments = await Payment.find({ partyType: 'Vendor', type: 'IN', date: { $gte: realStart, $lte: realEnd } }).lean();

      let buyerSales = 0;
      let ownConsumption = 0;
      let wastageSales = 0;
      let sellerSales = 0;
      let cashRecd = 0;
      let bankRecd = 0;
      let returnComm = 0;
      let bagCommMonth = 0;

      for (const s of sales) {
        const vid = s.vendorId.toString();
        const bComm = s.items ? s.items.reduce((a, i) => a + (i.itemFee || 0), 0) : 0;
        const total = s.totalAmount || 0;
        
        if (buyerVendorIds.includes(vid)) {
          buyerSales += total;
          bagCommMonth += bComm;
        } else if (ownVendorIds.includes(vid)) {
          ownConsumption += total;
        } else if (wastageVendorIds.includes(vid)) {
          wastageSales += total;
        } else if (sellerVendorIds.includes(vid)) {
          sellerSales += total;
        } else {
          buyerSales += total;
          bagCommMonth += bComm;
        }
      }

      for (const p of payments) {
        const vid = p.partyId.toString();
        if (buyerVendorIds.includes(vid)) {
          if (p.entryType === 'Return Commission') returnComm += (p.amount || 0);
          else if (p.paymentMethod === 'Cash') cashRecd += (p.amount || 0);
          else bankRecd += (p.amount || 0);
        }
      }

      const opening = currentDebt;
      currentDebt = currentDebt + buyerSales - cashRecd - bankRecd - returnComm;
      const closing = currentDebt;

      const purchases = await Purchase.find({ date: { $gte: realStart, $lte: realEnd } }).lean();
      let vegCommIncome = 0;
      for (const pur of purchases) {
        vegCommIncome += (pur.totalCommission || 0);
        const pCoolie = pur.items ? pur.items.reduce((a, i) => a + (i.coolieAmount || 0), 0) : 0;
        bagCommMonth += pCoolie;
      }

      const expenses = await Expense.find({ date: { $gte: realStart, $lte: realEnd } }).populate('category').lean();
      let shopSalary = 0;
      let otherExpense = 0;
      let purchaseRelated = 0;

      for (const ex of expenses) {
        const cName = ex.category ? (ex.category.name || '').toLowerCase() : '';
        const amt = ex.amount || 0;
        if (cName.includes('salary') || cName.includes('சம்பளம்')) shopSalary += amt;
        else if (cName.includes('purchase') || cName.includes('கொள்முதல்')) purchaseRelated += amt;
        else otherExpense += amt;
      }

      report.data[monthKey] = {
        openingBalance: opening,
        buyerSales,
        ownConsumption,
        wastageSales,
        sellerSales,
        cashRecd,
        bankRecd,
        returnComm,
        closingBalance: closing,
        vegCommIncome,
        returnCommExpense: returnComm,
        bagComm: bagCommMonth,
        otherIncome: 0,
        shopSalary,
        otherExpense,
        purchaseRelated
      };
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};