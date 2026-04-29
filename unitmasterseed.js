const mongoose = require('mongoose');
const Unit = require('./models/Unit.model'); // adjust path if needed

// 🔌 MongoDB Connection
const MONGO_URI = 'mongodb://localhost:27017/commission-ledger'; // change DB name

const seedUnits = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    // 🧹 Optional: Clear existing data
    await Unit.deleteMany();
    console.log('🗑️ Old Units Deleted');

    // 📦 Unit Data
    const units = [
      { nameTa: "கிலோ கிராம்", nameEn: "Kilogram" },
      { nameTa: "கிராம்", nameEn: "Gram" },
      { nameTa: "மூட்டை", nameEn: "Bag" },
      { nameTa: "பெட்டி", nameEn: "Box" },
      { nameTa: "எண்ணிக்கை", nameEn: "Numbers" },
      { nameTa: "லிட்டர்", nameEn: "Liter" },
      { nameTa: "மில்லிலிட்டர்", nameEn: "Milliliter" },
      { nameTa: "கட்டுகள்", nameEn: "Bundles" },
      { nameTa: "தொகுப்பு", nameEn: "Pack" },
      { nameTa: "டஜன்", nameEn: "Dozen" }
    ];

    // 🚀 Insert Data
    await Unit.insertMany(units);
    console.log('✅ Unit Data Seeded Successfully');

    process.exit();
  } catch (error) {
    console.error('❌ Error Seeding Units:', error);
    process.exit(1);
  }
};

// ▶️ Run Seed
seedUnits();