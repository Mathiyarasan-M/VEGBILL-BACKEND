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
    const payment = await Payment.create(req.body);
    
    // Auto-update bill status and farmer balances if a specific bill is linked
    if (payment.billId && payment.billType) {
      if (payment.billType === 'Sale') {
        const sale = await Sale.findById(payment.billId);
        if (sale) {
          sale.paymentStatus = 'Paid';
          await sale.save();

          // Deduct settled amounts from vendor if not already handled by billInfo logic
          if (!payment.billInfo?.oldBalanceSettled && !payment.billInfo?.coolieSettled) {
             await Vendor.findByIdAndUpdate(payment.partyId, {
               $inc: { 
                 oldBalance: -(sale.oldBalanceAtBill || 0)
                 // Coolie is typically included in the bill amount, so we don't deduct it from vendor balance separately unless it's a debt
               }
             });
          }
        }
      } else if (payment.billType === 'Purchase') {
        const purchase = await Purchase.findById(payment.billId);
        if (purchase) {
          // Mark purchase as paid
          purchase.paymentStatus = 'Paid';
          await purchase.save();

          // Deduct the snapshotted balances from the farmer if they haven't been cleared already
          // (Only if not already handled by billInfo deduction logic to avoid double-counting)
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
    }

    // Update farmer advance amount if it's an advance
    if (payment.isAdvance && payment.partyType === 'Farmer') {
      await Farmer.findByIdAndUpdate(payment.partyId, { $inc: { advanceAmount: payment.amount } });
    }

    // Clear settled balances if this is a settlement
    if (payment.billInfo && payment.partyType === 'Farmer') {
      const { oldBalanceSettled, advanceSettled, settledPurchaseIds } = payment.billInfo;
      
      // Update purchase bills status
      if (settledPurchaseIds && Array.isArray(settledPurchaseIds)) {
        await Purchase.updateMany(
          { _id: { $in: settledPurchaseIds } },
          { 
            paymentStatus: 'Paid',
            // Backfill snapshots if they are missing
            $set: {
              advanceAtBill: advanceSettled || 0,
              oldBalanceAtBill: oldBalanceSettled || 0
            }
          }
        );
      }

      if (oldBalanceSettled || advanceSettled) {
        await Farmer.findByIdAndUpdate(payment.partyId, {
          $inc: { 
            oldBalance: -(oldBalanceSettled || 0),
            advanceAmount: -(advanceSettled || 0)
          }
        });
      }
    }

    // Handle Vendor Settlement
    if (payment.billInfo && payment.partyType === 'Vendor') {
      const { oldBalanceSettled, settledSaleIds, totalAmount: billTotal } = payment.billInfo;
      
      // Calculate remaining debt: (Total Bills + Old Balance) - Amount Paid
      const totalDue = (billTotal || 0) + (oldBalanceSettled || 0);
      const remainingDebt = totalDue - payment.amount;

      if (settledSaleIds && Array.isArray(settledSaleIds)) {
        await Sale.updateMany(
          { _id: { $in: settledSaleIds } },
          { 
            paymentStatus: 'Paid',
            $set: { oldBalanceAtBill: oldBalanceSettled || 0 }
          }
        );
      }

      // Update vendor balance to exactly the remaining debt
      await Vendor.findByIdAndUpdate(payment.partyId, {
        $set: { oldBalance: remainingDebt }
      });
    }

    // Enrich response with deep details for the frontend
    let enrichedPayment = payment.toObject();
    if (payment.billId) {
      if (payment.billType === 'Purchase') {
        const bInfo = await Purchase.findById(payment.billId)
          .populate('farmerId items.vegetableId')
          .populate({
            path: 'sourceSaleId',
            populate: { path: 'vendorId' }
          })
          .lean();
        enrichedPayment.billInfo = bInfo;
      } else if (payment.billType === 'Sale') {
        const bInfo = await Sale.findById(payment.billId)
          .populate('vendorId farmerId items.vegetableId')
          .lean();
        enrichedPayment.billInfo = bInfo;
      }
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
    }

    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payment removed and balances restored' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
