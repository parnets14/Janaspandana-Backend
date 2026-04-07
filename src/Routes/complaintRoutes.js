import express from 'express';
import {
  submitComplaint,
  getMyComplaints,
  getComplaint,
  getAllComplaints,
  updateComplaintStatus,
  uploadComplaintPhotos,
  deleteComplaint,
  reopenComplaint,
  getOfficerComplaints,
} from '../Controllers/ComplaintController.js';
import { protect, restrictTo } from '../Middleware/authMiddleware.js';
import { upload } from '../Middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/', submitComplaint);
router.get('/my', getMyComplaints);
router.get('/officer', protect, restrictTo('officer'), getOfficerComplaints);
router.get('/', getAllComplaints);
router.get('/:id', getComplaint);
router.patch('/:id/status', updateComplaintStatus);
router.post('/:id/photos', upload.array('photos', 5), uploadComplaintPhotos);
router.delete('/:id', deleteComplaint);
router.post('/:id/reopen', reopenComplaint);

export default router;
