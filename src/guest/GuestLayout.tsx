import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { WelcomeGuideModal } from './shared/WelcomeGuideModal';
import './legacy.css';

const WELCOME_GUIDE_STORAGE_PREFIX = 'guest-welcome-guide-dismissed';

const TABS: { id: GuestTabId; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '首頁' },
  { id: 'guide', icon: '🧭', label: '使用指南' },
  { id: 'checkin', icon: '📋', label: '入退房' },
  { id: 'arrival', icon: '🚃', label: '抵達' },
  { id: 'transit', icon: '🚇', label: '地鐵／公車' },
  { id: 'airport', icon: '✈️', label: '機場' },
  { id: 'facilities', icon: '🔧', label: '設施' },
  { id: 'items', icon: '📦', label: '備品' },
  { id: 'services', icon: '🏪', label: '購物' },
  { id: 'restaurant', icon: '🍜', label: '食物' },
  { id: 'cityguide', icon: '🗺️', label: '景點' },
  { id: 'messages', icon: '💬', label: '留言板' },
  { id: 'faq', icon: '❓', label: 'FAQ' },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, index): ReactNode =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : part
  );
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function GuestLayout() {
  const { user } = useAuth();
  const guestCode = !user ? getStoredGuestAccessCode() : null;
  const [query, setQuery] = useState('');
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const visitorKey = guestCode
    ? `code:${guestCode}`
    : user && user.role !== 'admin'
      ? `user:${user.uid}`
      : null;

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

  useEffect(() => {
    if (!visitorKey) {
      setShowWelcomeGuide(false);
      return;
    }

    try {
      const storageKey = `${WELCOME_GUIDE_STORAGE_PREFIX}:${visitorKey}`;
      setShowWelcomeGuide(localStorage.getItem(storageKey) !== getTodayKey());
    } catch {
      setShowWelcomeGuide(true);
    }
  }, [visitorKey]);

  const dismissWelcomeGuideToday = () => {
    if (visitorKey) {
      try {
        localStorage.setItem(
          `${WELCOME_GUIDE_STORAGE_PREFIX}:${visitorKey}`,
          getTodayKey()
        );
      } catch {
        // The guide can still be closed when browser storage is unavailable.
      }
    }
    setShowWelcomeGuide(false);
  };

  return (
    <LightboxProvider>
      <WelcomeGuideModal
        open={showWelcomeGuide}
        onClose={() => setShowWelcomeGuide(false)}
        onDismissToday={dismissWelcomeGuideToday}
      />
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
                  <button
                    type="button"
                    key={`${r.tab}-${r.title}-${idx}`}
                    className="search-result-item"
                    onClick={() => {
                      setQuery('');
                      navigate(`/guest/${r.tab}`, r.anchor ? { state: { anchor: r.anchor } } : undefined);
                    }}
                  >
                    <div className="sri-section">{r.section}</div>
                    <div className="sri-title"><Highlight text={r.title} query={query} /></div>
                    <div className="sri-preview">
                      <Highlight text={r.content.split(' ').slice(0, 10).join(' ')} query={query} />
                    </div>
                  </button>
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
