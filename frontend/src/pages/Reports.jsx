import { useEffect, useState } from 'react';
import api from '../api/axios.js';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const monthName = (m) => new Date(2000, m - 1).toLocaleString(undefined, { month: 'long' });
const currentYM = () => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

export default function Reports() {
  const [tab, setTab] = useState('attendance');
  const [ym, setYm] = useState(currentYM());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/reports/${tab}`, { params: ym });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, ym.month, ym.year]);

  const tabs = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'leave', label: 'Leave' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'headcount', label: 'Headcount' },
  ];

  return (
    <div>
      <div className="page-head">
        <div><h2>Reports</h2><p>Workforce analytics and compliance summaries</p></div>
        <div className="row">
          <select value={ym.month} onChange={(e) => setYm({ ...ym, month: Number(e.target.value) })} disabled={tab === 'headcount'} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}
          </select>
          <select value={ym.year} onChange={(e) => setYm({ ...ym, year: Number(e.target.value) })} disabled={tab === 'headcount'} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
            {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="auth-tabs" style={{ maxWidth: 560, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="empty">Loading report…</div>}

      {!loading && data && tab === 'attendance' && (
        <>
          <div className="grid grid-cols-4 mb">
            {[['PRESENT', data.summary.PRESENT, 'badge-green'], ['ABSENT', data.summary.ABSENT, 'badge-red'], ['HALF DAY', data.summary.HALF_DAY || 0, 'badge-amber'], ['TOTAL HOURS', `${data.summary.totalHours}h`, 'badge-blue']].map(([l, v, c]) => (
              <div className="card" key={l}><h3>{l}</h3><div className="stat-value" style={{ fontSize: 24 }}>{v}</div><div className="stat-sub">{data.summary.records} records</div></div>
            ))}
          </div>
          <div className="card"><div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Employee</th><th>In</th><th>Out</th><th>Hours</th><th>Status</th></tr></thead>
            <tbody>
              {data.records.map((r) => (
                <tr key={r._id}>
                  <td>{r.date}</td>
                  <td>{r.employee?.user?.name || '—'} <span className="muted">({r.employee?.employeeId})</span></td>
                  <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{r.workHours || '—'}</td>
                  <td><span className={`badge ${r.status === 'PRESENT' ? 'badge-green' : r.status === 'ABSENT' ? 'badge-red' : 'badge-amber'}`}>{r.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
              {!data.records.length && <tr><td colSpan="6" className="empty">No records for this month</td></tr>}
            </tbody>
          </table></div></div>
        </>
      )}

      {!loading && data && tab === 'leave' && (
        <>
          <div className="grid grid-cols-4 mb">
            {Object.entries(data.byStatus).map(([s, v]) => (
              <div className="card" key={s}><h3>{s}</h3><div className="stat-value" style={{ fontSize: 24 }}>{v}</div></div>
            ))}
          </div>
          <div className="card"><div className="table-wrap"><table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
            <tbody>
              {data.leaves.map((l) => (
                <tr key={l._id}>
                  <td>{l.employee?.user?.name || '—'}</td>
                  <td>{l.type}</td>
                  <td>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</td>
                  <td>{l.days}</td>
                  <td><span className={`badge ${l.status === 'APPROVED' ? 'badge-green' : l.status === 'REJECTED' ? 'badge-red' : 'badge-amber'}`}>{l.status}</span></td>
                </tr>
              ))}
              {!data.leaves.length && <tr><td colSpan="5" className="empty">No leave overlapping this month</td></tr>}
            </tbody>
          </table></div></div>
        </>
      )}

      {!loading && data && tab === 'payroll' && (
        <>
          <div className="grid grid-cols-4 mb">
            {[['GROSS', data.totals.gross], ['DEDUCTIONS', data.totals.deductions], ['NET PAYROLL', data.totals.net], ['PAID', data.totals.paid]].map(([l, v]) => (
              <div className="card" key={l}><h3>{l}</h3><div className="stat-value" style={{ fontSize: 22 }}>{fmt(v)}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-2">
            <div className="card"><h3>By Department</h3>
              {Object.entries(data.byDepartment).map(([d, v]) => (
                <div className="bar-row" key={d}><span style={{ width: 120 }}>{d}</span><div className="bar-track"><div className="bar-fill" style={{ width: '100%' }} /></div><span className="muted">{v.count} · {fmt(v.net)}</span></div>
              ))}
              {!Object.keys(data.byDepartment).length && <div className="empty">No payroll</div>}
            </div>
            <div className="card"><div className="table-wrap"><table>
              <thead><tr><th>Employee</th><th>Dept</th><th>Net</th><th>Status</th></tr></thead>
              <tbody>
                {data.payrolls.slice(0, 15).map((p) => (
                  <tr key={p._id}>
                    <td>{p.employee?.user?.name || '—'}</td>
                    <td className="muted">{p.employee?.department}</td>
                    <td>{fmt(p.netSalary)}</td>
                    <td><span className={`badge ${p.status === 'PAID' ? 'badge-green' : 'badge-amber'}`}>{p.status}</span></td>
                  </tr>
                ))}
                {!data.payrolls.length && <tr><td colSpan="4" className="empty">No payroll for this month</td></tr>}
              </tbody>
            </table></div></div>
          </div>
        </>
      )}

      {!loading && data && tab === 'headcount' && (
        <div className="grid grid-cols-2">
          <div className="card"><h3>By Department</h3>
            <table><thead><tr><th>Department</th><th>Total</th><th>Active</th></tr></thead>
            <tbody>
              {data.byDepartment.map((d) => <tr key={d._id}><td>{d._id}</td><td>{d.total}</td><td>{d.active}</td></tr>)}
            </tbody></table>
          </div>
          <div className="card"><h3>By Status</h3>
            <table><thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {data.byStatus.map((s) => <tr key={s._id}><td>{s._id}</td><td>{s.count}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
