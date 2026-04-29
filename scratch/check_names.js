const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Farmer = require('../models/Farmer.model');

dotenv.config();

const verify = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    
    const farmers = await Farmer.find().limit(10);
    farmers.forEach(f => {
        console.log(`${f.farmerCode}: ${f.nameTamil} -> ${f.name}`);
    });
    
    process.exit();
};

verify();
