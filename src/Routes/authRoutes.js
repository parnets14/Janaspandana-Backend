import express from 'express';
import {
  register,
  requestOTP,
  verifyOTP,
  refreshToken,
  logout,
  getMe,
  getAllUsers
} from '../Controllers/AuthController.js';
import { protect, restrictTo } from '../Middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../Middleware/securityMiddleware.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/request-otp', otpLimiter, requestOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/users', protect, restrictTo('admin'), getAllUsers);

export default router;
