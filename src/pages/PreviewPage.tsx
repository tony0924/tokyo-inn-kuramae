import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { signOut } from '@/lib/auth';
import { PreviewMap } from '@/preview/PreviewMap';
import '@/preview/preview.css';

const stations = [
  { name: '都營淺草線・大江戶線　蔵前站', minutes: '5 分' },
  { name: '都營淺草線　淺草站（雷門方向）', minutes: '15 分' },
  { name: '東京 Metro 銀座線　田原町站', minutes: '12 分' },
];

const stats = [
  { label: 'Type', value: '一房一廳・整層' },
  { label: 'Capacity', value: '最多 4 人' },
  { label: 'District', value: '東京・台東區藏前' },
  { label: 'Floor', value: '高層・電梯直達' },
];

const features = [
  'Wi-Fi 高速網路',
  'IH 廚房・烹飪用具',
  '洗衣機 / 烘乾',
  '智慧門鎖',
  '隔音良好',
  '可攜帶大行李',
  '近鬧區但安靜',
];

export default function PreviewPage() {
  const { fbUser, user } = useAuth();

  return (
    <>
      <div className="top-bar" />
      <div className="preview-page">
        {fbUser && (
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span className="preview-status-line">
              {fbUser.email}
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => signOut().catch(() => {})}
            >
              登出
            </button>
          </div>
        )}

        <header className="preview-hero">
          <span className="preview-eyebrow">Tokyo · Kuramae</span>
          <h1 className="preview-title">
            藏前 <span className="accent">NEXT</span>
          </h1>
          <p className="preview-subtitle">東京下町の靜謐な住所</p>

          <div className="preview-cta-row">
            {fbUser ? (
              <>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="btn-gold">
                    進入管理者頁面
                  </Link>
                )}
                {user?.role === 'guest' && user.active && (
                  <Link to="/guest" className="btn-gold">
                    進入房客頁面
                  </Link>
                )}
                {(user?.role === 'pending' ||
                  (user && !user.active && user.role !== 'admin')) && (
                  <Link to="/pending" className="btn-ghost">
                    查看審核狀態
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="btn-gold">
                  我已預訂・登入查看完整資訊
                </Link>
                <Link to="/code-login" className="btn-ghost">
                  使用訪客碼查看
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="preview-section">
          <h2>大致位置</h2>
          <p
            style={{
              color: 'var(--text-mid)',
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 18,
            }}
          >
            位於東京都台東區藏前一帶 — 介於淺草與秋葉原之間的傳統下町，
            既近主要景點也保有低調生活感。確切地址將於入住前提供給已預訂的房客。
          </p>
          <PreviewMap />
        </section>

        <section className="preview-section">
          <h2>交通距離</h2>
          <ul className="preview-station-list" style={{ listStyle: 'none', padding: 0 }}>
            {stations.map((s) => (
              <li key={s.name}>
                <span className="duration">徒步 {s.minutes}</span>
                <span>{s.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="preview-section">
          <h2>房型概況</h2>
          <div className="preview-grid-2" style={{ marginBottom: 24 }}>
            {stats.map((s) => (
              <div className="preview-stat" key={s.label}>
                <div className="preview-stat-label">{s.label}</div>
                <div className="preview-stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          <h3
            style={{
              fontFamily: "'Noto Serif TC', serif",
              fontSize: 14,
              color: 'var(--text-mid)',
              marginBottom: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            設施與配備
          </h3>
          <div className="preview-feature-grid">
            {features.map((f) => (
              <div className="preview-feature" key={f}>
                {f}
              </div>
            ))}
          </div>
        </section>

        <p className="preview-disclaimer">
          完整地址、Wi-Fi 密碼、門鎖密碼、抵達指引等敏感資訊
          <br />
          僅向已完成預約的房客開放，請使用預約 Email 登入查看。
        </p>
      </div>
    </>
  );
}
