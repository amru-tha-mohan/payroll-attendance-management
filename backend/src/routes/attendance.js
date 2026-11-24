import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Leave from '../models/Leave.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const todayStr = () => new Date().toISOString().slice(0, 10);

const getMyEmployee = async (userId) => Employee.findOne({ user: userId });

const hoursBetween = (a, b) => (b - a) / 3600000;

// Employee check-in
router.post('/check-in', authorize('EMPLOYEE', 'HR', 'ADMIN'), async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.status(400).json({ message: 'No employee profile linked to this account' });

    const date = todayStr();
    let record = await Attendance.findOne({ employee: employee._id, date });
    if (record?.checkIn) return res.status(400).json({ message: 'Already checked in today' });

    const now = new Date();
    if (!record) record = new Attendance({ employee: employee._id, date });
    record.checkIn = now;
    record.status = 'PRESENT';
    record.markedBy = req.user._id;
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// Employee check-out
router.post('/check-out', authorize('EMPLOYEE', 'HR', 'ADMIN'), async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.status(400).json({ message: 'No employee profile linked to this account' });

    const record = await Attendance.findOne({ employee: employee._id, date: todayStr() });
    if (!record?.checkIn) return res.status(400).json({ message: 'No check-in found for today' });
    if (record.checkOut) return res.status(400).json({ message: 'Already checked out today' });

    record.checkOut = new Date();
    record.workHours = Math.round(hoursBetween(record.checkIn, record.checkOut) * 100) / 100;
    await record.save();
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Current user's attendance records
router.get('/mine', async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.json([]);
    const records = await Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(90);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// Today's record for current user (dashboard widget)
router.get('/today', async (req, res, next) => {
  try {
    const employee = await getMyEmployee(req.user._id);
    if (!employee) return res.json(null);
    const record = await Attendance.findOne({ employee: employee._id, date: todayStr() });
    res.json(record || null);
  } catch (err) {
    next(err);
  }
});

// HR/Admin: list all attendance with filters
router.get('/', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const { date, month, year, employeeId, status } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (status) filter.status = status;
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      filter.date = { $regex: `^${prefix}` };
    }
    if (employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('_id');
      if (!emp) return res.json([]);
      filter.employee = emp._id;
    }
    const records = await Attendance.find(filter)
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email' } })
      .sort({ date: -1, createdAt: -1 })
      .limit(500);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// HR/Admin: manual mark / update attendance
router.post('/mark', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const { employeeId, date, checkIn, checkOut, status, remarks } = req.body;
    if (!employeeId || !date) return res.status(400).json({ message: 'employeeId and date are required' });

    const employee = await Employee.findOne({ employeeId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let record = await Attendance.findOne({ employee: employee._id, date });
    if (!record) record = new Attendance({ employee: employee._id, date });

    if (checkIn !== undefined) record.checkIn = checkIn ? new Date(checkIn) : null;
    if (checkOut !== undefined) record.checkOut = checkOut ? new Date(checkOut) : null;
    if (status) record.status = ['PRESENT', 'ABSENT', 'HALF_DAY'].includes(status) ? status : record.status;
    if (remarks !== undefined) record.remarks = remarks;
    record.markedBy = req.user._id;
    if (record.checkIn && record.checkOut) {
      record.workHours = Math.round(hoursBetween(new Date(record.checkIn), new Date(record.checkOut)) * 100) / 100;
    }
    await record.save();
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// Monthly attendance summary per employee
router.get('/summary', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) return res.status(400).json({ message: 'month and year are required' });

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const records = await Attendance.find({ date: { $regex: `^${prefix}` } })
      .populate({ path: 'employee', populate: { path: 'user', select: 'name' } });

    const byEmployee = {};
    records.forEach((r) => {
      const key = r.employee?._id?.toString();
      if (!key) return;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee: r.employee,
          present: 0,
          absent: 0,
          halfDay: 0,
          totalHours: 0,
        };
      }
      const s = byEmployee[key];
      if (r.status === 'PRESENT') s.present++;
      else if (r.status === 'ABSENT') s.absent++;
      else if (r.status === 'HALF_DAY') s.halfDay++;
      s.totalHours += r.workHours || 0;
    });

    res.json(Object.values(byEmployee));
  } catch (err) {
    next(err);
  }
});

export default router;
