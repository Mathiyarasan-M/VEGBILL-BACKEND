const Sale = require('../models/Sale.model');
const Purchase = require('../models/Purchase.model');
const Vendor = require('../models/Vendor.model');
const Farmer = require('../models/Farmer.model');
const Vegetable = require('../models/Vegetable.model');
require('../models/Village.model'); // Required for population
require('../models/Unit.model');    // Required for population

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find({}).populate({
      path: 'vendorId',
      populate: { path: 'address' }
    }).populate({
      path: 'farmerId',
      populate: { path: 'address' }
    }).populate('items.vegetableId').sort({ createdAt: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const { vendorId, farmerId, items, totalAmount: clientTotal } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    const uniqueVegetableIds = new Set(items.map(item => {
      const id = (item.vegetableId && typeof item.vegetableId === 'object') 
        ? item.vegetableId._id 
        : item.vegetableId;
      return id?.toString();
    }).filter(Boolean));
    const totalRows = uniqueVegetableIds.size;
    let calculatedProductTotal = 0;
    let totalCoolie = 0;
    
    const processedItems = await Promise.all(items.map(async (item) => {
      // Handle vegetableId being a string or an object
      const vId = (item.vegetableId && typeof item.vegetableId === 'object') 
        ? item.vegetableId._id 
        : item.vegetableId;
        
      const veg = await Vegetable.findById(vId);
      const coolieRate = veg ? (veg.commission || 0) : 0;

      const count = Number(item.count) || 0;
      const rate = Number(item.rate) || 0;
      const quantity = Number(item.quantity) || 0;

      // For calculation, use quantity if > 0, otherwise use count
      const calcQty = (quantity > 0) ? quantity : count;
      const productAmount = calcQty * rate;
      
      // THE LOGIC: (Total Rows in bill) * (This item's bags) * (Coolie Rate)
      const coolieAmount = totalRows * count * coolieRate;

      calculatedProductTotal += productAmount;
      totalCoolie += coolieAmount;

      return {
        ...item,
        vegetableId: vId,
        count,
        quantity,   // Keep original quantity (will be 0 if not sent)
        rate,
        coolieRate,
        coolieAmount,
        itemFee: coolieAmount,
        totalAmount: productAmount   // per item total (without coolie)
      };
    }));

    const grandTotal = calculatedProductTotal + totalCoolie;

    const saleData = {
      ...req.body,
      items: processedItems,
      totalAmount: grandTotal,      // Final amount vendor pays
      totalCoolie: totalCoolie      // Important: Save total coolie separately
    };

    const sale = await Sale.create(saleData);

    // ====================== Vendor Balance Update ======================
    if (vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { 
        $inc: { debit: grandTotal } 
      });
    }

    // ====================== Farmer Payout & Purchase Splitting ======================
    if (farmerId && processedItems.length > 0) {
      let totalFarmerPayout = 0;

      for (const saleItem of processedItems) {
        let remainingQty = saleItem.quantity || 0;
        let remainingCount = saleItem.count || 0;

        const vId = saleItem.vegetableId;

        const purchases = await Purchase.find({
          farmerId,
          'items.vegetableId': vId,
          'items.rate': 0
        }).sort({ createdAt: 1 });

        for (const purchase of purchases) {
          if (remainingQty <= 0 && remainingCount <= 0) break;

          let modified = false;

          for (let i = 0; i < purchase.items.length; i++) {
            const pItem = purchase.items[i];
            if (pItem.vegetableId.toString() !== vId.toString() || pItem.rate !== 0) continue;

            const pQty = pItem.payableWeight || pItem.grossWeight || 0;
            const pCount = pItem.count || 0;
            const isCountBased = pCount > 0 && pQty <= 0;

            const actualRate = saleItem.rate;
            const farmerRate = actualRate * 0.90; // 10% commission

            const shouldSplit = isCountBased 
              ? (remainingCount < pCount) 
              : (remainingQty < pQty);

            if (shouldSplit) {
              // Split logic
              const unpricedPart = {
                vegetableId: pItem.vegetableId,
                grossWeight: isCountBased ? 0 : (pQty - remainingQty),
                payableWeight: isCountBased ? 0 : (pQty - remainingQty),
                count: isCountBased ? (pCount - remainingCount) : pCount,
                rate: 0,
                totalAmount: 0
              };

              pItem.grossWeight = isCountBased ? 0 : remainingQty;
              pItem.payableWeight = isCountBased ? 0 : remainingQty;
              pItem.count = isCountBased ? remainingCount : pCount;
              pItem.actualRate = actualRate;
              pItem.actualAmount = (isCountBased ? remainingCount : remainingQty) * actualRate;
              pItem.rate = farmerRate;
              pItem.totalAmount = (isCountBased ? remainingCount : remainingQty) * farmerRate;

              totalFarmerPayout += pItem.totalAmount;

              purchase.items.splice(i + 1, 0, unpricedPart);
              remainingQty = 0;
              remainingCount = 0;
            } else {
              // Consume full item
              pItem.actualRate = actualRate;
              pItem.actualAmount = (isCountBased ? pCount : pQty) * actualRate;
              pItem.rate = farmerRate;
              pItem.totalAmount = (isCountBased ? pCount : pQty) * farmerRate;

              totalFarmerPayout += pItem.totalAmount;

              remainingQty -= pQty;
              remainingCount -= pCount;
            }

            modified = true;
            if (remainingQty <= 0 && remainingCount <= 0) break;
          }

          if (modified) {
            purchase.totalAmount = purchase.items.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
            purchase.sourceSaleId = sale._id;
            await purchase.save();
          }
        }
      }

      if (totalFarmerPayout > 0) {
        await Farmer.findByIdAndUpdate(farmerId, { 
          $inc: { credit: totalFarmerPayout } 
        });
      }
    }

    // Return populated sale
    const populatedSale = await Sale.findById(sale._id)
      .populate({
        path: 'vendorId',
        populate: { path: 'address' }
      })
      .populate({
        path: 'farmerId',
        populate: { path: 'address' }
      })
      .populate('items.vegetableId');

    res.status(201).json(populatedSale);

  } catch (error) {
    console.error("Sale creation error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateSale = async (req, res) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate({
      path: 'vendorId',
      populate: { path: 'address' }
    }).populate({
      path: 'farmerId',
      populate: { path: 'address' }
    }).populate('items.vegetableId');
    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sale removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
