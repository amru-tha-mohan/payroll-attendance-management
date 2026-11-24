import { Router } from 'express';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

const todayStr = () => new Date().toISOString().slice(0, 10);

router.get('/stats', async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'EMPLOYEE') {
      const employee = await Employee.findOne({ user: user._id });
      if (!employee) return res.json({ role: 'EMPLOYEE' });

      const today = await Attendance.findOne({ employee: employee._id, date: todayStr() });
      const pendingLeaves = await Leave.countDocuments({ employee: employee._id, status: 'PENDING' });
      const approvedLeaves = await Leave.countDocuments({ employee: employee._id, status: 'APPROVED' });
      const payslips = await Payroll.countDocuments({ employee: employee._id });
      const lastPayroll = await Payroll.findOne({ employee: employee._id }).sort({ year: -1, month: -1 });

      return res.json({
        role: 'EMPLOYEE',
        todayAttendance: today,
        pendingLeaves,
        approvedLeaves,
        payslips,
        lastNetSalary: lastPayroll?.netSalary || null,
        lastPayrollMonth: lastPayroll ? `${lastPayroll.month}/${lastPayroll.year}` : null,
      });
    }

    // ADMIN / HR stats
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    const [totalEmployees, activeEmployees, presentToday, pendingLeaves, totalLeaves, payrollCount, paidPayrolls, monthlyPayrollAgg] =
      await Promise.all([
        Employee.countDocuments(),
        Employee.countDocuments({ status: 'ACTIVE' }),
        Attendance.countDocuments({ date: todayStr(), status: 'PRESENT' }),
        Leave.countDocuments({ status: 'PENDING' }),
        Leave.countDocuments(),
        Payroll.countDocuments({ month, year }),
        Payroll.countDocuments({ month, year, status: 'PAID' }),
        Payroll.aggregate([
          { $match: { month, year } },
          { $group: { _id: null, net: { $sum: '$netSalary' }, gross: { $sum: '$grossSalary' } } },
        ]),
      ]);

    const departments = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const recentPayrolls = await Payroll.find({ month, year })
      .populate({ path: 'employee', populate: { path: 'user', select: 'name' } })
      .sort({ netSalary: -1 })
      .limit(5);

    res.json({
      role: user.role,
      totalEmployees,
      activeEmployees,
      presentToday,
      pendingLeaves,
      totalLeaves,
      payrollThisMonth: payrollCount,
      paidThisMonth: paidPayrolls,
      monthlyNetSalary: monthlyPayrollAgg[0]?.net || 0,
      monthlyGrossSalary: monthlyPayrollAgg[0]?.gross || 0,
      departments,
      recentPayrolls,
      currentMonth: `${month}/${year}`,
    });
  } catch (err) {
    next(err);
  }
});

// HR/Admin: user management list
router.get('/users', async (req, res, next) => {
  try {
    if (req.user.role === 'EMPLOYEE') return res.status(403).json({ message: 'Access denied' });
    const users = await User.find().populate('employee', 'employeeId department designation').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
