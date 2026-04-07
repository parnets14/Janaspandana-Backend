import express from 'express';
import {
  register,
  requestOTP,
  verifyOTP,
  refreshToken,
  logout,
  getMe,
  getAllUsers,
  deleteUser,
  updateMe
} from '../Controllers/AuthController.js';
import { authLimiter, otpLimiter } from '../Middleware/securityMiddleware.js';
import { protect } from '../Middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/request-otp', otpLimiter, requestOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
