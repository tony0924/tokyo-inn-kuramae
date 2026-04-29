import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WIFI_PASSWORD = '12345678';

export function HomeTab() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyWifi = async () => {
    try {
      await navigator.clipboard.writeText(WIFI_PASSWORD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  };

  const navTo = (tab: string) => navigate(`/guest/${tab}`);

  return (
    <div className="section active">
      <div className="hero">
        <div className="hero-badge">✦ Welcome · 歡迎入住</div>
        <h1>
          藏前NEXT
          <br />
          房客指南
        </h1>
        <div className="hero-divider"></div>
        <p className="hero-sub">
          日神デュオステージ蔵前ＮＥＸＴ · Room 204
          <br />
          台東区蔵前 4丁目23−7 · Tokyo
        </p>
        <div className="hero-actions">
          <a
            href="https://maps.app.goo.gl/oK5pP3odKRNFN2oi7"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            📍 開啟地圖
          </a>
          <button className="btn-ghost" onClick={() => navTo('checkin')}>
            📋 查看入退房須知
          </button>
        </div>
      </div>

      <div className="wifi-card">
        <div className="wifi-icon-wrap">📶</div>
        <div className="wifi-info">
          <div className="wifi-row">
            <span className="wifi-label">名稱</span>
            <span className="wifi-val">chen204</span>
          </div>
          <div className="wifi-row">
            <span className="wifi-label">密碼</span>
            <span className="wifi-val">{WIFI_PASSWORD}</span>
          </div>
        </div>
        <button className="copy-btn" onClick={copyWifi}>
          {copied ? '已複製 ✓' : '複製密碼'}
        </button>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon">📍</div>
          <div className="card-title">住宿資訊</div>
        </div>
        <div className="info-row">
          <span className="info-label">地址</span>
          <span className="info-value">
            <a
              href="https://maps.app.goo.gl/oK5pP3odKRNFN2oi7"
              target="_blank"
              rel="noreferrer"
            >
              〒111-0051 東京都台東区蔵前 4丁目23−7
            </a>
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">建物</span>
          <span className="info-value">日神デュオステージ蔵前ＮＥＸＴ</span>
        </div>
        <div className="info-row">
          <span className="info-label">房號</span>
          <span className="info-value">204（二樓，出電梯左轉第一間）</span>
        </div>
      </div>

      <div className="glass-card" style={{ paddingBottom: 16 }}>
        <div className="card-header">
          <div className="card-icon">🧭</div>
          <div className="card-title">快速導覽</div>
        </div>
        <div className="nav-grid">
          {[
            ['checkin', '📋', '入退房'],
            ['arrival', '🚃', '抵達方式'],
            ['facilities', '🔧', '設施說明'],
            ['items', '📦', '備品清單'],
            ['services', '🏪', '超市'],
            ['restaurant', '🍜', '餐廳'],
            ['cityguide', '🗺️', '景點'],
            ['emergency', '🆘', '緊急聯絡'],
          ].map(([id, icon, label]) => (
            <div key={id} className="nav-card" onClick={() => navTo(id)}>
              <span className="nc-icon">{icon}</span>
              <div className="nc-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
