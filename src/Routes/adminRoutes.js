import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  refreshAdminToken,
  logoutAdmin,
  getAdminProfile,
  createOfficer,
  getOfficers,
  deleteOfficer,
  updateOfficer,
  loginOfficer,
  refreshOfficerToken,
} from '../Controllers/AdminController.js';
import { getAllUsers, deleteUser } from '../Controllers/AuthController.js';
import { authLimiter } from '../Middleware/securityMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, registerAdmin);
router.post('/login', authLimiter, loginAdmin);
router.post('/refresh-token', refreshAdminToken);
router.post('/officer-login', authLimiter, loginOfficer);
router.post('/officer-refresh-token', refreshOfficerToken);

router.post('/logout', logoutAdmin);
router.get('/me', getAdminProfile);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

router.post('/officers', createOfficer);
router.get('/officers', getOfficers);
router.patch('/officers/:id', updateOfficer);
router.delete('/officers/:id', deleteOfficer);

export default router;
