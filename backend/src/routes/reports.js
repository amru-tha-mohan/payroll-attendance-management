import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('ADMIN', 'HR'));

const monthFilter = (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!m || !y) return null;
  return { month: m, year: y, prefix: `${y}-${String(m).padStart(2, '0')}` };
};

// Attendance report for a month
router.get('/attendance', async (req, res, next) => {
  try {
    const mf = monthFilter(req.query.month, req.query.year);
    if (!mf) return res.status(400).json({ message: 'month and year are required' });

    const records = await Attendance.find({ date: { $regex: `^${mf.prefix}` } })
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email' } });

    const summary = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, totalHours: 0, records: records.length };
    records.forEach((r) => {
      summary[r.status] = (summary[r.status] || 0) + 1;
      summary.totalHours += r.workHours || 0;
    });
    summary.totalHours = Math.round(summary.totalHours * 100) / 100;

    res.json({ summary, records });
  } catch (err) {
    next(err);
  }
});

// Leave report for a month
router.get('/leave', async (req, res, next) => {
  try {
    const mf = monthFilter(req.query.month, req.query.year);
    if (!mf) return res.status(400).json({ message: 'month and year are required' });

    const { start, end } = (() => {
      const s = new Date(mf.year, mf.month - 1, 1);
      const e = new Date(mf.year, mf.month, 0);
      return { start: s, end: e };
    })();

    const leaves = await Leave.find({
      startDate: { $lte: end },
      endDate: { $gte: start },
    })
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email department' } })
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    const byType = {};
    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    leaves.forEach((l) => {
      byType[l.type] = (byType[l.type] || 0) + l.days;
      byStatus[l.status]++;
    });

    res.json({ leaves, byType, byStatus });
  } catch (err) {
    next(err);
  }
});

// Payroll report for a month
router.get('/payroll', async (req, res, next) => {
  try {
    const mf = monthFilter(req.query.month, req.query.year);
    if (!mf) return res.status(400).json({ message: 'month and year are required' });

    const payrolls = await Payroll.find({ month: mf.month, year: mf.year })
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email department' } })
      .sort({ netSalary: -1 });

    const totals = payrolls.reduce(
      (acc, p) => ({
        gross: acc.gross + p.grossSalary,
        deductions: acc.deductions + p.totalDeductions,
        net: acc.net + p.netSalary,
        paid: acc.paid + (p.status === 'PAID' ? p.netSalary : 0),
      }),
      { gross: 0, deductions: 0, net: 0, paid: 0 }
    );
    Object.keys(totals).forEach((k) => { totals[k] = Math.round(totals[k] * 100) / 100; });

    const byDepartment = {};
    payrolls.forEach((p) => {
      const dept = p.employee?.department || 'Unknown';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, net: 0 };
      byDepartment[dept].count++;
      byDepartment[dept].net += p.netSalary;
    });
    Object.values(byDepartment).forEach((d) => { d.net = Math.round(d.net * 100) / 100; });

    res.json({ payrolls, totals, byDepartment });
  } catch (err) {
    next(err);
  }
});

// Headcount report
router.get('/headcount', async (req, res, next) => {
  try {
    const byDepartment = await Employee.aggregate([
      { $group: { _id: '$department', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } } } },
      { $sort: { total: -1 } },
    ]);
    const byStatus = await Employee.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ byDepartment, byStatus });
  } catch (err) {
    next(err);
  }
});

export default router;
