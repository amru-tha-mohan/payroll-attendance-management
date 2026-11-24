// Dev server backed by an in-memory MongoDB — no Atlas credentials needed.
// Data is wiped when the process stops. For persistent data use `npm run dev` with MONGO_URI set.
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('payroll-dev');
console.log('In-memory MongoDB running at', mongod.getUri('payroll-dev'));

await import('../src/index.js');

// Seed demo accounts once the app is up
const { default: User } = await import('../src/models/User.js');
const { default: Employee } = await import('../src/models/Employee.js');

if (!(await User.findOne({ email: 'admin@payroll.com' }))) {
try {
  await User.create({ name: 'System Admin', email: 'admin@payroll.com', password: 'admin123', role: 'ADMIN' });
  const hr = await User.create({ name: 'Priya Sharma', email: 'hr@payroll.com', password: 'hr1234', role: 'HR' });
  const hrEmp = await Employee.create({
    user: hr._id, employeeId: 'EMP-0001', department: 'Human Resources',
    designation: 'HR Manager', joiningDate: new Date('2023-01-15'),
    basicSalary: 60000, allowances: { hra: 20000, da: 5000, ta: 3000, other: 2000 },
  });
  hr.employee = hrEmp._id;
  await hr.save();
  const samples = [
    ['Rahul Verma', 'rahul@payroll.com', 'EMP-1001', 'Engineering', 'Senior Developer', 95000, { hra: 30000, da: 8000, ta: 4000, other: 5000 }],
    ['Sneha Patel', 'sneha@payroll.com', 'EMP-1002', 'Engineering', 'Developer', 70000, { hra: 22000, da: 6000, ta: 3000, other: 2000 }],
    ['Amit Singh', 'amit@payroll.com', 'EMP-1003', 'Sales', 'Sales Executive', 55000, { hra: 18000, da: 5000, ta: 4000, other: 1000 }],
  ];
  for (const [name, email, employeeId, department, designation, basicSalary, allowances] of samples) {
    const u = await User.create({ name, email, password: 'employee123', role: 'EMPLOYEE' });
    const e = await Employee.create({ user: u._id, employeeId, department, designation, joiningDate: new Date('2024-06-01'), basicSalary, allowances });
    u.employee = e._id;
    await u.save();
  }
  console.log('Demo data seeded (admin@payroll.com / admin123, hr@payroll.com / hr1234, employees / employee123)');
} catch (err) {
  console.error('Seeding failed:', err.message);
}
}
