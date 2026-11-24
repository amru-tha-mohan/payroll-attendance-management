import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletCards } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', employeeId: '', department: '', designation: '', basicSalary: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-mark"><WalletCards size={24} /></div>
          <div>
            <h1>PayFlow</h1>
            <p>Payroll & Attendance Management</p>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="field"><label>Full Name</label><input value={form.name} onChange={set('name')} required /></div>
              <div className="form-grid">
                <div className="field"><label>Employee ID</label><input value={form.employeeId} onChange={set('employeeId')} placeholder="EMP-1001" /></div>
                <div className="field"><label>Department</label><input value={form.department} onChange={set('department')} placeholder="Engineering" /></div>
                <div className="field"><label>Designation</label><input value={form.designation} onChange={set('designation')} placeholder="Developer" /></div>
                <div className="field"><label>Basic Salary</label><input type="number" value={form.basicSalary} onChange={set('basicSalary')} placeholder="50000" /></div>
              </div>
            </>
          )}
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="field"><label>Password</label><input type="password" value={form.password} onChange={set('password')} required minLength={6} /></div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
        </form>

        <div className="demo-creds">
          <b>Demo accounts</b><br />
          Admin — admin@payroll.com / admin123<br />
          HR — hr@payroll.com / hr1234<br />
          Employee — rahul@payroll.com / employee123
        </div>
      </div>
    </div>
  );
}
