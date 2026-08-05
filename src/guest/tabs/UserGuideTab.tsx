import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PwaInstallGuide } from '@/guest/shared/PwaInstallGuide';
import { usePwaInstall } from '@/pwa/guestInstall';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode } from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';

const GUIDE_SECTIONS = [
  {
    id: 'checkin',
    icon: '📋',
    title: '入退房',
    description: '入住前先確認注意事項，退房時照著清單逐項完成。',
    action: '查看入退房須知',
  },
  {
    id: 'arrival',
    icon: '🚃',
    title: '抵達與進房',
    description: '查看大樓入口、磁扣、電梯、房號與電子鎖的使用方式。',
    action: '查看抵達流程',
  },
  {
    id: 'facilities',
    icon: '🔧',
    title: '房內設施',
    description: '熱水機、門鎖、IH 爐、浴室乾燥等設備都有圖文說明。',
    action: '查看設施說明',
  },
  {
    id: 'transit',
    icon: '🚇',
    title: '交通資訊',
    description: '快速找到附近車站、公車，以及適合你的機場往返方式。',
    action: '查看附近交通',
  },
  {
    id: 'restaurant',
    icon: '🍜',
    title: '附近推薦',
    description: '從餐廳、咖啡、超市到景點，點開地點即可使用地圖導航。',
    action: '查看餐廳推薦',
  },
  {
    id: 'messages',
    icon: '💬',
    title: '旅人交流',
    description: '看看其他旅人的美食、景點與旅行情報，也可以分享自己的推薦。',
    action: '前往推薦牆',
  },
];

export function UserGuideTab() {
  const navigate = useNavigate();
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const { installed, device } = usePwaInstall();
  const { user } = useAuth();
  const guestCode = !user ? getStoredGuestAccessCode() : null;

  const recordPwaEvent = (eventType: 'pwa_guide_open' | 'pwa_install', targetId: string) => {
    recordGuestPageEvent({
      eventType,
      path: '/guest/guide',
      user,
      guestAccessCode: guestCode,
      targetId,
    }).catch((error) => console.warn('record PWA guide event failed', error));
  };

  return (
    <div className="section active user-guide">
      <div className="guide-hero">
        <div className="guide-eyebrow">START HERE · 第一次使用</div>
        <div className="guide-hero-row">
          <div>
            <h1>這份網站指南，<br />陪你住得更輕鬆。</h1>
            <p>住宿需要的資訊都整理在這裡。依照旅程階段查看，或直接搜尋關鍵字。</p>
          </div>
          <div className="guide-hero-mark" aria-hidden="true">?</div>
        </div>
      </div>

      <section className="guide-start-card" aria-labelledby="guide-start-title">
        <div className="guide-section-heading">
          <span>01</span>
          <div>
            <p>QUICK START</p>
            <h2 id="guide-start-title">三步快速開始</h2>
          </div>
        </div>
        <ol className="guide-steps">
          <li>
            <span className="guide-step-number">1</span>
            <div>
              <strong>先看入退房須知</strong>
              <p>入住前確認床單、熱水機與房內規則；退房前依清單整理。</p>
            </div>
          </li>
          <li>
            <span className="guide-step-number">2</span>
            <div>
              <strong>抵達時開啟進房流程</strong>
              <p>跟著照片找到入口，並依照安全載入的指示前往房間。</p>
            </div>
          </li>
          <li>
            <span className="guide-step-number">3</span>
            <div>
              <strong>遇到問題先搜尋</strong>
              <p>在頁面上方輸入「熱水」、「垃圾」或「Wi-Fi」等關鍵字。</p>
            </div>
          </li>
        </ol>
        <button type="button" className="guide-primary-action" onClick={() => navigate('/guest/checkin')}>
          從入退房須知開始 <span aria-hidden="true">→</span>
        </button>
      </section>

      <section aria-labelledby="guide-map-title">
        <div className="guide-section-heading">
          <span>02</span>
          <div>
            <p>WEBSITE MAP</p>
            <h2 id="guide-map-title">你可以在這裡找到</h2>
          </div>
        </div>
        <div className="guide-feature-grid">
          {GUIDE_SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="guide-feature-card"
              onClick={() => navigate(`/guest/${item.id}`)}
            >
              <span className="guide-feature-icon" aria-hidden="true">{item.icon}</span>
              <span className="guide-feature-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
                <span className="guide-feature-link">{item.action} →</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="guide-tips" aria-labelledby="guide-tips-title">
        <div className="guide-section-heading">
          <span>03</span>
          <div>
            <p>GOOD TO KNOW</p>
            <h2 id="guide-tips-title">使用小提醒</h2>
          </div>
        </div>
        <div className="guide-tip-list">
          <div><span>⌕</span><p><strong>善用搜尋</strong>搜尋結果會直接帶你到相關分頁與說明。</p></div>
          <div><span>↗</span><p><strong>地圖會另開頁面</strong>餐廳、超市與景點可直接開啟 Google Maps 導航。</p></div>
          <div><span>🔒</span><p><strong>請勿分享訪客碼</strong>網站包含住宿與進房資訊，僅限同行房客使用。</p></div>
        </div>
      </section>

      <section className="guide-pwa-card" aria-labelledby="guide-pwa-title">
        <div className="guide-pwa-icon" aria-hidden="true">藏前</div>
        <div className="guide-pwa-copy">
          <span>QUICK ACCESS · 快速開啟</span>
          <h2 id="guide-pwa-title">
            {installed ? '已加入手機主畫面' : '把房客指南加入主畫面'}
          </h2>
          <p>
            {installed
              ? '你目前正以 App 模式使用，可以直接從主畫面開啟。'
              : device === 'ios'
                ? '使用 iPhone 的 Safari 分享選單，幾個步驟就能像 App 一樣開啟。'
                : device === 'android'
                  ? '在 Android 上安裝後，可直接從主畫面開啟，不必重新找網址。'
                  : '可將網站安裝成應用程式，之後從裝置直接開啟。'}
          </p>
        </div>
        <button type="button" onClick={() => {
          setShowPwaGuide(true);
          recordPwaEvent('pwa_guide_open', 'user_guide');
        }}>
          {installed ? '查看狀態' : '查看安裝方式'}
        </button>
      </section>

      <div className="guide-help-card">
        <div>
          <span>旅人交流</span>
          <strong>把你的發現分享給大家</strong>
          <p>看看其他訪客的推薦，也能在同一頁查看管理員的公開回覆。</p>
        </div>
        <button type="button" onClick={() => navigate('/guest/messages')}>前往推薦牆</button>
      </div>
      <PwaInstallGuide
        open={showPwaGuide}
        onClose={() => setShowPwaGuide(false)}
        onInstallAccepted={() => recordPwaEvent('pwa_install', 'browser_prompt')}
      />
    </div>
  );
}
