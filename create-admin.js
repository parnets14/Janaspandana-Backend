import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginHistory: [{ timestamp: Date, ip: String, userAgent: String }],
  refreshToken: String,
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const email = 'admin@janaspandana';
    const password = 'Admin@123';

    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists');
      console.log('\n=================================');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('=================================\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await Admin.create({
      name: 'Admin',
      email: email,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin created successfully!');
    console.log('\n=================================');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('=================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();
