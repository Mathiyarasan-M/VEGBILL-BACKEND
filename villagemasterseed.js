const mongoose = require('mongoose');
const fs = require('fs');
const Village = require('./models/Village.model');

const MONGO_URI = 'mongodb://localhost:27017/commission-ledger';

const seedVillage = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    await Village.deleteMany({});
    console.log('🗑️ Old data cleared');

    // Read from the converted JSON file
    const villages = JSON.parse(fs.readFileSync('./villages_converted.json', 'utf-8'));

    if (villages.length === 0) {
      console.log('❌ No villages found in villages_converted.json');
      process.exit(1);
    }

    await Village.insertMany(villages);
    console.log(`🎉 Successfully seeded ${villages.length} villages!`);

    // Show sample for verification
    console.log('\nSample (first 8):');
    villages.slice(0, 8).forEach(v => {
      console.log(`${v.villageId} → ${v.nameTa} | ${v.nameEn} | Active: ${v.isActive}`);
    });

    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedVillage();