import { useEffect, useState } from 'react';
import { Plus, Pencil, Power, Trash2, Search } from 'lucide-react';
import api from '../api/axios.js';

const emptyForm = {
  name: '', email: '', password: '', role: 'EMPLOYEE',
  employeeId: '', department: '', designation: '', joiningDate: '',
  basicSalary: '', hra: 0, da: 0, ta: 0, other: 0, status: 'ACTIVE',
};

const statusBadge = (s) =>
  s === 'ACTIVE' ? 'badge-green' : s === 'INACTIVE' ? 'badge-amber' : 'badge-red';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: '', status: '' });
  const [modal, setModal] = useState(null); // null | 'create' | employee obj
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const res = await api.get('/employees', { params });
    setEmployees(res.data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters.department, filters.status]);
  useEffect(() => {
    api.get('/employees/departments').then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create'); };
  const openEdit = (e) => {
    setForm({
      name: e.user?.name || '', email: e.user?.email || '', password: '',
      role: e.user?.role || 'EMPLOYEE',
      employeeId: e.employeeId, department: e.department, designation: e.designation,
      joiningDate: e.joiningDate ? e.joiningDate.slice(0, 10) : '',
      basicSalary: e.basicSalary,
      hra: e.allowances?.hra || 0, da: e.allowances?.da || 0,
      ta: e.allowances?.ta || 0, other: e.allowances?.other || 0,
      status: e.status,
    });
    setError('');
    setModal(e);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name, email: form.email,
        role: form.role,
        employeeId: form.employeeId,
        department: form.department,
        designation: form.designation,
        joiningDate: form.joiningDate,
        basicSalary: Number(form.basicSalary) || 0,
        allowances: { hra: Number(form.hra) || 0, da: Number(form.da) || 0, ta: Number(form.ta) || 0, other: Number(form.other) || 0 },
        status: form.status,
      };
      if (modal === 'create') {
        payload.password = form.password;
        await api.post('/employees', payload);
        setMsg('Employee created');
      } else {
        payload.user = { name: form.name, email: form.email, role: form.role };
        await api.put(`/employees/${modal._id}`, payload);
        setMsg('Employee updated');
      }
      setModal(null);
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (e) => {
    const next = e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await api.patch(`/employees/${e._id}/status`, { status: next });
    load();
  };

  const remove = async (e) => {
    if (!window.confirm(`Deactivate ${e.user?.name}?`)) return;
    await api.delete(`/employees/${e._id}`);
    load();
  };

  const filtered = employees.filter((e) =>
    !filters.search ||
    e.user?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(filters.search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div>
      <div className="page-head">
        <div><h2>Employees</h2><p>Manage employee profiles, roles and compensation</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Employee</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card mb">
        <div className="toolbar">
          <div className="field" style={{ flex: 1, minWidth: 200 }}>
            <label>Search</label>
            <div className="row">
              <Search size={16} className="muted" />
              <input placeholder="Name, ID or designation…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
          </div>
          <div className="field"><label>Department</label>
            <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
              <option value="">All</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              <option>ACTIVE</option><option>INACTIVE</option><option>TERMINATED</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>ID</th><th>Department</th><th>Designation</th><th>Joined</th><th>Basic Salary</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e._id}>
                  <td>
                    <div className="row">
                      <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{e.user?.name?.[0]}</div>
                      <div><div style={{ fontWeight: 600 }}>{e.user?.name}</div><div className="muted" style={{ fontSize: 11 }}>{e.user?.email}</div></div>
                    </div>
                  </td>
                  <td className="muted">{e.employeeId}</td>
                  <td>{e.department}</td>
                  <td>{e.designation}</td>
                  <td className="muted">{e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : '—'}</td>
                  <td>₹{e.basicSalary?.toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${statusBadge(e.status)}`}>{e.status}</span></td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(e)} title="Edit"><Pencil size={13} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleStatus(e)} title="Toggle status"><Power size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(e)} title="Deactivate"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="8" className="empty">No employees found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'create' ? 'Add Employee' : 'Edit Employee'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field full"><label>Full Name</label><input value={form.name} onChange={set('name')} required /></div>
                <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
                {modal === 'create' && (
                  <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set('password')} required minLength={6} /></div>
                )}
                <div className="field"><label>Role</label>
                  <select value={form.role} onChange={set('role')}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="field"><label>Employee ID</label><input value={form.employeeId} onChange={set('employeeId')} required /></div>
                <div className="field"><label>Department</label><input value={form.department} onChange={set('department')} required /></div>
                <div className="field"><label>Designation</label><input value={form.designation} onChange={set('designation')} required /></div>
                <div className="field"><label>Joining Date</label><input type="date" value={form.joiningDate} onChange={set('joiningDate')} /></div>
                <div className="field"><label>Basic Salary (₹)</label><input type="number" value={form.basicSalary} onChange={set('basicSalary')} required /></div>
                <div className="field"><label>HRA</label><input type="number" value={form.hra} onChange={set('hra')} /></div>
                <div className="field"><label>DA</label><input type="number" value={form.da} onChange={set('da')} /></div>
                <div className="field"><label>TA</label><input type="number" value={form.ta} onChange={set('ta')} /></div>
                <div className="field"><label>Other Allowance</label><input type="number" value={form.other} onChange={set('other')} /></div>
                {modal !== 'create' && (
                  <div className="field"><label>Status</label>
                    <select value={form.status} onChange={set('status')}>
                      <option>ACTIVE</option><option>INACTIVE</option><option>TERMINATED</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={loading} style={{ width: 'auto' }}>{loading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
