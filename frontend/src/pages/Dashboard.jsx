import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CalendarCheck, Clock, Wallet, FileWarning, TrendingUp, IndianRupee } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card">
    <div className="row spread">
      <div>
        <h3>{label}</h3>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      <div className="stat-icon" style={{ background: `${color}22`, color }}><Icon size={20} /></div>
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch((e) => setErr(e.response?.data?.message || 'Failed to load'));
  }, []);

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!stats) return <div className="empty">Loading dashboard…</div>;

  if (stats.role === 'EMPLOYEE') {
    const t = stats.todayAttendance;
    return (
      <div>
        <div className="page-head"><div><h2>Welcome, {user.name}</h2><p>Your attendance, leave and payslip overview</p></div></div>
        <div className="grid grid-cols-4 mb">
          <StatCard icon={CalendarCheck} label="Today's Status" value={t ? (t.checkOut ? 'Checked Out' : 'Present') : 'Not Checked In'} sub={t?.checkIn ? `In: ${new Date(t.checkIn).toLocaleTimeString()}` : 'Use Attendance page to check in'} color="#22c55e" />
          <StatCard icon={FileWarning} label="Pending Leaves" value={stats.pendingLeaves} sub={`${stats.approvedLeaves} approved`} color="#f59e0b" />
          <StatCard icon={Wallet} label="Payslips" value={stats.payslips} sub={stats.lastPayrollMonth ? `Last: ${stats.lastPayrollMonth}` : 'None yet'} color="#6366f1" />
          <StatCard icon={IndianRupee} label="Last Net Salary" value={fmt(stats.lastNetSalary)} color="#8b5cf6" />
        </div>
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="row mt" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" to="/attendance">Go to Attendance</Link>
            <Link className="btn btn-secondary" to="/leaves">Apply for Leave</Link>
            <Link className="btn btn-secondary" to="/payroll">View Payslips</Link>
          </div>
        </div>
      </div>
    );
  }

  const maxDept = Math.max(...(stats.departments || [{ count: 1 }]).map((d) => d.count), 1);

  return (
    <div>
      <div className="page-head">
        <div><h2>Admin Dashboard</h2><p>Workforce, attendance and payroll overview — {stats.currentMonth}</p></div>
      </div>
      <div className="grid grid-cols-4 mb">
        <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} sub={`${stats.activeEmployees} active`} color="#6366f1" />
        <StatCard icon={UserCheck} label="Present Today" value={stats.presentToday} color="#22c55e" />
        <StatCard icon={FileWarning} label="Pending Leaves" value={stats.pendingLeaves} sub={`${stats.totalLeaves} total requests`} color="#f59e0b" />
        <StatCard icon={Wallet} label="Payroll This Month" value={stats.payrollThisMonth} sub={`${stats.paidThisMonth} paid`} color="#8b5cf6" />
      </div>
      <div className="grid grid-cols-2">
        <div className="card">
          <h3>Payroll Summary ({stats.currentMonth})</h3>
          <div className="stat-value" style={{ fontSize: 24 }}>{fmt(stats.monthlyNetSalary)}</div>
          <div className="stat-sub">Net payout · Gross {fmt(stats.monthlyGrossSalary)}</div>
          <div className="row mt" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary btn-sm" to="/payroll">Manage Payroll</Link>
            <Link className="btn btn-secondary btn-sm" to="/reports">Reports</Link>
          </div>
        </div>
        <div className="card">
          <h3>Employees by Department</h3>
          {stats.departments?.length ? stats.departments.map((d) => (
            <div className="bar-row" key={d._id}>
              <span style={{ width: 110, flexShrink: 0 }}>{d._id}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.count / maxDept) * 100}%` }} /></div>
              <span className="muted">{d.count}</span>
            </div>
          )) : <div className="empty">No data</div>}
        </div>
      </div>
      <div className="card mt">
        <h3>Top Payslips This Month</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Net Salary</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recentPayrolls?.map((p) => (
                <tr key={p._id}>
                  <td>{p.employee?.user?.name || '—'}</td>
                  <td>{p.employee?.department || '—'}</td>
                  <td>{fmt(p.netSalary)}</td>
                  <td><span className={`badge ${p.status === 'PAID' ? 'badge-green' : 'badge-amber'}`}>{p.status}</span></td>
                </tr>
              ))}
              {!stats.recentPayrolls?.length && <tr><td colSpan="4" className="empty">No payroll generated for this month yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
