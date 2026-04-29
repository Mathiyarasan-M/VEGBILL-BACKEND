const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Farmer = require('../models/Farmer.model');
const Vendor = require('../models/Vendor.model');
const Village = require('../models/Village.model');

dotenv.config();

const verify = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    
    const farmerCount = await Farmer.countDocuments();
    const vendorCount = await Vendor.countDocuments();
    
    console.log('Farmer Count:', farmerCount);
    console.log('Vendor Count:', vendorCount);
    
    const sampleFarmer = await Farmer.findOne().populate('address');
    console.log('\nSample Farmer:', JSON.stringify(sampleFarmer, null, 2));
    
    const sampleVendor = await Vendor.findOne().populate('address');
    console.log('\nSample Vendor:', JSON.stringify(sampleVendor, null, 2));
    
    process.exit();
};

verify();
