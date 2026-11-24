import { Router } from 'express';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { protect, signToken } from '../middleware/auth.js';

const router = Router();

const sendAuth = (res, user) => {
  res.json({ token: signToken(user), user });
};

// Public self-registration (always EMPLOYEE role)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, employeeId, department, designation, joiningDate, basicSalary, allowances } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'EMPLOYEE' });

    if (employeeId && basicSalary) {
      await Employee.create({
        user: user._id,
        employeeId,
        department: department || 'General',
        designation: designation || 'Staff',
        joiningDate: joiningDate || new Date(),
        basicSalary: Number(basicSalary) || 0,
        allowances: allowances || {},
      });
      user.employee = (await Employee.findOne({ user: user._id }))._id;
      await user.save();
    }

    sendAuth(res, user);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() }).populate('employee');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });

    sendAuth(res, user);
  } catch (err) {
    next(err);
  }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('employee');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
