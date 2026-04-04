import express from 'express';
import {
  submitComplaint,
  getMyComplaints,
  getComplaint,
  getAllComplaints,
  updateComplaintStatus,
  uploadComplaintPhotos,
  deleteComplaint,
  reopenComplaint
} from '../Controllers/ComplaintController.js';
import { protect, restrictTo } from '../Middleware/authMiddleware.js';
import { upload } from '../Middleware/uploadMiddleware.js';

const router = express.Router();

// Citizen routes
router.post('/', protect, submitComplaint);
router.get('/my', protect, getMyComplaints);
router.get('/:id', protect, getComplaint);

// Admin routes
router.get('/', protect, restrictTo('admin'), getAllComplaints);
router.patch('/:id/status', protect, restrictTo('admin'), updateComplaintStatus);
router.post('/:id/photos', protect, upload.array('photos', 5), uploadComplaintPhotos);
router.delete('/:id', protect, restrictTo('admin'), deleteComplaint);
router.post('/:id/reopen', protect, reopenComplaint);

export default router;
