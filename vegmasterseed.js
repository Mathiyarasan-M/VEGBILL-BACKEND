const mongoose = require('mongoose');
const Vegetable = require('./models/Vegetable.model');
const Unit = require('./models/Unit.model');

const MONGO_URI = 'mongodb://localhost:27017/commission-ledger'; // change DB name

const seedVegetables = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');

    await Vegetable.deleteMany();
    console.log('🗑️ Old Vegetables Deleted');

    // 🔥 Create Unit Map (dynamic)
    const units = await Unit.find();
    const unitMap = {};
    units.forEach(u => {
      unitMap[u.nameTa] = u._id;
      unitMap[u.nameEn] = u._id;
    });

    // 📦 FULL DATA
    const data = [
      ["32","வெங்காயம்","Onion","கிலோ கிராம்",4],
      ["18","சுரைக்காய்","Bottle Gourd","கிலோ கிராம்",4],
      ["26","பாகற்காய்","Bitter Gourd","கிலோ கிராம்",4],
      ["61","நாத்தங்காய்","Citron","கிலோ கிராம்",4],
      ["56","பூசணிக்காய்","Pumpkin","கிலோ கிராம்",4],
      ["41","காலிபிளவர் பூ","Cauliflower","மூட்டை",4],
      ["17","காரட்","Carrot","கிலோ கிராம்",4],
      ["73","கத்திரிக்காய்","Brinjal","கிலோ கிராம்",4],
      ["72","குடைமிளகாய்","Capsicum","கிலோ கிராம்",4],
      ["60","கீரை","Greens","கிலோ கிராம்",4],
      ["20","உருளைக்கிழங்கு","Potato","கிலோ கிராம்",4],
      ["34","கொத்தமல்லி","Coriander Leaves","கிலோ கிராம்",4],
      ["43","பப்பாளிப்பழம்","Papaya","கிலோ கிராம்",4],
      ["6","பீர்க்கங்காய்","Ridge Gourd","கிலோ கிராம்",4],
      ["36","புதினா","Mint Leaves","கிலோ கிராம்",4],
      ["24","பட்டாணி","Peas","கிலோ கிராம்",4],
      ["28","புடலங்காய்","Snake Gourd","கிலோ கிராம்",4],
      ["53","பீன்ஸ்","Beans","கிலோ கிராம்",4],
      ["15","பீர்க்கங்காய்","Ridge Gourd","கிலோ கிராம்",4],
      ["25","பீட்ரூட்","Beetroot","கிலோ கிராம்",4],
      ["1","தக்காளி","Tomato","பெட்டி",1],
      ["80","தார்ப்பூசணி","Watermelon","கிலோ கிராம்",4],
      ["74","தேங்காய்","Coconut","கிலோ கிராம்",4],
      ["66","துவரம்பருப்பு","Toor Dal","கிலோ கிராம்",0],
      ["65","தட்டைப்பயறு","Field Beans","கிலோ கிராம்",4],
      ["77","வாழை","Banana","கிலோ கிராம்",0],
      ["47","வாழைக்காய்","Raw Banana","கிலோ கிராம்",4],
      ["68","வாழைப்பூ","Banana Flower","கிலோ கிராம்",4],
      ["81","மக்காச்சோளம்","Maize","கிலோ கிராம்",4],
      ["7","மாங்காய்","Mango","கிலோ கிராம்",4],
      ["22","முட்டைகோஸ்","Cabbage","கிலோ கிராம்",4],
      ["16","மிளகாய்","Chilli","கிலோ கிராம்",4],
      ["21","முருங்கைக்காய்","Drumstick","கிலோ கிராம்",4],
      ["4","முருங்கைக்காய்","Drumstick","கிலோ கிராம்",4],
      ["23","முருங்கைக்கீரை","Moringa Leaves","கிலோ கிராம்",4],
      ["35","மல்லித்தழை","Coriander Leaves","கிலோ கிராம்",4],
      ["27","சோளம்","Corn","கிலோ கிராம்",4],
      ["69","சக்கரைவள்ளிக்கிழங்கு","Sweet Potato","கிலோ கிராம்",4],
      ["13","சாம்பார் வெங்காயம்","Shallots","கிலோ கிராம்",4],
      ["37","நெல்லிக்காய்","Gooseberry","கிலோ கிராம்",4],
      ["57","கொய்யாப்பழம்","Guava","கிலோ கிராம்",4],
      ["58","கொத்தவரங்காய்","Cluster Beans","கிலோ கிராம்",4],
      ["70","கோவைக்காய்","Ivy Gourd","கிலோ கிராம்",4],
      ["10","பெரிய வெங்காயம்","Big Onion","கிலோ கிராம்",4],
      ["39","மொச்சை","Field Beans","கிலோ கிராம்",4],
      ["78","சோளம்","Corn","கிலோ கிராம்",4],
      ["19","சேனைக்கிழங்கு","Yam","கிலோ கிராம்",4],
      ["29","வெள்ளை பூசணி","Ash Gourd","கிலோ கிராம்",4],
      ["76","வெள்ளைப்பூண்டு","Garlic","கிலோ கிராம்",4],
      ["40","வெள்ளரிக்காய்","Cucumber","கிலோ கிராம்",4],
      ["3","வெண்டைக்காய்","Lady Finger","கிலோ கிராம்",4],
      ["30","சர்க்கரை பூசணி","Sweet Pumpkin","கிலோ கிராம்",4],
      ["48","சர்க்கரைவள்ளி","Sweet Potato","கிலோ கிராம்",4],
      ["51","சப்போட்டா","Sapota","கிலோ கிராம்",4],
      ["8","பீர்க்கங்காய்","Ridge Gourd","கிலோ கிராம்",4],
      ["9","சின்ன வெங்காயம்","Small Onion","கிலோ கிராம்",4],
      ["5","சின்னமிளகாய்","Small Chilli","கிலோ கிராம்",4],
      ["33","சுருள்கீரை","Amaranthus","கிலோ கிராம்",4]
    ];

    // 🔄 Convert to schema format
    const vegetables = data.map(item => ({
      vegetableCode: item[0],
      nameTa: item[1],
      nameEn: item[2],
      unit: unitMap[item[3]],
      commission: item[4]
    }));

    // 🚀 Insert
    await Vegetable.insertMany(vegetables);

    console.log('✅ FULL Vegetable Seeded');
    process.exit();

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedVegetables();