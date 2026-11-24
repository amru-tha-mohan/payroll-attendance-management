import { Router } from 'express';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const monthRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day
  return { start, end };
};

const weekdaysInMonth = (month, year) => {
  const { start, end } = monthRange(month, year);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

const approvedLeaveDays = async (employeeId, month, year, type = null) => {
  const { start, end } = monthRange(month, year);
  const filter = {
    employee: employeeId,
    status: 'APPROVED',
    startDate: { $lte: end },
    endDate: { $gte: start },
  };
  if (type) filter.type = type;
  const leaves = await Leave.find(filter);
  let days = 0;
  for (const l of leaves) {
    const s = l.startDate > start ? l.startDate : start;
    const e = l.endDate < end ? l.endDate : end;
    days += Math.max(0, Math.round((e - s) / 86400000) + 1);
  }
  return days;
};

const attendanceStats = async (employeeId, month, year) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const records = await Attendance.find({ employee: employeeId, date: { $regex: `^${prefix}` } });
  let present = 0;
  records.forEach((r) => {
    if (r.status === 'PRESENT') present += 1;
    else if (r.status === 'HALF_DAY') present += 0.5;
  });
  return { records, present };
};

// Generate payroll for all active employees for a month/year
router.post('/generate', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const month = parseInt(req.body.month, 10);
    const year = parseInt(req.body.year, 10);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Valid month (1-12) and year are required' });
    }

    const employees = await Employee.find({ status: 'ACTIVE' });
    const results = { created: 0, skipped: 0, errors: [] };

    for (const emp of employees) {
      try {
        const existing = await Payroll.findOne({ employee: emp._id, month, year });
        if (existing) {
          if (existing.status === 'PAID') { results.skipped++; continue; }
          await Payroll.deleteOne({ _id: existing._id }); // regenerate draft
        }

        const workingDays = weekdaysInMonth(month, year);
        const leaveDays = await approvedLeaveDays(emp._id, month, year);
        const unpaidLeaveDays = await approvedLeaveDays(emp._id, month, year, 'UNPAID');
        const { records, present } = await attendanceStats(emp._id, month, year);

        let presentDays, absentDays;
        if (records.length === 0) {
          presentDays = Math.max(0, workingDays - leaveDays);
          absentDays = 0;
        } else {
          presentDays = Math.min(present, workingDays - leaveDays);
          absentDays = Math.max(0, workingDays - leaveDays - presentDays);
        }

        const al = emp.allowances || {};
        const allowanceTotal = (al.hra || 0) + (al.da || 0) + (al.ta || 0) + (al.other || 0);
        const grossSalary = emp.basicSalary + allowanceTotal;
        const dailyRate = workingDays ? emp.basicSalary / workingDays : 0;
        const pf = Math.round(emp.basicSalary * 0.12 * 100) / 100;
        const professionalTax = grossSalary > 10000 ? 200 : 0;
        const unpaidLeave = Math.round(dailyRate * unpaidLeaveDays * 100) / 100;
        const totalDeductions = pf + professionalTax + unpaidLeave;
        const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

        await Payroll.create({
          employee: emp._id,
          month,
          year,
          payslipNumber: `PS-${year}${String(month).padStart(2, '0')}-${emp.employeeId}`,
          basicSalary: emp.basicSalary,
          allowances: al,
          grossSalary,
          deductions: { pf, professionalTax, unpaidLeave, other: 0 },
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          netSalary,
          workingDays,
          presentDays,
          absentDays,
          leaveDays,
          generatedBy: req.user._id,
        });
        results.created++;
      } catch (err) {
        results.errors.push(`${emp.employeeId}: ${err.message}`);
      }
    }

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
});

// HR/Admin: list payroll
router.get('/', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const { month, year, status, employeeId } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month, 10);
    if (year) filter.year = parseInt(year, 10);
    if (status) filter.status = status;
    if (employeeId) {
      const emp = await Employee.findOne({ employeeId }).select('_id');
      if (!emp) return res.json([]);
      filter.employee = emp._id;
    }
    const payrolls = await Payroll.find(filter)
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email' } })
      .sort({ year: -1, month: -1, createdAt: -1 });
    res.json(payrolls);
  } catch (err) {
    next(err);
  }
});

// Employee: own payslips
router.get('/mine', async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id }).select('_id');
    if (!employee) return res.json([]);
    const payrolls = await Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 });
    res.json(payrolls);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({ path: 'employee', populate: { path: 'user', select: 'name email' } });
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

    const isOwner = req.user.role !== 'EMPLOYEE' ||
      payroll.employee?.user?._id?.toString() === req.user._id.toString() ||
      (await Employee.findOne({ user: req.user._id }).select('_id'))._id.toString() === payroll.employee?._id?.toString();
    if (!isOwner) return res.status(403).json({ message: 'Access denied' });

    res.json(payroll);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/pay', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });
    if (payroll.status === 'PAID') return res.status(400).json({ message: 'Already paid' });
    payroll.status = 'PAID';
    payroll.paidAt = new Date();
    await payroll.save();
    res.json(payroll);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorize('ADMIN', 'HR'), async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });
    if (payroll.status === 'PAID') return res.status(400).json({ message: 'Cannot delete a paid payroll' });
    await payroll.deleteOne();
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
