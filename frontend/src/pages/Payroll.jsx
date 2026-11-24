import { useEffect, useState } from 'react';
import { Play, CheckCircle2, Trash2, Eye, Printer } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const monthName = (m) => new Date(2000, m - 1).toLocaleString(undefined, { month: 'long' });
const statusBadge = (s) => (s === 'PAID' ? 'badge-green' : 'badge-amber');

const PayslipView = ({ p, onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal payslip-print" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3>Payslip — {monthName(p.month)} {p.year}</h3>
        <div className="row">
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} /> Print</button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
      <div style={{ borderBottom: '2px solid #26335c', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>PayFlow Technologies</div>
        <div className="muted" style={{ fontSize: 12 }}>Payroll & Attendance Management · Payslip {p.payslipNumber}</div>
      </div>
      <div className="grid grid-cols-2 mb">
        <div><div className="muted" style={{ fontSize: 11 }}>Employee</div><b>{p.employee?.user?.name}</b><div className="muted" style={{ fontSize: 12 }}>{p.employee?.user?.email} · {p.employee?.employeeId}</div></div>
        <div><div className="muted" style={{ fontSize: 11 }}>Period</div><b>{monthName(p.month)} {p.year}</b><div className="muted" style={{ fontSize: 12 }}>{p.employee?.department} · {p.employee?.designation}</div></div>
      </div>
      <table>
        <thead><tr><th>Earnings</th><th style={{ textAlign: 'right' }}>Amount</th><th>Deductions</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>
          <tr><td>Basic Salary</td><td style={{ textAlign: 'right' }}>{fmt(p.basicSalary)}</td><td>Provident Fund (12%)</td><td style={{ textAlign: 'right' }}>{fmt(p.deductions?.pf)}</td></tr>
          <tr><td>HRA</td><td style={{ textAlign: 'right' }}>{fmt(p.allowances?.hra)}</td><td>Professional Tax</td><td style={{ textAlign: 'right' }}>{fmt(p.deductions?.professionalTax)}</td></tr>
          <tr><td>DA</td><td style={{ textAlign: 'right' }}>{fmt(p.allowances?.da)}</td><td>Unpaid Leave ({p.absentDays}d)</td><td style={{ textAlign: 'right' }}>{fmt(p.deductions?.unpaidLeave)}</td></tr>
          <tr><td>TA</td><td style={{ textAlign: 'right' }}>{fmt(p.allowances?.ta)}</td><td>Other</td><td style={{ textAlign: 'right' }}>{fmt(p.deductions?.other)}</td></tr>
          <tr><td>Other Allowance</td><td style={{ textAlign: 'right' }}>{fmt(p.allowances?.other)}</td><td><b>Total Deductions</b></td><td style={{ textAlign: 'right' }}><b>{fmt(p.totalDeductions)}</b></td></tr>
          <tr><td><b>Gross Salary</b></td><td style={{ textAlign: 'right' }}><b>{fmt(p.grossSalary)}</b></td><td></td><td></td></tr>
        </tbody>
      </table>
      <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(99,102,241,.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="muted" style={{ fontSize: 11 }}>Net Payable</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(p.netSalary)}</div>
        </div>
        <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>
          Working days: {p.workingDays} · Present: {p.presentDays} · Leave: {p.leaveDays}<br />
          Status: <b>{p.status}</b> {p.paidAt ? `· Paid ${new Date(p.paidAt).toLocaleDateString()}` : ''}
        </div>
      </div>
    </div>
  </div>
);

export default function Payroll() {
  const { isHR } = useAuth();
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const url = isHR ? '/payroll' : '/payroll/mine';
      const res = await api.get(url, { params: isHR ? { month, year } : {} });
      setRows(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load payroll');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month, year, isHR]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/payroll/generate', { month, year });
      setMsg(`Generated ${res.data.created} payslips (${res.data.skipped} skipped${res.data.errors?.length ? `, ${res.data.errors.length} errors` : ''})`);
      load();
      setTimeout(() => setMsg(''), 5000);
    } catch (e) {
      setError(e.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const markPaid = async (id) => {
    try {
      await api.patch(`/payroll/${id}/pay`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this draft payroll?')) return;
    try {
      await api.delete(`/payroll/${id}`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed');
    }
  };

  const openPayslip = async (id) => {
    const res = await api.get(`/payroll/${id}`);
    setView(res.data);
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>{isHR ? 'Payroll' : 'My Payslips'}</h2><p>{isHR ? 'Generate and process monthly payroll' : 'View and download your payslips'}</p></div>
        {isHR && (
          <div className="row">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
            <button className="btn btn-primary" onClick={generate} disabled={generating}><Play size={15} /> {generating ? 'Generating…' : 'Generate Payroll'}</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Payslip #</th>{isHR && <th>Employee</th>}<th>Period</th>
                <th>Gross</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p._id}>
                  <td className="muted">{p.payslipNumber}</td>
                  {isHR && <td>{p.employee?.user?.name || '—'} <span className="muted">({p.employee?.employeeId})</span></td>}
                  <td>{monthName(p.month)} {p.year}</td>
                  <td>{fmt(p.grossSalary)}</td>
                  <td>{fmt(p.totalDeductions)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(p.netSalary)}</td>
                  <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openPayslip(p._id)} title="View payslip"><Eye size={13} /></button>
                      {isHR && p.status === 'DRAFT' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => markPaid(p._id)} title="Mark paid"><CheckCircle2 size={13} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(p._id)} title="Delete"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={isHR ? 8 : 7} className="empty">No payroll records{isHR ? ' — click "Generate Payroll"' : ''}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {view && <PayslipView p={view} onClose={() => setView(null)} />}
    </div>
  );
}
