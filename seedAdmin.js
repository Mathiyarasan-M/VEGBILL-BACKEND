const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User.model');
const Role = require('./models/Role.model');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/veg_app');
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@gmail.com';
    let role = await Role.findOne({ name: 'Super Admin' });
    if (!role) {
      role = await Role.create({
        name: 'Super Admin',
        description: 'Default super admin role',
        permissions: []
      });
    }

    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      admin = await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: '123',
        isActive: true,
        role: role._id
      });
      console.log('Super Admin user created successfully!');
    } else {
      console.log('Super Admin already exists. Updating password to 123');
      admin.password = '123';
      await admin.save();
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
