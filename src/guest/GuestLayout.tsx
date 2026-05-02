import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LightboxProvider } from './shared/Lightbox';
import { useAuth } from '@/auth/AuthProvider';
import {
  clearGuestAccessSession,
  getStoredGuestAccessCode,
  formatGuestCode,
} from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';
import { searchIndex, type GuestTabId, type SearchEntry } from './data/searchIndex';
import './legacy.css';

const TABS: { id: GuestTabId; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '首頁' },
  { id: 'checkin', icon: '📋', label: '入退房' },
  { id: 'arrival', icon: '🚃', label: '抵達' },
  { id: 'airport', icon: '✈️', label: '機場' },
  { id: 'facilities', icon: '🔧', label: '設施' },
  { id: 'items', icon: '📦', label: '備品' },
  { id: 'services', icon: '🏪', label: '超市' },
  { id: 'restaurant', icon: '🍜', label: '餐廳' },
  { id: 'cityguide', icon: '🗺️', label: '景點' },
  { id: 'faq', icon: '❓', label: 'FAQ' },
];

function highlight(text: string, q: string): string {
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), (m) => `<mark>${m}</mark>`);
}

export function GuestLayout() {
  const { user } = useAuth();
  const guestCode = !user ? getStoredGuestAccessCode() : null;
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const matches: SearchEntry[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.section.toLowerCase().includes(q)
    );
  }, [query]);

  const isSearching = query.trim().length > 0;

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      recordGuestPageEvent({
        eventType: 'page_view',
        path: location.pathname,
        user,
      }).catch((err) => console.warn('record guest page view failed', err));
      return;
    }

    if (guestCode) {
      recordGuestPageEvent({
        eventType: 'page_view',
        path: location.pathname,
        guestAccessCode: guestCode,
      }).catch((err) => console.warn('record guest code page view failed', err));
    }
  }, [guestCode, location.pathname, user]);

  return (
    <LightboxProvider>
      <div className="top-bar" />
      <header className="site-header">
        <div className="header-inner">
          {user?.role === 'admin' && (
            <div className="admin-preview-bar">
              <span>正在以管理員身份預覽房客頁面</span>
              <NavLink to="/admin" className="admin-preview-back">
                回管理後台
              </NavLink>
            </div>
          )}
          {guestCode && (
            <div className="admin-preview-bar">
              <span>正在使用訪客碼 {formatGuestCode(guestCode)} 查看房客頁面</span>
              <button
                type="button"
                className="admin-preview-back"
                onClick={() => {
                  clearGuestAccessSession();
                  navigate('/code-login', { replace: true });
                }}
              >
                離開
              </button>
            </div>
          )}
          <div className="header-top">
            <div className="header-brand">
              <div className="brand-icon">🏯</div>
              <div className="brand-text">
                <div className="title">藏前NEXT</div>
                <div className="subtitle">Guest Guide · Room 204</div>
              </div>
            </div>
            <div className="search-wrap">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="搜尋…"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <nav className="nav-tabs">
            {TABS.map((t) => (
              <NavLink
                key={t.id}
                to={`/guest/${t.id}`}
                className={({ isActive }) =>
                  isActive && !isSearching ? 'nav-tab active' : 'nav-tab'
                }
                onClick={() => setQuery('')}
              >
                <span className="tab-icon">{t.icon}</span> {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {isSearching ? (
          <div id="search-results" className="active">
            <div className="page-header">
              <div className="page-header-icon">🔍</div>
              <h2>搜尋結果</h2>
            </div>
            {matches.length === 0 ? (
              <div className="no-results">
                <div className="nr-icon">🔍</div>
                <p>
                  找不到「{query}」的相關資訊
                  <br />
                  <small style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                    試試：Wi-Fi · 熱水 · 地鐵 · 餐廳
                  </small>
                </p>
              </div>
            ) : (
              <div>
                {matches.map((r, idx) => (
                  <div
                    key={`${r.tab}-${r.title}-${idx}`}
                    className="search-result-item"
                    onClick={() => {
                      setQuery('');
                      navigate(`/guest/${r.tab}`, r.anchor ? { state: { anchor: r.anchor } } : undefined);
                    }}
                  >
                    <div className="sri-section">{r.section}</div>
                    <div
                      className="sri-title"
                      dangerouslySetInnerHTML={{
                        __html: highlight(r.title, query),
                      }}
                    />
                    <div
                      className="sri-preview"
                      dangerouslySetInnerHTML={{
                        __html: highlight(
                          r.content.split(' ').slice(0, 10).join(' '),
                          query
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </LightboxProvider>
  );
}
