import { Router } from 'express';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('ADMIN', 'HR'));

const populateUser = { path: 'user', select: 'name email role isActive' };

router.get('/', async (req, res, next) => {
  try {
    const { department, status, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      const users = await User.find({ name: new RegExp(search, 'i'), role: 'EMPLOYEE' }).select('_id');
      filter.$or = [
        { user: { $in: users.map((u) => u._id) } },
        { employeeId: new RegExp(search, 'i') },
        { designation: new RegExp(search, 'i') },
      ];
    }
    const employees = await Employee.find(filter).populate(populateUser).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

router.get('/departments', async (req, res, next) => {
  try {
    const depts = await Employee.distinct('department');
    res.json(depts.sort());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(populateUser);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// Create employee: creates linked User + Employee records
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role = 'EMPLOYEE', ...emp } = req.body;
    if (!name || !email || !password || !emp.employeeId || !emp.basicSalary) {
      return res.status(400).json({ message: 'name, email, password, employeeId and basicSalary are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: ['EMPLOYEE', 'HR'].includes(role) ? role : 'EMPLOYEE' });
    const employee = await Employee.create({
      ...emp,
      user: user._id,
      joiningDate: emp.joiningDate || new Date(),
      allowances: emp.allowances || {},
      basicSalary: Number(emp.basicSalary),
    });
    user.employee = employee._id;
    await user.save();

    const populated = await Employee.findById(employee._id).populate(populateUser);
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate employeeId or email' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const { user, ...fields } = req.body;
    Object.assign(employee, fields);
    if (fields.basicSalary !== undefined) employee.basicSalary = Number(fields.basicSalary);
    await employee.save();

    if (user && user.name) {
      await User.findByIdAndUpdate(employee.user, {
        name: user.name,
        email: user.email ? user.email.toLowerCase() : undefined,
        role: user.role,
      });
    }

    const populated = await Employee.findById(employee._id).populate(populateUser);
    res.json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate employeeId or email' });
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    const status = req.body.status;
    employee.status = ['ACTIVE', 'INACTIVE', 'TERMINATED'].includes(status) ? status : employee.status;
    await employee.save();
    await User.findByIdAndUpdate(employee.user, { isActive: employee.status === 'ACTIVE' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    await User.findByIdAndUpdate(employee.user, { isActive: false });
    employee.status = 'TERMINATED';
    await employee.save();
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    next(err);
  }
});

export default router;
