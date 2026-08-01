import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { StayOverviewCard } from '@/guest/shared/StayOverviewCard';
import { useAuth } from '@/auth/AuthProvider';
import { useGuestGuide } from '@/guest/GuestGuideProvider';
import type { GuestOutletContext } from '@/guest/GuestLayout';

export function HomeTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { guide } = useGuestGuide();
  const [copied, setCopied] = useState(false);
  const {
    booking,
    greetingName,
    loading: bookingLoading,
    error: bookingError,
  } = useOutletContext<GuestOutletContext>();

  const copyWifi = async () => {
    try {
      if (!guide) return;
      await navigator.clipboard.writeText(guide.wifi.password);
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
        {greetingName && (
          <div className="hero-personal-greeting" aria-live="polite">
            <span>Hi,</span>
            <strong>{greetingName}</strong>
          </div>
        )}
        <div className="hero-badge">
          ✦ {greetingName ? 'Welcome to your stay · 歡迎入住' : 'Welcome · 歡迎入住'}
        </div>
        <h1>
          KURACHEN Stay
          <br />
          房客指南
        </h1>
        <div className="hero-divider"></div>
        <p className="hero-sub">
          {guide?.accommodation.buildingName} · {guide?.accommodation.roomLabel}
          <br />
          {guide?.accommodation.address}
        </p>
        <div className="hero-actions">
          <a
            href={guide?.accommodation.mapUrl}
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

      {bookingLoading ? (
        <div className="stay-overview-loading">正在整理你的住宿資訊…</div>
      ) : booking ? (
        <StayOverviewCard booking={booking} />
      ) : bookingError ? (
        <div className="stay-overview-unavailable" role="status">
          暫時無法載入住宿資訊，其他房客指南仍可正常使用。
        </div>
      ) : user?.role === 'admin' ? (
        <div className="stay-overview-unavailable" role="status">
          目前沒有可供管理員預覽的預約，建立預約後即可查看個人住宿與航班小卡。
        </div>
      ) : null}

      {guide && <div className="wifi-card">
        <div className="wifi-icon-wrap">📶</div>
        <div className="wifi-info">
          <div className="wifi-row">
            <span className="wifi-label">名稱</span>
            <span className="wifi-val">{guide.wifi.ssid}</span>
          </div>
          <div className="wifi-row">
            <span className="wifi-label">密碼</span>
            <span className="wifi-val">{guide.wifi.password}</span>
          </div>
        </div>
        <button className="copy-btn" onClick={copyWifi}>
          {copied ? '已複製 ✓' : '複製密碼'}
        </button>
      </div>}

      <div className="glass-card must-see-card">
        <div className="card-header">
          <div className="card-icon">✨</div>
          <div className="card-title">第一次入住先看</div>
        </div>
        <div className="must-see-grid">
          <button type="button" className="must-see-item" onClick={() => navTo('checkin')}>
            <span>01</span>
            <strong>入退房須知</strong>
            <small>床單、熱水機、退房整理</small>
          </button>
          <button type="button" className="must-see-item" onClick={() => navTo('arrival')}>
            <span>02</span>
            <strong>抵達與進房</strong>
            <small>入口、電梯、房門位置</small>
          </button>
          <button type="button" className="must-see-item" onClick={() => navTo('facilities')}>
            <span>03</span>
            <strong>設施使用</strong>
            <small>門鎖、IH 爐、熱水機</small>
          </button>
        </div>
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
              如果是「Sky Access 特急」，通常可以直達藏前站。
            </p>
            <p>
              如果是「Sky Access 機場特快」，車不會停藏前站，請在前一站淺草站下車，
              同月台等下一班往藏前方向的車再上車。
            </p>
            <button
              type="button"
              className="welcome-tip-link"
              onClick={() => navTo('airport')}
            >
              查看機場交通詳細指引 →
            </button>
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
              href={guide?.accommodation.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              {guide?.accommodation.address}
            </a>
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">建物</span>
          <span className="info-value">{guide?.accommodation.buildingName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">房號</span>
          <span className="info-value">
            {guide?.accommodation.roomLabel}（{guide?.accommodation.roomDirections}）
          </span>
        </div>
      </div>

      <div className="glass-card" style={{ paddingBottom: 16 }}>
        <div className="card-header">
          <div className="card-icon">🧭</div>
          <div className="card-title">快速導覽</div>
        </div>
        <div className="nav-grid">
          {[
            ['guide', '🧭', '使用指南'],
            ['checkin', '📋', '入退房'],
            ['arrival', '🚃', '抵達方式'],
            ['airport', '✈️', '機場交通'],
            ['facilities', '🔧', '設施說明'],
            ['items', '📦', '備品清單'],
            ['services', '🏪', '超市'],
            ['restaurant', '🍜', '餐廳'],
            ['cityguide', '🗺️', '景點'],
            ['faq', '❓', 'FAQ'],
          ].map(([id, icon, label]) => (
            <button key={id} type="button" className="nav-card" onClick={() => navTo(id)}>
              <span className="nc-icon">{icon}</span>
              <div className="nc-label">{label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
