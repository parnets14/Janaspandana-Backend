import Admin from '../Models/AdminModel.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../Utils/jwtUtils.js';

// @desc    Register new admin
// @route   POST /api/admin/register
// @access  Private/SuperAdmin (for now public for initial setup)
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password
    });
    
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        adminId: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
    
  } catch (error) {
    console.error('Admin registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Find admin with password
    const admin = await Admin.findOne({ email })
      .select('+password +failedLoginAttempts +lockUntil +refreshToken');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed attempts. Please try again later.'
      });
    }
    
    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }
    
    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Password is correct - reset attempts and update login info
    await admin.resetLoginAttempts();
    
    admin.lastLogin = Date.now();
    admin.loginHistory.push({
      timestamp: Date.now(),
      ip: req.clientIp || req.ip,
      userAgent: req.clientUserAgent || req.get('user-agent')
    });
    
    // Keep only last 10 login records
    if (admin.loginHistory.length > 10) {
      admin.loginHistory = admin.loginHistory.slice(-10);
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(admin._id, admin.role);
    const refreshToken = generateRefreshToken(admin._id);
    
    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });
    
    // Remove sensitive data
    const adminResponse = admin.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminResponse,
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// @desc    Refresh admin access token
// @route   POST /api/admin/refresh-token
// @access  Public
export const refreshAdminToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    
    // Find admin and verify refresh token matches
    const admin = await Admin.findById(decoded.id).select('+refreshToken');
    
    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(admin._id, admin.role);
    
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRE
      }
    });
    
  } catch (error) {
    console.error('Admin token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

// @desc    Logout admin
// @route   POST /api/admin/logout
// @access  Public
export const logoutAdmin = async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current admin
// @route   GET /api/admin/me
// @access  Public
export const getAdminProfile = async (req, res) => {
  res.status(200).json({ success: true, data: {} });
};

import Officer from '../Models/OfficerModel.js';
import Department from '../Models/DepartmentModel.js';

// @desc    Create officer (admin only)
// @route   POST /api/admin/officers
// @access  Private/Admin
export const createOfficer = async (req, res) => {
  try {
    const { name, email, password, departmentId, phone } = req.body;

    if (!name || !email || !password || !departmentId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const existing = await Officer.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const officer = await Officer.create({ name, email, password, phone, department: departmentId });

    res.status(201).json({
      success: true,
      message: 'Officer created successfully',
      data: { id: officer._id, name: officer.name, email: officer.email, department: dept.name },
    });
  } catch (error) {
    console.error('Create officer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create officer' });
  }
};

// @desc    Get all officers
// @route   GET /api/admin/officers
// @access  Private/Admin
export const getOfficers = async (req, res) => {
  try {
    const officers = await Officer.find().populate('department', 'name icon').sort('-createdAt');
    res.status(200).json({ success: true, data: officers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch officers' });
  }
};

// @desc    Update officer
// @route   PATCH /api/admin/officers/:id
export const updateOfficer = async (req, res) => {
  try {
    const { name, email, phone, departmentId } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (departmentId) updates.department = departmentId;

    const officer = await Officer.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('department', 'name icon');
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    res.status(200).json({ success: true, message: 'Officer updated', data: officer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update officer' });
  }
};

// @desc    Delete officer
// @route   DELETE /api/admin/officers/:id
// @access  Private/Admin
export const deleteOfficer = async (req, res) => {
  try {
    await Officer.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Officer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete officer' });
  }
};

// @desc    Officer login
// @route   POST /api/admin/officer-login
// @access  Public
export const loginOfficer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const officer = await Officer.findOne({ email }).select('+password +refreshToken');
    if (!officer) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!officer.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const isValid = await officer.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(officer._id, 'officer');
    const refreshToken = generateRefreshToken(officer._id);

    officer.refreshToken = refreshToken;
    await officer.save({ validateBeforeSave: false });

    const officerData = await Officer.findById(officer._id).populate('department', 'name icon');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { officer: officerData, accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Officer login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// @desc    Refresh officer access token
// @route   POST /api/admin/officer-refresh-token
// @access  Public
export const refreshOfficerToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const officer = await Officer.findById(decoded.id).select('+refreshToken');
    if (!officer || officer.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(officer._id, 'officer');
    res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
};
