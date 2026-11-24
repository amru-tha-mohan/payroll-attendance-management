import { useEffect, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

const statusBadge = (s) => (s === 'APPROVED' ? 'badge-green' : s === 'REJECTED' ? 'badge-red' : 'badge-amber');
const typeBadge = (t) => ({ CASUAL: 'badge-blue', SICK: 'badge-red', EARNED: 'badge-purple', UNPAID: 'badge-gray' }[t] || 'badge-gray');

export default function Leaves() {
  const { isHR } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ type: 'CASUAL', startDate: '', endDate: '', reason: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const url = isHR ? '/leaves' : '/leaves/mine';
      const res = await api.get(url, { params: isHR && statusFilter ? { status: statusFilter } : {} });
      setLeaves(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load leaves');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, isHR]);

  const apply = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/leaves', form);
      setModal(false);
      setForm({ type: 'CASUAL', startDate: '', endDate: '', reason: '' });
      setMsg('Leave request submitted');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    }
  };

  const act = async (id, action) => {
    try {
      await api.patch(`/leaves/${id}/${action}`, {});
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>Leave Management</h2><p>{isHR ? 'Review and approve leave requests' : 'Apply for leave and track requests'}</p></div>
        <div className="row">
          {isHR && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
              <option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option>
            </select>
          )}
          {!isHR && <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Apply Leave</button>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {isHR && <th>Employee</th>}
                <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>{isHR && <th></th>}
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  {isHR && <td>{l.employee?.user?.name || '—'}<div className="muted" style={{ fontSize: 11 }}>{l.employee?.department}</div></td>}
                  <td><span className={`badge ${typeBadge(l.type)}`}>{l.type}</span></td>
                  <td>{new Date(l.startDate).toLocaleDateString()}</td>
                  <td>{new Date(l.endDate).toLocaleDateString()}</td>
                  <td>{l.days}</td>
                  <td className="muted" style={{ maxWidth: 220 }}>{l.reason || '—'}</td>
                  <td><span className={`badge ${statusBadge(l.status)}`}>{l.status}</span></td>
                  {isHR && (
                    <td>
                      {l.status === 'PENDING' && (
                        <div className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-success btn-sm" onClick={() => act(l._id, 'approve')} title="Approve"><Check size={14} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => act(l._id, 'reject')} title="Reject"><X size={14} /></button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!leaves.length && <tr><td colSpan={isHR ? 8 : 7} className="empty">No leave requests</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Apply for Leave</h3>
            <form onSubmit={apply}>
              <div className="form-grid">
                <div className="field"><label>Leave Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>CASUAL</option><option>SICK</option><option>EARNED</option><option>UNPAID</option>
                  </select>
                </div>
                <div className="field"><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional" /></div>
                <div className="field"><label>Start Date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
                <div className="field"><label>End Date</label><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ width: 'auto' }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
