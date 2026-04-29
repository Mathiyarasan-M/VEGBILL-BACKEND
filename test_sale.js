const mongoose = require('mongoose');
const { createSale } = require('./controllers/sale.controller');
const Vegetable = require('./models/Vegetable.model');
const Vendor = require('./models/Vendor.model');

mongoose.connect('mongodb://localhost:27017/commission-ledger').then(async () => {
  // Let's create a mock req and res
  const vendor = await Vendor.findOne();
  const veg = await Vegetable.findOne({ nameEn: /Tomato/i });
  
  if (!vendor || !veg) {
    console.log("Missing vendor or vegetable");
    process.exit(1);
  }

  const req = {
    body: {
      vendorId: vendor._id.toString(),
      items: [
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 // Simulated from frontend
        },
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 // Simulated from frontend
        },
        {
          vegetableId: veg._id.toString(),
          quantity: 0,
          count: 1,
          rate: 100,
          itemFee: 1 // Simulated from frontend
        }
      ],
      totalAmount: 303
    }
  };

  const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { console.log('Response:', JSON.stringify(data, null, 2)); }
  };

  await createSale(req, res);
  process.exit(0);
});
