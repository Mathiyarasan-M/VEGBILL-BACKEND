const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Role = require('../models/Role.model');
const User = require('../models/User.model');

dotenv.config();

const roles = [
  {
    name: 'Superadmin',
    description: 'Full access to all modules and user management',
    permissions: {
      menus: [
        { name: 'Dashboard', path: '/dashboard', access: true },
        { name: 'Farmers', path: '/farmers', access: true },
        { name: 'Vendors', path: '/vendors', access: true },
        { name: 'Vegetables', path: '/vegetables', access: true },
        { name: 'Purchases', path: '/purchases', access: true },
        { name: 'Sales', path: '/sales', access: true },
        { name: 'Reports', path: '/reports', access: true },
        { name: 'User Management', path: '/users', access: true },
        { name: 'Role Management', path: '/roles', access: true },
      ]
    }
  },
  {
    name: 'Admin',
    description: 'Access to most modules and basic user management',
    permissions: {
      menus: [
        { name: 'Dashboard', path: '/dashboard', access: true },
        { name: 'Farmers', path: '/farmers', access: true },
        { name: 'Vendors', path: '/vendors', access: true },
        { name: 'Vegetables', path: '/vegetables', access: true },
        { name: 'Purchases', path: '/purchases', access: true },
        { name: 'Sales', path: '/sales', access: true },
        { name: 'Reports', path: '/reports', access: true },
        { name: 'User Management', path: '/users', access: true },
        { name: 'Role Management', path: '/roles', access: false },
      ]
    }
  },
  {
    name: 'User',
    description: 'Limited access to entry modules',
    permissions: {
      menus: [
        { name: 'Dashboard', path: '/dashboard', access: true },
        { name: 'Farmers', path: '/farmers', access: true },
        { name: 'Vendors', path: '/vendors', access: true },
        { name: 'Vegetables', path: '/vegetables', access: false },
        { name: 'Purchases', path: '/purchases', access: true },
        { name: 'Sales', path: '/sales', access: true },
        { name: 'Reports', path: '/reports', access: false },
        { name: 'User Management', path: '/users', access: false },
        { name: 'Role Management', path: '/roles', access: false },
      ]
    }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing
    await Role.deleteMany({});
    await User.deleteMany({});

    // Create Roles
    const createdRoles = await Role.insertMany(roles);
    console.log('Roles seeded');

    // Create Superadmin User
    const superadminRole = createdRoles.find(r => r.name === 'Superadmin');

    await User.create({
      name: 'Super Admin',
      email: 'admin@gmail.com',
      password: '123456',
      role: superadminRole._id
    });

    console.log('Superadmin user created: admin@gmail.com / 123456');

    process.exit();
  } catch (error) {
    console.error(`Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
