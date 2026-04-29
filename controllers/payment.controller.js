const Payment = require('../models/Payment.model');
const Sale = require('../models/Sale.model');
const Purchase = require('../models/Purchase.model');

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({}).sort({ date: -1 }).lean();
    
    // Deep populate bill information
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      if (payment.billId && payment.billType === 'Purchase') {
        const purchase = await Purchase.findById(payment.billId)
          .populate('farmerId items.vegetableId')
          .populate({
            path: 'sourceSaleId',
            populate: { path: 'vendorId' }
          })
          .lean();
        
        return { ...payment, billInfo: purchase };
      }
      return payment;
    }));

    res.json(enrichedPayments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    
    // Auto-update bill status if linked
    if (payment.billId && payment.billType) {
      if (payment.billType === 'Sale') {
        await Sale.findByIdAndUpdate(payment.billId, { paymentStatus: 'Paid' });
      } else if (payment.billType === 'Purchase') {
        await Purchase.findByIdAndUpdate(payment.billId, { paymentStatus: 'Paid' });
      }
    }

    // Enrich response with deep details for the frontend
    let enrichedPayment = payment.toObject();
    if (payment.billId && payment.billType === 'Purchase') {
      const bInfo = await Purchase.findById(payment.billId)
        .populate('farmerId items.vegetableId')
        .populate({
          path: 'sourceSaleId',
          populate: { path: 'vendorId' }
        })
        .lean();
      enrichedPayment.billInfo = bInfo;
    }

    res.status(201).json(enrichedPayment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
