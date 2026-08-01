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
import { GuestGuideProvider, useGuestGuide } from './GuestGuideProvider';
import { PwaInstallGuide } from './shared/PwaInstallGuide';
import { applyGuestPwaMetadata, usePwaInstall } from '@/pwa/guestInstall';
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
  { id: 'messages', icon: '💬', label: '推薦牆' },
  { id: 'faq', icon: '❓', label: 'FAQ' },
];

const MOBILE_PRIMARY_TABS: GuestTabId[] = ['home', 'checkin', 'arrival', 'messages'];
const MOBILE_MORE_TABS = TABS.filter(
  (tab) => tab.id !== 'guide' && !MOBILE_PRIMARY_TABS.includes(tab.id)
);

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
  return (
    <GuestGuideProvider>
      <GuestLayoutContent />
    </GuestGuideProvider>
  );
}

function GuestLayoutContent() {
  const { user } = useAuth();
  const guestCode = !user ? getStoredGuestAccessCode() : null;
  const [query, setQuery] = useState('');
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { guide, loading: guideLoading, error: guideError } = useGuestGuide();
  const { installed: pwaInstalled } = usePwaInstall();
  const visitorKey = guestCode
    ? `code:${guestCode}`
    : user && user.role !== 'admin'
      ? `user:${user.uid}`
      : null;

  const matches: SearchEntry[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const privateEntries: SearchEntry[] = (guide?.searchEntries ?? [])
      .filter((entry) => TABS.some((tab) => tab.id === entry.tab))
      .map((entry) => ({ ...entry, tab: entry.tab as GuestTabId }));
    return [...searchIndex, ...privateEntries].filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q) ||
        i.section.toLowerCase().includes(q)
    );
  }, [guide, query]);

  const isSearching = query.trim().length > 0;
  const guideActive = location.pathname.startsWith('/guest/guide');
  const isAdminPreview = user?.role === 'admin';

  const toggleMobileGuide = () => {
    setQuery('');

    if (guideActive) {
      const returnTo =
        typeof location.state?.guideReturnTo === 'string' &&
        location.state.guideReturnTo.startsWith('/guest/') &&
        !location.state.guideReturnTo.startsWith('/guest/guide')
          ? location.state.guideReturnTo
          : '/guest/home';
      navigate(returnTo);
      return;
    }

    navigate('/guest/guide', {
      state: { guideReturnTo: location.pathname },
    });
  };

  // Apply Guest-specific install metadata while the visitor portal is active.
  useEffect(() => {
    return applyGuestPwaMetadata();
  }, []);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setMobileMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMoreOpen]);

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
        pwaInstalled={pwaInstalled}
        onOpenPwaGuide={() => {
          setShowWelcomeGuide(false);
          setShowPwaGuide(true);
        }}
      />
      <PwaInstallGuide open={showPwaGuide} onClose={() => setShowPwaGuide(false)} />
      <div className="top-bar" />
      {isAdminPreview && (
        <aside className="admin-preview-dock" aria-label="管理員預覽模式">
          <div className="admin-preview-dock-inner">
            <span>管理員預覽房客頁面</span>
            <NavLink to="/admin" className="admin-preview-back">
              回管理後台
            </NavLink>
          </div>
        </aside>
      )}
      <header className={`site-header${isAdminPreview ? ' admin-preview-active' : ''}`}>
        <div className="header-inner">
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
                <div className="title">KURACHEN Stay</div>
                <div className="subtitle">
                  Guest Guide{guide?.accommodation.roomLabel ? ` · ${guide.accommodation.roomLabel}` : ''}
                </div>
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
            <button
              type="button"
              className={`guest-guide-toggle${guideActive ? ' active' : ''}`}
              aria-label={guideActive ? '返回原本瀏覽頁面' : '開啟使用指南'}
              onClick={toggleMobileGuide}
            >
              <span aria-hidden="true">{guideActive ? '↩' : '🧭'}</span>
              <small>{guideActive ? '返回' : '指南'}</small>
            </button>
          </div>
          <nav className="nav-tabs">
            {TABS.filter((tab) => tab.id !== 'guide').map((t) => (
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
        {guideLoading ? (
          <div className="stay-overview-loading" role="status">正在安全載入房客指南…</div>
        ) : guideError ? (
          <div className="stay-overview-unavailable" role="alert">
            房客指南暫時無法載入，請重新整理或重新登入。
          </div>
        ) : null}
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

      <nav className="guest-mobile-nav" aria-label="手機版主要導覽">
        {TABS.filter((tab) => MOBILE_PRIMARY_TABS.includes(tab.id)).map((tab) => (
          <NavLink
            key={tab.id}
            to={`/guest/${tab.id}`}
            className={({ isActive }) =>
              `guest-mobile-nav-item${isActive && !isSearching ? ' active' : ''}`
            }
            onClick={() => setQuery('')}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <small>{tab.label}</small>
          </NavLink>
        ))}
        <button
          type="button"
          className={`guest-mobile-nav-item${
            mobileMoreOpen ||
            MOBILE_MORE_TABS.some((tab) => location.pathname.startsWith(`/guest/${tab.id}`))
              ? ' active'
              : ''
          }`}
          aria-expanded={mobileMoreOpen}
          aria-controls="guest-mobile-more-menu"
          onClick={() => setMobileMoreOpen(true)}
        >
          <span className="guest-mobile-more-icon" aria-hidden="true">•••</span>
          <small>更多</small>
        </button>
      </nav>

      {mobileMoreOpen && (
        <div className="guest-mobile-more-menu" id="guest-mobile-more-menu">
          <button
            type="button"
            className="guest-mobile-more-backdrop"
            aria-label="關閉更多選單"
            onClick={() => setMobileMoreOpen(false)}
          />
          <section
            className="guest-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-mobile-more-title"
          >
            <div className="guest-mobile-more-handle" aria-hidden="true" />
            <div className="guest-mobile-more-heading">
              <div>
                <p>KURACHEN Stay</p>
                <h2 id="guest-mobile-more-title">住宿資訊</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="關閉更多選單"
              >
                ×
              </button>
            </div>
            <div className="guest-mobile-more-grid">
              {MOBILE_MORE_TABS.map((tab) => (
                <NavLink
                  key={tab.id}
                  to={`/guest/${tab.id}`}
                  className={({ isActive }) =>
                    `guest-mobile-more-link${isActive ? ' active' : ''}`
                  }
                  onClick={() => setQuery('')}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <small>{tab.label}</small>
                </NavLink>
              ))}
            </div>
          </section>
        </div>
      )}
    </LightboxProvider>
  );
}
