import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { signOut } from '@/lib/auth';
import './admin.css';

const navItems = [
  { to: '/admin/revenue', label: '收入總覽' },
  { to: '/admin/calendar', label: '行事曆' },
  { to: '/admin/bookings', label: '預約清單' },
  { to: '/admin/users', label: '使用者' },
  { to: '/admin/keys', label: '鑰匙管理' },
  { to: '/admin/guest-codes', label: '訪客碼' },
  { to: '/admin/notifications', label: '通知設定' },
];

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="admin-shell">
      <div className="top-bar" />
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">藏前</span>
          <span className="admin-brand-text">管理後台</span>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'admin-nav-link active' : 'admin-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/guest/home" className="admin-nav-link admin-preview-link">
            查看房客頁面
          </Link>
        </nav>

        <div className="admin-user-card">
          <div className="admin-user-name">{user?.displayName || user?.email}</div>
          <button type="button" onClick={() => signOut().catch(() => {})} className="admin-signout">
            登出
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
