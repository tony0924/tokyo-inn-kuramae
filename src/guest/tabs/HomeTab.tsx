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

      <div className="glass-card welcome-note-card">
        <div className="card-header">
          <div className="card-icon">🥳</div>
          <div className="card-title">歡迎來玩</div>
        </div>
        <p className="welcome-note-lead">
          歡迎大家來東京玩，這裡整理幾個我們自己的小推薦，讓旅程可以更輕鬆一點。
        </p>
        <div className="welcome-tip">
          <div className="welcome-tip-number">01</div>
          <div>
            <div className="welcome-tip-title">衣服帶少量即可</div>
            <p>
              房內可以洗衣服，加上日本天氣比較乾燥，晚上洗完通常隔天就會乾，不用太擔心。
              行李空間建議多留一點給日本購物，回程會比較從容。
            </p>
          </div>
        </div>
        <div className="welcome-tip">
          <div className="welcome-tip-number">02</div>
          <div>
            <div className="welcome-tip-title">餐廳避雷</div>
            <p>
              門口斜對面的麵包店我們不太推薦，巷口的鰻魚飯也不太推薦。
              附近還有很多更值得吃的選擇，可以優先參考餐廳分頁。
            </p>
          </div>
        </div>
        <div className="welcome-tip">
          <div className="welcome-tip-number">03</div>
          <div>
            <div className="welcome-tip-title">機場到住宿交通</div>
            <p>
              從成田機場過來，不太推薦搭 Skyliner，票價較高，而且到住宿還需要再轉車。
              比較推薦搭 Sky Access，車程大約 1 小時。
            </p>
            <p>
              如果是 Sky Access 特急，通常可以直達藏前站；如果是 Sky Access 機場特快，
              車不會停藏前站，請在前一站淺草站下車，同月台等下一班往藏前方向的車再上車。
            </p>
          </div>
        </div>
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
