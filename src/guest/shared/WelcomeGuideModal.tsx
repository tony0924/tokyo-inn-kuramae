import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onDismissToday: () => void;
  onOpenPwaGuide: () => void;
  guestName: string | null;
  pwaInstalled: boolean;
};

const QUICK_GUIDE = [
  {
    icon: '🔍',
    title: '快速搜尋',
    description: '從頁面上方搜尋 Wi-Fi、熱水、垃圾等關鍵字。',
  },
  {
    icon: '🧭',
    title: '切換分類',
    description: '左右滑動上方選單，查看入退房、交通與附近推薦。',
  },
  {
    icon: '📋',
    title: '先看入退房',
    description: '入住與退房前，請依照頁面清單確認注意事項。',
  },
  {
    icon: '💬',
    title: '旅人交流',
    description: '到訪客推薦牆看看大家分享的美食、景點與旅行情報，也歡迎留下你的推薦。',
  },
];

export function WelcomeGuideModal({
  open,
  onClose,
  onDismissToday,
  onOpenPwaGuide,
  guestName,
  pwaInstalled,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="welcome-guide-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="welcome-guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="welcome-guide-close"
          aria-label="關閉網站說明"
          onClick={onClose}
        >
          ×
        </button>

        <div className="welcome-guide-heading">
          <span className="welcome-guide-mark" aria-hidden="true">🏯</span>
          <p>WELCOME · 歡迎入住</p>
          <h2 id="welcome-guide-title">
            {guestName ? `Hi, ${guestName}` : '歡迎來到 KURACHEN Stay'}
          </h2>
          <span>
            30 秒認識房客網站，住宿期間需要的資訊都可以在這裡快速找到。
          </span>
        </div>

        <div className="welcome-guide-list">
          {QUICK_GUIDE.map((item) => (
            <div className="welcome-guide-item" key={item.title}>
              <span className="welcome-guide-icon" aria-hidden="true">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`welcome-guide-pwa${pwaInstalled ? ' installed' : ''}`}
          onClick={onOpenPwaGuide}
        >
          <span className="welcome-guide-pwa-icon" aria-hidden="true">
            {pwaInstalled ? '✓' : '＋'}
          </span>
          <span>
            <strong>{pwaInstalled ? '已加入手機主畫面' : '加入手機主畫面'}</strong>
            <small>
              {pwaInstalled
                ? '你已經能像 App 一樣快速開啟房客指南。'
                : '一點就開、不用找網址；同一裝置會記住訪客碼。'}
            </small>
          </span>
          <span aria-hidden="true">›</span>
        </button>

        <p className="welcome-guide-note">
          之後也能從上方的「使用指南」再次查看完整說明。
        </p>
        <button type="button" className="welcome-guide-dismiss" onClick={onDismissToday}>
          今天不再提醒
        </button>
      </section>
    </div>
  );
}
