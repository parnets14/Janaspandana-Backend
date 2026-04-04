import User from '../Models/UserModel.js';
import { sendOTP, validatePhone, validateAadhaar, checkOTPRateLimit } from '../Utils/otpService.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../Utils/jwtUtils.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, phone, aadhaar, address, photo, aadhaarPhoto } = req.body;
    
    // Validate phone
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Validate aadhaar
    if (!validateAadhaar(aadhaar)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar number format'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ phone }, { aadhaar }] 
    });
    
    if (existingUser) {
      if (existingUser.phone === phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
      if (existingUser.aadhaar === aadhaar) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar number already registered'
        });
      }
    }
    
    // Check OTP rate limit
    const rateLimit = checkOTPRateLimit(phone);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again after ${rateLimit.retryAfter} minutes.`
      });
    }
    
    // Create user
    const user = await User.create({
      name,
      phone,
      aadhaar,
      address,
      photo,
      aadhaarPhoto,
      role: 'citizen'
    });
    
    // Generate and send OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });
    
    const otpResult = await sendOTP(phone, otp);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. OTP sent to your phone.',
      data: {
        userId: user._id,
        phone: user.phone,
        otpSent: true,
        expiresIn: `${process.env.OTP_EXPIRE_MINUTES} minutes`,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpResult.devOTP })
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
};

// @desc    Request OTP for login
// @route   POST /api/auth/request-otp
// @access  Public
export const requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone
    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Check OTP rate limit
    const rateLimit = checkOTPRateLimit(phone);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again after ${rateLimit.retryAfter} minutes.`
      });
    }
    
    // Find user
    const user = await User.findOne({ phone }).select('+lockUntil');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Phone number not registered'
      });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed attempts. Please try again later.'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }
    
    // Generate and send OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });
    
    const otpResult = await sendOTP(phone, otp);
    
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: user.phone,
        expiresIn: `${process.env.OTP_EXPIRE_MINUTES} minutes`,
        attemptsRemaining: rateLimit.remaining,
        ...(process.env.NODE_ENV !== 'production' && { devOTP: otpResult.devOTP })
      }
    });
    
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    // Validate inputs
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }
    
    if (otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be 6 digits'
      });
    }
    
    // Find user
    const user = await User.findOne({ phone })
      .select('+otp +otpExpire +otpAttempts +failedLoginAttempts +lockUntil +refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }
    
    // Check if OTP exists
    if (!user.otp || !user.otpExpire) {
      return res.status(400).json({
        success: false,
        message: 'Please request a new OTP'
      });
    }
    
    // Check OTP attempts
    if (user.otpAttempts >= parseInt(process.env.MAX_OTP_ATTEMPTS)) {
      user.otp = undefined;
      user.otpExpire = undefined;
      user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      });
    }
    
    // Verify OTP
    const isValid = user.verifyOTP(otp);
    
    if (!isValid) {
      user.otpAttempts += 1;
      await user.incLoginAttempts();
      await user.save({ validateBeforeSave: false });
      
      const attemptsLeft = parseInt(process.env.MAX_OTP_ATTEMPTS) - user.otpAttempts;
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP',
        attemptsRemaining: attemptsLeft
      });
    }
    
    // OTP is valid - clear OTP fields and reset attempts
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;
    user.isVerified = true;
    user.lastLogin = Date.now();
    
    // Add to login history
    user.loginHistory.push({
      timestamp: Date.now(),
      ip: req.clientIp || req.ip,
      userAgent: req.clientUserAgent || req.get('user-agent')
    });
    
    // Keep only last 10 login records
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(-10);
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    
    user.refreshToken = refreshToken;
    await user.resetLoginAttempts();
    await user.save({ validateBeforeSave: false });
    
    // Remove sensitive data
    const userResponse = user.toJSON();
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res) => {
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
    
    // Find user and verify refresh token matches
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(user._id, user.role);
    
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRE
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // Clear refresh token
    req.user.refreshToken = undefined;
    await req.user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-otp -otpExpire -otpAttempts -refreshToken')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
    
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};
