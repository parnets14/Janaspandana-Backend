import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/Models/AdminModel.js';

dotenv.config();

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const email = 'admin@janaspandana.gov.in';
    
    // Delete existing admin
    await Admin.deleteMany({ email });
    console.log('🗑️  Deleted existing admin');

    // Create new admin (will use pre-save hook to hash password)
    const admin = new Admin({
      name: 'Admin',
      email: email,
      password: 'Admin@123',
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log('\n=================================');
    console.log('📧 Email:', email);
    console.log('🔑 Password: Admin@123');
    console.log('=================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

resetAdmin();
