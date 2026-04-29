const Counter = require('../models/Counter.model');
const Farmer = require('../models/Farmer.model');
const Vendor = require('../models/Vendor.model');
const Sale = require('../models/Sale.model');
const Purchase = require('../models/Purchase.model');
const Payment = require('../models/Payment.model');
const Expense = require('../models/Expense.model');

exports.getNextCode = async (req, res) => {
  try {
    const { id } = req.params;
    let seq = 1;

    // Helper to extract number from code like "F0001" or "SAL-000001"
    const extractNum = (str, prefix) => {
      if (!str) return 0;
      const numPart = str.replace(prefix, '');
      return parseInt(numPart) || 0;
    };

    switch(id) {
      case 'farmerCode': {
        const last = await Farmer.findOne().sort({ farmerCode: -1 });
        seq = last ? extractNum(last.farmerCode, 'F') + 1 : 1;
        break;
      }
      case 'vendorCode': {
        const last = await Vendor.findOne().sort({ vendorCode: -1 });
        seq = last ? extractNum(last.vendorCode, 'V') + 1 : 1;
        break;
      }
      case 'purchaseBillNo': {
        const count = await Purchase.countDocuments();
        if (count === 0) {
          seq = 1;
          await Counter.findOneAndUpdate({ id }, { seq: 0 }, { upsert: true });
        } else {
          const counter = await Counter.findOne({ id });
          seq = counter ? counter.seq + 1 : count + 1;
        }
        break;
      }
      case 'saleBillNo': {
        const count = await Sale.countDocuments();
        if (count === 0) {
          seq = 1;
          await Counter.findOneAndUpdate({ id }, { seq: 0 }, { upsert: true });
        } else {
          const counter = await Counter.findOne({ id });
          seq = counter ? counter.seq + 1 : count + 1;
        }
        break;
      }
      case 'paymentInSeq': {
        const count = await Payment.countDocuments({ type: 'IN' });
        if (count === 0) {
          seq = 1;
          await Counter.findOneAndUpdate({ id }, { seq: 0 }, { upsert: true });
        } else {
          const counter = await Counter.findOne({ id });
          seq = counter ? counter.seq + 1 : count + 1;
        }
        break;
      }
      case 'paymentOutSeq': {
        const count = await Payment.countDocuments({ type: 'OUT' });
        if (count === 0) {
          seq = 1;
          await Counter.findOneAndUpdate({ id }, { seq: 0 }, { upsert: true });
        } else {
          const counter = await Counter.findOne({ id });
          seq = counter ? counter.seq + 1 : count + 1;
        }
        break;
      }
      case 'expenseReceiptNo': {
        const count = await Expense.countDocuments();
        if (count === 0) {
          seq = 1;
          await Counter.findOneAndUpdate({ id }, { seq: 0 }, { upsert: true });
        } else {
          const counter = await Counter.findOne({ id });
          seq = counter ? counter.seq + 1 : count + 1;
        }
        break;
      }
      case 'vegetableCode': {
        const Vegetable = require('../models/Vegetable.model');
        const last = await Vegetable.findOne().sort({ vegetableCode: -1 });
        seq = last ? extractNum(last.vegetableCode, 'VG-') + 1 : 1;
        break;
      }
      default: {
        const counter = await Counter.findOne({ id });
        seq = counter ? counter.seq + 1 : 1;
      }
    }
    
    let nextCode = '';
    switch(id) {
      case 'farmerCode':
        nextCode = `F${seq.toString().padStart(4, '0')}`;
        break;
      case 'vendorCode':
        nextCode = `V${seq.toString().padStart(4, '0')}`;
        break;
      case 'purchaseBillNo':
        nextCode = `PUR-${seq.toString().padStart(6, '0')}`;
        break;
      case 'saleBillNo':
        nextCode = `SAL-${seq.toString().padStart(6, '0')}`;
        break;
      case 'paymentInSeq':
        nextCode = `RCV-${seq.toString().padStart(6, '0')}`;
        break;
      case 'paymentOutSeq':
        nextCode = `PAY-${seq.toString().padStart(6, '0')}`;
        break;
      case 'expenseReceiptNo':
        nextCode = `EXP-${seq.toString().padStart(6, '0')}`;
        break;
      case 'vegetableCode':
        nextCode = `VG-${seq.toString().padStart(3, '0')}`;
        break;
      default:
        nextCode = seq.toString();
    }

    res.json({ nextCode });
  } catch (error) {
    console.error('GetNextCode Error:', error);
    res.status(500).json({ message: error.message });
  }
};
