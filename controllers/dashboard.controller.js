const Purchase = require('../models/Purchase.model');
const Sale = require('../models/Sale.model');
const Vendor = require('../models/Vendor.model');
const Farmer = require('../models/Farmer.model');
const Vegetable = require('../models/Vegetable.model');

exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateFilter = {
      date: {
        $gte: today,
        $lt: tomorrow
      }
    };

    // Get today's purchases
    const purchases = await Purchase.find(dateFilter);
    const sales = await Sale.find(dateFilter);

    const totalPurchaseAmt = purchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalSalesAmt = sales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    
    // Calculate commission KG
    let totalCommissionQty = 0;
    purchases.forEach(p => {
      if (p.items && p.items.length > 0) {
        p.items.forEach(item => {
          totalCommissionQty += (item.commissionQty || 0);
        });
      } else if (p.commissionQty) {
        totalCommissionQty += p.commissionQty;
      }
    });

    // Average selling price for commission profit estimation
    let totalSaleRate = 0;
    let saleItemCount = 0;
    sales.forEach(s => {
      if (s.items && s.items.length > 0) {
        s.items.forEach(item => {
          totalSaleRate += (item.rate || 0);
          saleItemCount++;
        });
      } else if (s.rate) {
        totalSaleRate += s.rate;
        saleItemCount++;
      }
    });

    const avgSellingPrice = saleItemCount > 0 ? totalSaleRate / saleItemCount : 0;
    const commissionProfit = totalCommissionQty * avgSellingPrice;
    const tradingProfit = totalSalesAmt - totalPurchaseAmt;
    const totalProfit = tradingProfit + commissionProfit;

    // Entity counts
    const vendorCount = await Vendor.countDocuments();
    const farmerCount = await Farmer.countDocuments();
    const vegetableCount = await Vegetable.countDocuments();

    res.json({
      todayStats: {
        purchaseAmount: totalPurchaseAmt,
        salesAmount: totalSalesAmt,
        commissionQty: totalCommissionQty,
        totalProfit: totalProfit,
        tradingProfit: tradingProfit,
        commissionProfit: commissionProfit,
        purchaseCount: purchases.length,
        salesCount: sales.length
      },
      counts: {
        vendors: vendorCount,
        farmers: farmerCount,
        vegetables: vegetableCount
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: error.message });
  }
};
