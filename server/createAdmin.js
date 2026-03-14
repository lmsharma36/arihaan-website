const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arihaan-ppe');
    
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@arihaanenterprises.com' });
    
    if (adminExists) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', adminExists.email);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'ARIHAAN Admin',
      email: 'admin@arihaanenterprises.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 XXXXX XXXXX',
      company: 'ARIHAAN ENTERPRISES'
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
