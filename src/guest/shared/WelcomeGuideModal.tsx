import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onDismissToday: () => void;
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
    title: '需要協助',
    description: '找不到答案時，可到留言板聯絡管理員並查看回覆。',
  },
];

export function WelcomeGuideModal({ open, onClose, onDismissToday }: Props) {
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
          <h2 id="welcome-guide-title">30 秒認識這個網站</h2>
          <span>住宿期間需要的資訊，都可以在這裡快速找到。</span>
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
