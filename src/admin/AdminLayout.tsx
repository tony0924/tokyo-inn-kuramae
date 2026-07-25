import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { signOut } from '@/lib/auth';
import { PwaStatus } from '@/pwa/PwaStatus';
import { PushForegroundBridge } from '@/pwa/PushForegroundBridge';
import './admin.css';

const navItems = [
  { to: '/admin/today', label: '今日營運' },
  { to: '/admin/revenue', label: '收入總覽' },
  { to: '/admin/calendar', label: '行事曆' },
  { to: '/admin/bookings', label: '預約清單' },
  { to: '/admin/messages', label: '留言板' },
  { to: '/admin/users', label: '使用者' },
  { to: '/admin/keys', label: '鑰匙管理' },
  { to: '/admin/guest-codes', label: '訪客碼' },
  { to: '/admin/recommendations', label: '推薦地點' },
  { to: '/admin/notification-history', label: '通知紀錄' },
  { to: '/admin/notifications', label: '通知設定' },
];

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  const moreActive = [
    '/admin/revenue',
    '/admin/users',
    '/admin/keys',
    '/admin/guest-codes',
    '/admin/recommendations',
    '/admin/notifications',
  ].some((path) => location.pathname.startsWith(path));

  return (
    <div className="admin-shell">
      <div className="top-bar" />
      <PwaStatus />
      <PushForegroundBridge />
      <header className="admin-mobile-header">
        <Link to="/admin/today" className="admin-mobile-brand" aria-label="回到今日營運">
          <span className="admin-brand-mark">藏前</span>
          <span>
            <strong>管理後台</strong>
            <small>{user?.displayName || user?.email}</small>
          </span>
        </Link>
        <NavLink
          to="/admin/notification-history"
          className={({ isActive }) =>
            `admin-mobile-notification${isActive ? ' active' : ''}`
          }
          aria-label="查看通知紀錄"
        >
          <MobileNavIcon name="notificationHistory" />
        </NavLink>
      </header>
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

      <nav className="admin-mobile-nav" aria-label="手機版主要導覽">
        <MobileNavLink to="/admin/today" label="今日" icon="today" />
        <MobileNavLink to="/admin/calendar" label="行事曆" icon="calendar" />
        <MobileNavLink to="/admin/bookings" label="預約" icon="bookings" />
        <MobileNavLink to="/admin/messages" label="留言" icon="messages" />
        <button
          type="button"
          className={`admin-mobile-nav-item${moreActive || moreOpen ? ' active' : ''}`}
          aria-expanded={moreOpen}
          aria-controls="admin-more-menu"
          onClick={() => setMoreOpen(true)}
        >
          <MobileNavIcon name="more" />
          <span>更多</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="admin-more-menu" id="admin-more-menu">
          <button
            type="button"
            className="admin-more-backdrop"
            aria-label="關閉更多選單"
            onClick={() => setMoreOpen(false)}
          />
          <section className="admin-more-sheet" role="dialog" aria-modal="true" aria-labelledby="admin-more-title">
            <div className="admin-more-handle" aria-hidden="true" />
            <div className="admin-more-heading">
              <div>
                <p>藏前管理</p>
                <h2 id="admin-more-title">更多功能</h2>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="關閉更多選單">×</button>
            </div>
            <div className="admin-more-grid">
              <MoreLink to="/admin/revenue" label="收入總覽" icon="revenue" />
              <MoreLink to="/admin/users" label="使用者" icon="users" />
              <MoreLink to="/admin/keys" label="鑰匙管理" icon="keys" />
              <MoreLink to="/admin/guest-codes" label="訪客碼" icon="codes" />
              <MoreLink to="/admin/recommendations" label="推薦地點" icon="places" />
              <MoreLink to="/admin/notifications" label="通知設定" icon="notifications" />
            </div>
            <div className="admin-more-actions">
              <Link to="/guest/home" className="btn-ghost">查看房客頁面</Link>
              <button type="button" className="admin-more-signout" onClick={() => signOut().catch(() => {})}>
                登出 {user?.email}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type MobileIconName =
  | 'today'
  | 'calendar'
  | 'bookings'
  | 'messages'
  | 'more'
  | 'revenue'
  | 'users'
  | 'keys'
  | 'codes'
  | 'places'
  | 'notificationHistory'
  | 'notifications';

function MobileNavLink({ to, label, icon }: { to: string; label: string; icon: MobileIconName }) {
  return (
    <NavLink to={to} className={({ isActive }) => `admin-mobile-nav-item${isActive ? ' active' : ''}`}>
      <MobileNavIcon name={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

function MoreLink({ to, label, icon }: { to: string; label: string; icon: MobileIconName }) {
  return (
    <NavLink to={to} className={({ isActive }) => `admin-more-link${isActive ? ' active' : ''}`}>
      <span className="admin-more-link-icon"><MobileNavIcon name={icon} /></span>
      <span>{label}</span>
    </NavLink>
  );
}

function MobileNavIcon({ name }: { name: MobileIconName }) {
  const paths: Record<MobileIconName, ReactNode> = {
    today: <><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5M9.5 20v-6h5v6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" /></>,
    bookings: <><path d="M6 4.5h12a2 2 0 0 1 2 2V20H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" /><path d="M8 4.5v4l2-1.3L12 8.5v-4M8 13h8M8 16.5h6" /></>,
    messages: <><path d="M5 18.5 3.5 21l3.8-1.3c1.3.8 2.9 1.3 4.7 1.3 4.9 0 8.5-3.4 8.5-8S16.9 5 12 5s-8.5 3.4-8.5 8c0 2.1.6 4 1.5 5.5Z" /><path d="M8 12.5h8M8 16h5" /></>,
    more: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
    revenue: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5h-5a2 2 0 1 0 0 4h3a2 2 0 1 1 0 4H8.5M12 6.5v11" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.5 2.3-5.5 5.5-5.5s5 2 5.5 5.5M15 6.5a3 3 0 0 1 0 5.8M16 14c2.5.4 4 2.1 4.5 5" /></>,
    keys: <><circle cx="8" cy="15.5" r="4.5" /><path d="m11.5 12.5 7-7M16 8l2 2M18.5 5.5l2 2" /></>,
    codes: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2" /></>,
    places: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    notificationHistory: <><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4ZM10 20h4" /><path d="M8 7 5 4M16 7l3-3" /></>,
    notifications: <><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3v-4ZM10 20h4" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
