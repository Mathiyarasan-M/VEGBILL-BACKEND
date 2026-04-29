const mongoose = require('mongoose');
const Vegetable = require('./models/Vegetable.model.js');

mongoose.connect('mongodb://localhost:27017/commission-ledger').then(async () => {
  console.log("=== COOLIE CALCULATION TEST ===");
  
  // Find a vegetable
  const veg = await Vegetable.findOne({ nameEn: /Tomato/i });
  if (!veg) {
    console.log("Vegetable not found!");
    process.exit(1);
  }
  
  console.log("Vegetable Found:", veg.nameEn);
  console.log("Commission Rate in DB:", veg.commission);

  // Simulate frontend sending items
  const itemsFromFrontend = [
    { count: 1, rate: 100, itemFee: 1 * veg.commission },
    { count: 1, rate: 100, itemFee: 1 * veg.commission },
    { count: 1, rate: 100, itemFee: 1 * veg.commission }
  ];

  console.log("\nFrontend Request items:", itemsFromFrontend);

  let calculatedTotal = 0;
  let totalCoolie = 0;

  const processedItems = itemsFromFrontend.map(item => {
    // Current Backend Logic
    const coolieAmount = item.itemFee || 0;
    const coolieRate = (item.count > 0) ? (coolieAmount / item.count) : 0;
    const itemFee = coolieAmount; 
    
    const productAmount = item.count * item.rate;
    const itemTotal = productAmount; // "coolie amount only sales not add vegetable"
    
    calculatedTotal += itemTotal;
    totalCoolie += coolieAmount;

    return {
      count: item.count,
      rate: item.rate,
      coolieRate,
      coolieAmount,
      itemTotal
    };
  });

  console.log("\nBackend Processed Items:", processedItems);
  console.log("Total Product Amount (calculatedTotal):", calculatedTotal);
  console.log("Total Coolie (totalCoolie):", totalCoolie);
  console.log("Final Grand Total (totalAmount):", calculatedTotal + totalCoolie);
  
  process.exit(0);
});
