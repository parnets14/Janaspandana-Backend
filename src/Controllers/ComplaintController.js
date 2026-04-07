import Complaint from '../Models/ComplaintModel.js';
import Officer from '../Models/OfficerModel.js';
import User from '../Models/UserModel.js';

// @desc    Get complaints assigned to officers
// @route   GET /api/complaints/officer
export const getOfficerComplaints = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      status: { $in: ['Assigned to Field Officer', 'Inspection Completed', 'Work in Progress', 'Issue Resolved', 'Rejected'] }
    };
    if (status && status !== 'All Tasks') filter.status = status;

    const complaints = await Complaint.find(filter).populate('user', 'name phone').sort({ createdAt: -1 });

    const total = complaints.length;
    const pending = complaints.filter(c => ['Awaiting Review', 'Complaint Registered'].includes(c.status)).length;
    const inProgress = complaints.filter(c => ['Assigned to Field Officer', 'Inspection Completed', 'Work in Progress'].includes(c.status)).length;
    const resolved = complaints.filter(c => c.status === 'Issue Resolved').length;

    res.status(200).json({ success: true, data: complaints, stats: { total, pending, inProgress, resolved }, officerName: 'Officer' });
  } catch (error) {
    console.error('Officer complaints error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// @desc    Submit a new complaint (citizen)
// @route   POST /api/complaints
export const submitComplaint = async (req, res) => {
  try {
    const { department, title, description, location, userId } = req.body;
    if (!department || !title || !description) {
      return res.status(400).json({ success: false, message: 'Department, title and description are required' });
    }

    let userName = 'Citizen';
    if (userId) {
      const user = await User.findById(userId).select('name');
      userName = user?.name || 'Citizen';
    }

    const complaint = await Complaint.create({
      user: userId || null,
      department,
      title,
      description,
      location: {
        address: location?.address || '',
        city: location?.city || '',
        ward: location?.ward || '',
        lat: location?.lat || null,
        lng: location?.lng || null,
      },
      statusHistory: [{ status: 'Awaiting Review', changedBy: userName, note: 'Complaint submitted' }]
    });

    res.status(201).json({ success: true, message: 'Complaint submitted successfully', data: complaint });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit complaint' });
  }
};

// @desc    Get logged-in user's complaints
// @route   GET /api/complaints/my
export const getMyComplaints = async (req, res) => {
  try {
    let userId = req.query.userId;

    if (!userId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const complaints = await Complaint.find({ user: userId }).sort({ createdAt: -1 });
    console.log(`getMyComplaints: userId=${userId}, found=${complaints.length}`);
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    console.error('getMyComplaints error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
export const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name phone');
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaint', error: error.message });
  }
};

// @desc    Get all complaints (admin)
// @route   GET /api/complaints
export const getAllComplaints = async (req, res) => {
  try {
    const { status, department, search, date } = req.query;

    const filter = {};
    if (status && status !== 'All Status') filter.status = status;
    if (department && department !== 'All Sectors') filter.department = department;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(filter).populate('user', 'name phone').sort({ createdAt: -1 });
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'Awaiting Review' });
    const inProgress = await Complaint.countDocuments({ status: { $in: ['Complaint Registered', 'Assigned to Field Officer', 'Inspection Completed', 'Work in Progress'] } });
    const resolved = await Complaint.countDocuments({ status: 'Issue Resolved' });

    res.status(200).json({ success: true, data: complaints, stats: { total, pending, inProgress, resolved } });
  } catch (error) {
    console.error('getAllComplaints error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints', error: error.message });
  }
};

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id/status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, assignedTo, priority, note, isAdmin } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Ensure arrays exist
    if (!Array.isArray(complaint.officerAttachments)) complaint.officerAttachments = [];
    if (!Array.isArray(complaint.adminAttachments)) complaint.adminAttachments = [];
    if (!Array.isArray(complaint.proofFiles)) complaint.proofFiles = [];
    if (!Array.isArray(complaint.officerNotes)) complaint.officerNotes = [];
    if (!Array.isArray(complaint.statusHistory)) complaint.statusHistory = [];

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (priority) complaint.priority = priority;

    // Track admin's last action separately
    const adminStatuses = ['Awaiting Review', 'Complaint Registered', 'Assigned to Field Officer'];
    if (isAdmin && status && adminStatuses.includes(status)) {
      complaint.adminStatus = status;
    }

    const currentStatus = status || complaint.status;
    const existingEntry = complaint.statusHistory.find(h => h.status === currentStatus);

    if (existingEntry) {
      existingEntry.timestamp = new Date();
      existingEntry.assignedTo = assignedTo || existingEntry.assignedTo;
      existingEntry.changedBy = assignedTo || 'Officer';
      if (note && note.trim()) existingEntry.note = note;
    } else {
      complaint.statusHistory.push({
        status: currentStatus,
        changedBy: assignedTo || 'Officer',
        assignedTo: assignedTo || complaint.assignedTo || '',
        note: note || ''
      });
    }

    // Store officer/admin notes separately
    if (note && note.trim()) {
      complaint.officerNotes.push({
        note,
        status: currentStatus,
        uploadedBy: assignedTo || 'Officer',
        uploadedAt: new Date()
      });
    }

    await complaint.save();
    res.status(200).json({ success: true, message: 'Complaint updated', data: complaint });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update complaint', error: error.message });
  }
};

// @desc    Upload photos to a complaint
// @route   POST /api/complaints/:id/photos
export const uploadComplaintPhotos = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const filePaths = req.files.map(f => `/uploads/complaints/${f.filename}`);
    const uploadType = req.query.type; // 'officer' or 'admin'

    console.log(`Uploading ${filePaths.length} files as type: ${uploadType}`);
    console.log('File paths:', filePaths);

    // Ensure arrays exist and are arrays
    if (!Array.isArray(complaint.officerAttachments)) complaint.officerAttachments = [];
    if (!Array.isArray(complaint.adminAttachments)) complaint.adminAttachments = [];
    if (!Array.isArray(complaint.proofFiles)) complaint.proofFiles = [];

    if (uploadType === 'officer') {
      complaint.officerAttachments.push(...filePaths);
    } else if (uploadType === 'admin') {
      complaint.adminAttachments.push(...filePaths);
    } else {
      complaint.proofFiles.push(...filePaths);
    }
    
    await complaint.save();

    res.status(200).json({ success: true, message: 'Photos uploaded', data: complaint });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photos', error: error.message });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });
    res.status(200).json({ success: true, message: 'Complaint deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete complaint' });
  }
};

// @desc    Reopen complaint
// @route   POST /api/complaints/:id/reopen
export const reopenComplaint = async (req, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    complaint.status = 'Complaint Registered';
    complaint.assignedTo = 'Unassigned';
    complaint.statusHistory = [{
      status: 'Complaint Registered',
      changedBy: 'Citizen',
      assignedTo: '',
      note: reason ? `Reopen request: ${reason}` : 'Complaint reopened by citizen',
      timestamp: new Date()
    }];

    await complaint.save();
    res.status(200).json({ success: true, message: 'Complaint reopened', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reopen complaint' });
  }
};
