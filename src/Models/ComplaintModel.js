import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  location: {
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  proofFiles: [{ type: String }], // file URLs/paths
  status: {
    type: String,
    enum: ['Awaiting Review', 'Complaint Registered', 'Assigned to Field Officer', 'Inspection Completed', 'Work in Progress', 'Issue Resolved', 'Rejected'],
    default: 'Awaiting Review'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  assignedTo: {
    type: String,
    default: 'Unassigned'
  },
  statusHistory: [{
    status: String,
    changedBy: String,
    assignedTo: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.__v; return ret; } }
});

// Auto-generate complaintId before saving
complaintSchema.pre('save', async function () {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `IGMS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

complaintSchema.index({ user: 1, createdAt: -1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
