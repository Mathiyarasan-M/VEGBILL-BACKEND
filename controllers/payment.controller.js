const mongoose = require('mongoose');
const Payment = require('../models/Payment.model');
const Sale = require('../models/Sale.model');
const Purchase = require('../models/Purchase.model');
const Farmer = require('../models/Farmer.model');
const Vendor = require('../models/Vendor.model');

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
      } else if (payment.billId && payment.billType === 'Sale') {
        const sale = await Sale.findById(payment.billId)
          .populate('vendorId farmerId items.vegetableId')
          .lean();
        
        return { ...payment, billInfo: sale };
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
    // Validate partyId
    if (!mongoose.Types.ObjectId.isValid(req.body.partyId)) {
      return res.status(400).json({ message: 'Invalid partyId' });
    }

    const payment = await Payment.create(req.body);
    
    // Auto-update bill status and balances if a specific bill is linked
    if (payment.billId && payment.billType) {
      try {
        if (payment.billType === 'Sale') {
          const sale = await Sale.findById(payment.billId);
          if (sale) {
            sale.paymentStatus = 'Paid';
            await sale.save();

            if (!payment.billInfo?.oldBalanceSettled && !payment.billInfo?.coolieSettled) {
               await Vendor.findByIdAndUpdate(payment.partyId, {
                 $inc: { oldBalance: -(sale.oldBalanceAtBill || 0) }
               });
            }
          }
        } else if (payment.billType === 'Purchase') {
          const purchase = await Purchase.findById(payment.billId);
          if (purchase) {
            purchase.paymentStatus = 'Paid';
            await purchase.save();

            if (!payment.billInfo?.oldBalanceSettled && !payment.billInfo?.advanceSettled) {
               await Farmer.findByIdAndUpdate(payment.partyId, {
                 $inc: { 
                   oldBalance: -(purchase.oldBalanceAtBill || 0),
                   advanceAmount: -(purchase.advanceAtBill || 0)
                 }
               });
            }
          }
        }
      } catch (err) {
        console.error('Error in bill-linked balance update:', err);
      }
    }

    // Update farmer advance amount if it's an advance
    if (payment.isAdvance && payment.partyType === 'Farmer') {
      await Farmer.findByIdAndUpdate(payment.partyId, { $inc: { advanceAmount: payment.amount } }).catch(e => console.error('Farmer advance update failed:', e));
    }

    // Clear settled balances if this is a settlement (Farmer)
    if (payment.billInfo && payment.partyType === 'Farmer') {
      const { oldBalanceSettled, advanceSettled, settledPurchaseIds } = payment.billInfo;
      
      try {
        if (settledPurchaseIds && Array.isArray(settledPurchaseIds)) {
          const validIds = settledPurchaseIds.filter(id => mongoose.Types.ObjectId.isValid(id));
          if (validIds.length > 0) {
            await Purchase.updateMany(
              { _id: { $in: validIds } },
              { 
                paymentStatus: 'Paid',
                $set: {
                  advanceAtBill: advanceSettled || 0,
                  oldBalanceAtBill: oldBalanceSettled || 0
                }
              }
            );
          }
        }

        if (oldBalanceSettled || advanceSettled) {
          await Farmer.findByIdAndUpdate(payment.partyId, {
            $inc: { 
              oldBalance: -(oldBalanceSettled || 0),
              advanceAmount: -(advanceSettled || 0)
            }
          });
        }
      } catch (err) {
        console.error('Farmer settlement update failed:', err);
      }
    }

    // Handle Vendor Settlement
    if (payment.billInfo && payment.partyType === 'Vendor') {
      const { oldBalanceSettled, settledSaleIds, totalAmount: billTotal } = payment.billInfo;
      
      try {
        const totalDue = (Number(billTotal) || 0) + (Number(oldBalanceSettled) || 0);
        const remainingDebt = totalDue - Number(payment.amount);

        if (settledSaleIds && Array.isArray(settledSaleIds)) {
          const validIds = settledSaleIds.filter(id => mongoose.Types.ObjectId.isValid(id));
          if (validIds.length > 0) {
            await Sale.updateMany(
              { _id: { $in: validIds } },
              { 
                paymentStatus: 'Paid',
                $set: { oldBalanceAtBill: Number(oldBalanceSettled) || 0 }
              }
            );
          }
        }

        await Vendor.findByIdAndUpdate(payment.partyId, {
          $set: { oldBalance: remainingDebt }
        });
      } catch (err) {
        console.error('Vendor settlement update failed:', err);
      }
    } else if (payment.partyType === 'Vendor' && payment.type === 'IN' && !payment.billId) {
      // Handle General Payment In or Return Commission for Vendor without specific bill settlement
      await Vendor.findByIdAndUpdate(payment.partyId, {
        $inc: { oldBalance: -Number(payment.amount) }
      }).catch(e => console.error('General vendor balance update failed:', e));
    }

    // Enrich response
    let enrichedPayment = payment.toObject();
    try {
      if (payment.billId && mongoose.Types.ObjectId.isValid(payment.billId)) {
        if (payment.billType === 'Purchase') {
          enrichedPayment.billInfo = await Purchase.findById(payment.billId)
            .populate('farmerId items.vegetableId')
            .populate({ path: 'sourceSaleId', populate: { path: 'vendorId' } })
            .lean();
        } else if (payment.billType === 'Sale') {
          enrichedPayment.billInfo = await Sale.findById(payment.billId)
            .populate('vendorId farmerId items.vegetableId')
            .lean();
        }
      }
    } catch (err) {
      console.error('Enrichment failed:', err);
    }

    res.status(201).json(enrichedPayment);
  } catch (error) {
    console.error('CRITICAL PAYMENT ERROR:', error);
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
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Revert Farmer Advance if it was a direct advance payment
    if (payment.isAdvance && payment.partyType === 'Farmer') {
      await Farmer.findByIdAndUpdate(payment.partyId, { $inc: { advanceAmount: -payment.amount } });
    }

    // Revert Settlement deductions and bill statuses
    if (payment.billInfo && payment.partyType === 'Farmer') {
      const { oldBalanceSettled, advanceSettled, settledPurchaseIds } = payment.billInfo;
      
      // Mark bills as pending again
      if (settledPurchaseIds && Array.isArray(settledPurchaseIds)) {
        await Purchase.updateMany(
          { _id: { $in: settledPurchaseIds } },
          { paymentStatus: 'Pending' }
        );
      }

      // Restore farmer balances
      if (oldBalanceSettled || advanceSettled) {
        await Farmer.findByIdAndUpdate(payment.partyId, {
          $inc: { 
            oldBalance: (oldBalanceSettled || 0),
            advanceAmount: (advanceSettled || 0)
          }
        });
      }
    }

    // Revert Vendor Settlement
    if (payment.billInfo && payment.partyType === 'Vendor') {
      const { oldBalanceSettled, settledSaleIds } = payment.billInfo;
      
      if (settledSaleIds && Array.isArray(settledSaleIds)) {
        await Sale.updateMany(
          { _id: { $in: settledSaleIds } },
          { paymentStatus: 'Pending' }
        );
      }

      if (oldBalanceSettled) {
        await Vendor.findByIdAndUpdate(payment.partyId, {
          $inc: { oldBalance: (oldBalanceSettled || 0) }
        });
      }
    } else if (payment.partyType === 'Vendor' && payment.type === 'IN' && !payment.billId) {
      // Revert General Payment In or Return Commission for Vendor
      await Vendor.findByIdAndUpdate(payment.partyId, {
        $inc: { oldBalance: payment.amount }
      });
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment removed and balances restored' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getReturnCommissionReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { entryType: 'Return Commission' };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const report = await Payment.find(query)
      .populate({
        path: 'partyId',
        populate: { path: 'address addressTamil' }
      })
      .sort({ date: 1, createdAt: 1 });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
