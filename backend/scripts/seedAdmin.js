const mongoose = require('mongoose');
const User = require('../models/User');
const Hive = require('../models/Hive');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out in production)
    // await User.deleteMany({});
    // await Hive.deleteMany({});

    // Create Admin User
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@beehive.com',
      password: 'ChangeMe123!',
      role: 'admin',
      phone: '+910000000000'
    });
    console.log('✅ Admin user created:', adminUser.email);

    // Create Farmer User
    const farmerUser = await User.create({
      name: "John Farmer",
      email: "farmer@beehive.com",
      password: "ChangeMe123!",
      role: "farmer",
      phone: "+910000000000",
    });
    console.log('✅ Farmer user created:', farmerUser.email);

    // Create Sample Hive
    const sampleHive = await Hive.create({
      hive_id: 'HIVE001',
      name: 'Main Apiary - Hive 1',
      location: 'North Field, Farm A',
      coordinates: {
        lat: 19.0760,
        lng: 72.8777
      },
      owner: farmerUser._id,
      smsAlertsEnabled: true,
      metadata: {
        colonyAge: '6 months',
        queenType: 'Italian',
        notes: 'Strong colony, good honey production'
      }
    });
    console.log('✅ Sample hive created:', sampleHive.hive_id);

    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@beehive.com / admin123');
    console.log('Farmer: farmer@beehive.com / farmer123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedAdmin();
