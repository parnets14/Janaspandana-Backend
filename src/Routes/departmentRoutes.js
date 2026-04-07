import express from 'express';
import {
  getDepartments,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../Controllers/DepartmentController.js';

const router = express.Router();

router.get('/', getDepartments);
router.get('/all', getAllDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
