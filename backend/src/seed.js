import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Employee from './models/Employee.js';

const seed = async () => {
  await connectDB();

  const existing = await User.findOne({ email: 'admin@payroll.com' });
  if (existing) {
    console.log('Seed data already exists. Skipping.');
    process.exit(0);
  }

  // Admin
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@payroll.com',
    password: 'admin123',
    role: 'ADMIN',
  });

  // HR user + employee profile
  const hrUser = await User.create({
    name: 'Priya Sharma',
    email: 'hr@payroll.com',
    password: 'hr1234',
    role: 'HR',
  });
  const hrEmp = await Employee.create({
    user: hrUser._id,
    employeeId: 'EMP-0001',
    department: 'Human Resources',
    designation: 'HR Manager',
    joiningDate: new Date('2023-01-15'),
    basicSalary: 60000,
    allowances: { hra: 20000, da: 5000, ta: 3000, other: 2000 },
  });
  hrUser.employee = hrEmp._id;
  await hrUser.save();

  // Sample employees
  const samples = [
    { name: 'Rahul Verma', email: 'rahul@payroll.com', emp: { employeeId: 'EMP-1001', department: 'Engineering', designation: 'Senior Developer', basicSalary: 95000, allowances: { hra: 30000, da: 8000, ta: 4000, other: 5000 } } },
    { name: 'Sneha Patel', email: 'sneha@payroll.com', emp: { employeeId: 'EMP-1002', department: 'Engineering', designation: 'Developer', basicSalary: 70000, allowances: { hra: 22000, da: 6000, ta: 3000, other: 2000 } } },
    { name: 'Amit Singh', email: 'amit@payroll.com', emp: { employeeId: 'EMP-1003', department: 'Sales', designation: 'Sales Executive', basicSalary: 55000, allowances: { hra: 18000, da: 5000, ta: 4000, other: 1000 } } },
    { name: 'Kavita Reddy', email: 'kavita@payroll.com', emp: { employeeId: 'EMP-1004', department: 'Marketing', designation: 'Marketing Lead', basicSalary: 80000, allowances: { hra: 26000, da: 7000, ta: 3000, other: 3000 } } },
    { name: 'Vikram Joshi', email: 'vikram@payroll.com', emp: { employeeId: 'EMP-1005', department: 'Finance', designation: 'Accountant', basicSalary: 65000, allowances: { hra: 20000, da: 5000, ta: 2000, other: 2000 } } },
  ];

  for (const s of samples) {
    const u = await User.create({ name: s.name, email: s.email, password: 'employee123', role: 'EMPLOYEE' });
    const e = await Employee.create({
      user: u._id,
      employeeId: s.emp.employeeId,
      department: s.emp.department,
      designation: s.emp.designation,
      joiningDate: new Date('2024-06-01'),
      basicSalary: s.emp.basicSalary,
      allowances: s.emp.allowances,
    });
    u.employee = e._id;
    await u.save();
  }

  console.log('Seed complete.');
  console.log('Admin: admin@payroll.com / admin123');
  console.log('HR:    hr@payroll.com / hr1234');
  console.log('Employee: rahul@payroll.com / employee123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
