import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays, Wallet,
  BarChart3, LogOut, Menu, X, WalletCards,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useState } from 'react';

const navFor = (role) => {
  const base = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/leaves', label: 'Leave', icon: CalendarDays },
    { to: '/payroll', label: 'Payroll & Payslips', icon: Wallet },
  ];
  if (role === 'ADMIN' || role === 'HR') {
    base.splice(1, 0, { to: '/employees', label: 'Employees', icon: Users });
    base.push({ to: '/reports', label: 'Reports', icon: BarChart3 });
  }
  return base;
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = navFor(user?.role);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><WalletCards size={22} /></div>
          <div>
            <div className="brand-name">PayFlow</div>
            <div className="brand-sub">Payroll Suite</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="topbar-title">Payroll & Attendance Management</div>
          <div className="topbar-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
