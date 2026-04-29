const mongoose = require('mongoose');
const Purchase = require('./models/Purchase.model');
const connectDB = require('./config/db');
require('dotenv').config();

const check = async () => {
  await connectDB();
  const count = await Purchase.countDocuments();
  console.log('Total Purchases:', count);
  
  const latest = await Purchase.findOne().sort({ date: -1 });
  console.log('Latest Purchase Date:', latest ? latest.date : 'None');
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayCount = await Purchase.countDocuments({ date: { $gte: today } });
  console.log('Purchases today:', todayCount);
  
  process.exit();
};

check();
