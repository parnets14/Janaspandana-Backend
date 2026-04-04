import express from 'express';
import {
  getDepartments,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../Controllers/DepartmentController.js';
import { protect, restrictTo } from '../Middleware/authMiddleware.js';

const router = express.Router();

// Public - used by submit complaint page
router.get('/', getDepartments);

// Admin only
router.get('/all', protect, restrictTo('admin'), getAllDepartments);
router.post('/', protect, restrictTo('admin'), createDepartment);
router.put('/:id', protect, restrictTo('admin'), updateDepartment);
router.delete('/:id', protect, restrictTo('admin'), deleteDepartment);

export default router;
