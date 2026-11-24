// Smoke test: boots the Express app against an in-memory MongoDB and
// exercises auth, employees, attendance, leaves, payroll and reports.
// Run: node scripts/smoke-test.mjs
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri('payroll-test');
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '5055';

const { default: app } = await import('../src/index.js').catch(() => ({}));

// index.js starts listening itself; wait for it
await new Promise((r) => setTimeout(r, 2500));

const base = 'http://localhost:5055/api';
let passed = 0, failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  PASS ${name}`); }
  else { failed++; console.log(`  FAIL ${name} ${extra}`); }
};

const req = async (method, path, body, token) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();

console.log('== Auth ==');
let r = await req('GET', '/health');
check('health', r.status === 200);

// create admin directly in DB
const { default: User } = await import('../src/models/User.js');
const { default: Employee } = await import('../src/models/Employee.js');
await User.create({ name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'ADMIN' });

r = await req('POST', '/auth/login', { email: 'admin@test.com', password: 'admin123' });
check('admin login', r.status === 200 && r.data.token);
const adminToken = r.data?.token;

r = await req('POST', '/auth/login', { email: 'admin@test.com', password: 'wrong' });
check('bad login rejected', r.status === 401);

console.log('== Employees ==');
r = await req('POST', '/employees', {
  name: 'Test Employee', email: 'emp@test.com', password: 'emp123',
  employeeId: 'EMP-T1', department: 'Engineering', designation: 'Dev',
  basicSalary: 50000, allowances: { hra: 10000, da: 2000 },
}, adminToken);
check('create employee', r.status === 201, JSON.stringify(r.data));

r = await req('GET', '/employees', null, adminToken);
check('list employees', r.status === 200 && r.data.length === 1);

console.log('== Attendance ==');
r = await req('POST', '/auth/login', { email: 'emp@test.com', password: 'emp123' });
check('employee login', r.status === 200);
const empToken = r.data?.token;

r = await req('POST', '/attendance/check-in', {}, empToken);
check('check-in', r.status === 201);
r = await req('POST', '/attendance/check-in', {}, empToken);
check('double check-in rejected', r.status === 400);
r = await req('POST', '/attendance/check-out', {}, empToken);
check('check-out', r.status === 200 && r.data.workHours >= 0);

r = await req('GET', '/attendance', null, adminToken);
check('admin lists attendance', r.status === 200 && r.data.length === 1);

console.log('== Leaves ==');
r = await req('POST', '/leaves', { type: 'CASUAL', startDate: '2026-11-20', endDate: '2026-11-21', reason: 'test' }, empToken);
check('apply leave', r.status === 201 && r.data.days === 2);
const leaveId = r.data?._id;

r = await req('GET', '/leaves', null, adminToken);
check('admin lists leaves', r.status === 200 && r.data.length === 1);

r = await req('PATCH', `/leaves/${leaveId}/approve`, {}, adminToken);
check('approve leave', r.status === 200 && r.data.status === 'APPROVED');

console.log('== Payroll ==');
r = await req('POST', '/payroll/generate', { month, year }, adminToken);
check('generate payroll', r.status === 201 && r.data.created === 1, JSON.stringify(r.data));

r = await req('GET', `/payroll?month=${month}&year=${year}`, null, adminToken);
check('list payroll', r.status === 200 && r.data.length === 1);
const payslipId = r.data?.[0]?._id;
check('payslip math', r.data?.[0]?.netSalary === r.data?.[0]?.grossSalary - r.data?.[0]?.totalDeductions);

r = await req('PATCH', `/payroll/${payslipId}/pay`, {}, adminToken);
check('mark paid', r.status === 200 && r.data.status === 'PAID');

r = await req('GET', '/payroll/mine', null, empToken);
check('employee sees payslip', r.status === 200 && r.data.length === 1);

console.log('== Dashboard & Reports ==');
r = await req('GET', '/dashboard/stats', null, adminToken);
check('admin stats', r.status === 200 && r.data.totalEmployees === 1);
r = await req('GET', '/dashboard/stats', null, empToken);
check('employee stats', r.status === 200 && r.data.role === 'EMPLOYEE');

r = await req('GET', `/reports/payroll?month=${month}&year=${year}`, null, adminToken);
check('payroll report', r.status === 200 && r.data.totals.net > 0);
r = await req('GET', `/reports/attendance?month=${month}&year=${year}`, null, adminToken);
check('attendance report', r.status === 200);
r = await req('GET', '/reports/headcount', null, adminToken);
check('headcount report', r.status === 200);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
