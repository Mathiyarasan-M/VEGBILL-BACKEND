const mongoose = require('mongoose');
const Payment = require('./models/Payment.model');
const Farmer = require('./models/Farmer.model');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  try {
    const farmer = await Farmer.findOne({});
    if (!farmer) {
      console.log('No farmer found to test');
      return;
    }
    
    console.log('Testing with Farmer:', farmer.name, 'ID:', farmer._id);

    const payload = {
        "partyId": farmer._id,
        "partyType": "Farmer",
        "amount": 500,
        "type": "OUT",
        "paymentMethod": "Cash",
        "note": "Test Advance",
        "isAdvance": true,
        "entryType": "Advance"
    };
    
    console.log('Creating advance payment...');
    const payment = await Payment.create(payload);
    console.log('Payment created:', payment.receiptNo);
    
    // Simulate controller logic for Farmer Advance
    if (payment.isAdvance && payment.partyType === 'Farmer') {
      console.log('Updating farmer advance amount...');
      await Farmer.findByIdAndUpdate(payment.partyId, { $inc: { advanceAmount: payment.amount } });
      console.log('Farmer advance amount updated');
    }
    
    // Check updated farmer
    const updatedFarmer = await Farmer.findById(farmer._id);
    console.log('New Advance Balance:', updatedFarmer.advanceAmount);
    
    await Payment.findByIdAndDelete(payment._id);
    // Revert balance
    await Farmer.findByIdAndUpdate(farmer._id, { $inc: { advanceAmount: -payment.amount } });
    console.log('Cleaned up');
    
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
