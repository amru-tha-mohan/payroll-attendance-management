import { Router } from 'express';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const getMyEmployee = async (userId) => Employee.findOne({ user: userId });
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1);

// Apply for leave (employee self)
router.post('/', authorize('EMPLOYEE', 'HR', 'ADMIN'), async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.status(400).json({ message: 'No employee profile linked to this account' });

    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ message: 'type, startDate and endDate are required' });
    }
    if (!['CASUAL', 'SICK', 'EARNED', 'UNPAID'].includes(type)) {
      return res.status(400).json({ message: 'Invalid leave type' });
    }
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    const leave = await Leave.create({
      employee: employee._id,
      type,
      startDate,
      endDate,
      days: daysBetween(startDate, endDate),
      reason: reason || '',
    });
    res.status(201).json(leave);
  } catch (err) {
    next(err);
  }
});

// Current user's leave requests
router.get('/mine', async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.json([]);
    const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
});

// HR/Admin: all leave requests
router.get('/', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const { status, employeeId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('_id');
      if (!emp) return res.json([]);
      filter.employee = emp._id;
    }
    const leaves = await Leave.find(filter)
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email department' } })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
});

const updateStatus = (status) => async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    if (leave.status !== 'PENDING') return res.status(400).json({ message: `Leave already ${leave.status.toLowerCase()}` });

    leave.status = status;
    leave.approvedBy = req.user._id;
    leave.remarks = req.body.remarks || '';
    await leave.save();
    res.json(leave);
  } catch (err) {
    next(err);
  }
};

router.patch('/:id/approve', authorize('ADMIN', 'HR'), updateStatus('APPROVED'));
router.patch('/:id/reject', authorize('ADMIN', 'HR'), updateStatus('REJECTED'));

router.delete('/:id', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
