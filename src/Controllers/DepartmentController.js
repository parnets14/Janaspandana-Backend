import Department from '../Models/DepartmentModel.js';

// @desc    Get all active departments (public - used in submit complaint)
// @route   GET /api/departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

// @desc    Get all departments including inactive (admin only)
// @route   GET /api/departments/all
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

// @desc    Create department
// @route   POST /api/departments
export const createDepartment = async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });

    const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) return res.status(400).json({ success: false, message: 'Department already exists' });

    const department = await Department.create({ name, icon });
    res.status(201).json({ success: true, message: 'Department created', data: department });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Department already exists' });
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
  try {
    const { name, icon, isActive } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, icon, isActive },
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(200).json({ success: true, message: 'Department updated', data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.status(200).json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
};
