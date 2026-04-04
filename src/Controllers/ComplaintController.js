import Complaint from '../Models/ComplaintModel.js';

// @desc    Submit a new complaint (citizen)
// @route   POST /api/complaints
export const submitComplaint = async (req, res) => {
  try {
    const { department, title, description, location } = req.body;

    if (!department || !title || !description) {
      return res.status(400).json({ success: false, message: 'Department, title and description are required' });
    }

    const complaint = await Complaint.create({
      user: req.user._id,
      department,
      title,
      description,
      location: location || {},
      statusHistory: [{ status: 'Awaiting Review', changedBy: req.user.name || 'Citizen', note: 'Complaint submitted' }]
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
    const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// @desc    Get single complaint (owner or admin)
// @route   GET /api/complaints/:id
export const getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name phone');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Admin can always view; citizen can only view their own
    const isAdmin = req.user.role === 'admin';
    const isOwner = complaint.user && complaint.user._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

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

    const complaints = await Complaint.find(filter)
      .populate('user', 'name phone')
      .sort({ createdAt: -1 });

    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'Awaiting Review' });
    const inProgress = await Complaint.countDocuments({ status: 'Work in Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Issue Resolved' });

    res.status(200).json({
      success: true,
      data: complaints,
      stats: { total, pending, inProgress, resolved }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
};

// @desc    Update complaint status (admin)
// @route   PATCH /api/complaints/:id/status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, assignedTo, priority, note } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (priority) complaint.priority = priority;

    const currentStatus = status || complaint.status;
    const existingEntry = complaint.statusHistory.find(h => h.status === currentStatus);

    if (existingEntry) {
      // Update the existing entry in place
      existingEntry.timestamp = new Date();
      existingEntry.assignedTo = assignedTo || existingEntry.assignedTo;
      existingEntry.changedBy = assignedTo || req.user.name || 'Admin';
      if (note && note.trim()) existingEntry.note = note;
    } else {
      // New status — add a new entry
      complaint.statusHistory.push({
        status: currentStatus,
        changedBy: assignedTo || req.user.name || 'Admin',
        assignedTo: assignedTo || complaint.assignedTo || '',
        note: note || ''
      });
    }

    await complaint.save();
    res.status(200).json({ success: true, message: 'Complaint updated', data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update complaint' });
  }
};

// @desc    Upload photos to a complaint
// @route   POST /api/complaints/:id/photos
export const uploadComplaintPhotos = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    const filePaths = req.files.map(f => `/uploads/complaints/${f.filename}`);
    complaint.proofFiles.push(...filePaths);
    await complaint.save();

    res.status(200).json({ success: true, message: 'Photos uploaded', data: complaint });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photos' });
  }
};

// @desc    Delete complaint (admin)
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

// @desc    Reopen complaint (citizen)
// @route   POST /api/complaints/:id/reopen
export const reopenComplaint = async (req, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    // Only owner can reopen
    if (complaint.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Reset to Complaint Registered and clear history
    complaint.status = 'Complaint Registered';
    complaint.assignedTo = 'Unassigned';
    complaint.statusHistory = [{
      status: 'Complaint Registered',
      changedBy: req.user.name || 'Citizen',
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
