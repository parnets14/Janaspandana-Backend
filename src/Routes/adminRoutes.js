import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  refreshAdminToken,
  logoutAdmin,
  getAdminProfile
} from '../Controllers/AdminController.js';
import { getAllUsers, deleteUser } from '../Controllers/AuthController.js';
import { protect, restrictTo } from '../Middleware/authMiddleware.js';
import { authLimiter } from '../Middleware/securityMiddleware.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', authLimiter, registerAdmin);
router.post('/login', authLimiter, loginAdmin);
router.post('/refresh-token', refreshAdminToken);

// Protected routes (admin only)
router.post('/logout', protect, restrictTo('admin'), logoutAdmin);
router.get('/me', protect, restrictTo('admin'), getAdminProfile);
router.get('/users', protect, restrictTo('admin'), getAllUsers);
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

export default router;
