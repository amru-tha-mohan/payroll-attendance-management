import { useEffect, useState } from 'react';
import { LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const todayStr = () => new Date().toISOString().slice(0, 10);
const statusBadge = (s) => (s === 'PRESENT' ? 'badge-green' : s === 'ABSENT' ? 'badge-red' : 'badge-amber');
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Attendance() {
  const { user, isHR } = useAuth();
  const [records, setRecords] = useState([]);
  const [today, setToday] = useState(null);
  const [filters, setFilters] = useState({ date: '', month: '', year: '', status: '', employeeId: '' });
  const [employees, setEmployees] = useState([]);
  const [markModal, setMarkModal] = useState(false);
  const [markForm, setMarkForm] = useState({ employeeId: '', date: todayStr(), checkIn: '', checkOut: '', status: 'PRESENT', remarks: '' });
  const [clock, setClock] = useState(nowTime());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = setInterval(() => setClock(nowTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      if (isHR) {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
        const res = await api.get('/attendance', { params });
        setRecords(res.data);
      } else {
        const [mine, tdy] = await Promise.all([api.get('/attendance/mine'), api.get('/attendance/today')]);
        setRecords(mine.data);
        setToday(tdy.data);
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load attendance');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.date, filters.month, filters.year, filters.status, filters.employeeId, isHR]);
  useEffect(() => {
    if (isHR) api.get('/employees').then((r) => setEmployees(r.data)).catch(() => {});
  }, [isHR]);

  const checkIn = async () => {
    setError('');
    try {
      await api.post('/attendance/check-in');
      setMsg('Checked in successfully');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setError(e.response?.data?.message || 'Check-in failed'); }
  };

  const checkOut = async () => {
    setError('');
    try {
      await api.post('/attendance/check-out');
      setMsg('Checked out successfully');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setError(e.response?.data?.message || 'Check-out failed'); }
  };

  const submitMark = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/mark', {
        ...markForm,
        checkIn: markForm.checkIn ? new Date(markForm.checkIn).toISOString() : null,
        checkOut: markForm.checkOut ? new Date(markForm.checkOut).toISOString() : null,
      });
      setMarkModal(false);
      setMsg('Attendance saved');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Attendance</h2><p>{isHR ? 'Monitor and manage employee attendance' : 'Check in/out and view your records'}</p></div>
        {isHR && <button className="btn btn-primary" onClick={() => { setMarkForm({ employeeId: '', date: todayStr(), checkIn: '', checkOut: '', status: 'PRESENT', remarks: '' }); setMarkModal(true); }}>Mark Attendance</button>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {!isHR && (
        <div className="card checkin-card mb">
          <div className="pulse-dot" />
          <div style={{ flex: 1 }}>
            <div className="muted" style={{ fontSize: 12 }}>Current time</div>
            <div className="checkin-time">{clock}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {today?.checkIn ? `Checked in at ${new Date(today.checkIn).toLocaleTimeString()}` : 'Not checked in today'}
              {today?.checkOut ? ` · out at ${new Date(today.checkOut).toLocaleTimeString()} (${today.workHours}h)` : ''}
            </div>
          </div>
          {!today?.checkIn ? (
            <button className="btn btn-primary" onClick={checkIn}><LogIn size={16} /> Check In</button>
          ) : !today?.checkOut ? (
            <button className="btn btn-danger" onClick={checkOut}><LogOut size={16} /> Check Out</button>
          ) : (
            <span className="badge badge-green"><CheckCircle2 size={13} style={{ marginRight: 5 }} />Done for today</span>
          )}
        </div>
      )}

      {isHR && (
        <div className="card mb">
          <div className="toolbar">
            <div className="field"><label>Date</label><input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value, month: '', year: '' })} /></div>
            <div className="field"><label>Month</label>
              <select value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString(undefined, { month: 'long' })}</option>)}
              </select>
            </div>
            <div className="field"><label>Year</label>
              <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                <option value="">All</option>
                {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="field"><label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All</option><option>PRESENT</option><option>ABSENT</option><option>HALF_DAY</option>
              </select>
            </div>
            <div className="field"><label>Employee</label>
              <select value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}>
                <option value="">All</option>
                {employees.map((e) => <option key={e._id} value={e.employeeId}>{e.user?.name} ({e.employeeId})</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {isHR && <th>Employee</th>}
                <th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>{isHR && <th>Remarks</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  {isHR && <td>{r.employee?.user?.name || '—'} <span className="muted">({r.employee?.employeeId})</span></td>}
                  <td>{r.date}</td>
                  <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>{r.workHours ? `${r.workHours}h` : '—'}</td>
                  <td><span className={`badge ${statusBadge(r.status)}`}>{r.status.replace('_', ' ')}</span></td>
                  {isHR && <td className="muted">{r.remarks || '—'}</td>}
                </tr>
              ))}
              {!records.length && <tr><td colSpan={isHR ? 7 : 6} className="empty">No attendance records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {markModal && (
        <div className="modal-backdrop" onClick={() => setMarkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark Attendance</h3>
            <form onSubmit={submitMark}>
              <div className="form-grid">
                <div className="field full"><label>Employee</label>
                  <select value={markForm.employeeId} onChange={(e) => setMarkForm({ ...markForm, employeeId: e.target.value })} required>
                    <option value="">Select…</option>
                    {employees.filter((e) => e.status === 'ACTIVE').map((e) => <option key={e._id} value={e.employeeId}>{e.user?.name} ({e.employeeId})</option>)}
                  </select>
                </div>
                <div className="field"><label>Date</label><input type="date" value={markForm.date} onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })} required /></div>
                <div className="field"><label>Status</label>
                  <select value={markForm.status} onChange={(e) => setMarkForm({ ...markForm, status: e.target.value })}>
                    <option>PRESENT</option><option>ABSENT</option><option>HALF_DAY</option>
                  </select>
                </div>
                <div className="field"><label>Check In</label><input type="datetime-local" value={markForm.checkIn} onChange={(e) => setMarkForm({ ...markForm, checkIn: e.target.value })} /></div>
                <div className="field"><label>Check Out</label><input type="datetime-local" value={markForm.checkOut} onChange={(e) => setMarkForm({ ...markForm, checkOut: e.target.value })} /></div>
                <div className="field full"><label>Remarks</label><input value={markForm.remarks} onChange={(e) => setMarkForm({ ...markForm, remarks: e.target.value })} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setMarkModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ width: 'auto' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
