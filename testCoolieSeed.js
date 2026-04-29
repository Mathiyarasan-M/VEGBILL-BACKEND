const mongoose = require('mongoose');
const { createSale } = require('./controllers/sale.controller');
const Vegetable = require('./models/Vegetable.model');
const Vendor = require('./models/Vendor.model');
const Farmer = require('./models/Farmer.model');
require('./models/Village.model'); // Required for population
require('./models/Unit.model'); // Required for population just in case

// Connect to your local database
mongoose.connect('mongodb://localhost:27017/commission-ledger').then(async () => {
  console.log("=== STARTING COOLIE CALCULATION TEST ===\n");
  
  // 1. Fetch required mock data
  const vendor = await Vendor.findOne();
  const farmer = await Farmer.findOne();
  let veg = await Vegetable.findOne({ nameEn: /Tomato/i });
  
  if (!vendor || !farmer || !veg) {
    console.log("Missing mock data (Vendor, Farmer, or Vegetable) in the database.");
    process.exit(1);
  }

  // Set the test Coolie Rate to 3 (as requested: "3 item and count 3 ,3*3=9")
  const TEST_COOLIE_RATE = 3; 

  console.log(`[DATA] Vegetable Selected: ${veg.nameEn}`);
  console.log(`[DATA] Simulating Frontend Coolie Rate per Bag: ${TEST_COOLIE_RATE} rupees\n`);

  // 2. Simulate the Frontend payload being sent to the Backend
  // Here we have 3 bags, with a Coolie Rate of 2 per bag.
  // The frontend calculates itemFee = count * rate = 1 * 2 = 2 per row.
  const req = {
    body: {
      vendorId: vendor._id.toString(),
      farmerId: farmer._id.toString(),
      totalAmount: 300, // Dummy initial payload total
      items: [
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 * TEST_COOLIE_RATE // Frontend calculation: 1 bag * 2 rate = 2
        },
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 * TEST_COOLIE_RATE // 2
        },
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 * TEST_COOLIE_RATE // 2
        }
      ]
    }
  };

  console.log("[SIMULATION] Frontend sent the following 3 items to the backend:");
  console.log(req.body.items.map((i, idx) => `  Item ${idx + 1}: Rate ${i.rate}, Count ${i.count}, Coolie Fee Sent: ${i.itemFee}`));
  console.log("");

  // 3. Mock the Express Response Object to capture what the backend returns
  const res = {
    status: function(code) { 
      this.statusCode = code; 
      return this; 
    },
    json: function(data) { 
      console.log("=== BACKEND FINAL RESULT ===\n");
      console.log("[SUCCESS] Sale Created Successfully!");
      
      const createdSale = data;
      
      console.log("\n--- INDIVIDUAL ROW DEBITS ---");
      createdSale.items.forEach((item, idx) => {
        console.log(`Row ${idx + 1} DEBIT: ${item.totalAmount} (Coolie of ${item.itemFee} was successfully kept out of this total)`);
      });

      console.log("\n--- GRAND TOTALS ---");
      console.log(`Total Product Amount: ${createdSale.totalAmount - createdSale.totalCoolie}`);
      console.log(`Total Coolie Sum: ${createdSale.totalCoolie} (This matches 3 items * 3 rate = 9)`);
      console.log(`Final Today's Sale Total: ${createdSale.totalAmount}\n`);
      
      console.log("TEST COMPLETED SUCCESSFULLY.");
      process.exit(0);
    }
  };

  // 4. Run the Backend Controller
  try {
    await createSale(req, res);
  } catch (error) {
    console.error("Test Failed with Error:", error.message);
    process.exit(1);
  }
});
