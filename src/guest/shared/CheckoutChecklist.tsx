import { useEffect, useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode } from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';

const ITEMS = [
  { id: 'remotes', label: '冷氣與電視遙控器放回客廳餐桌' },
  { id: 'floor', label: '用吸塵器清潔全室地板' },
  { id: 'sheets', label: '移除使用過的拋棄式床單' },
  { id: 'fridge', label: '清空冰箱內的食物與飲料' },
  { id: 'microwave', label: '確認微波爐內沒有留下食物或容器' },
  { id: 'garbage', label: '依分類丟棄所有垃圾' },
  { id: 'power', label: '關閉燈、浴室抽風機與熱水機' },
  { id: 'photos', label: '拍照或錄影回傳臥室、客廳、冰箱、廚房與浴室的狀態' },
] as const;

function readProgress(storageKey: string | null): string[] {
  if (!storageKey) return [];
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? ITEMS.filter((item) => saved.includes(item.id)).map((item) => item.id) : [];
  } catch { return []; }
}

export function CheckoutChecklist({ bookingId, urgent = false, details = false }: {
  bookingId?: string;
  urgent?: boolean;
  details?: boolean;
}) {
  const { user } = useAuth();
  const storageKey = bookingId ? `guest-checkout-checklist:${user?.role === 'admin' ? 'preview:' : ''}${bookingId}` : null;
  // Remount progress when switching bookings or entering/leaving Admin preview.
  return <ChecklistProgress key={storageKey ?? 'unsaved'} storageKey={storageKey} urgent={urgent} details={details} />;
}

function ChecklistProgress({ storageKey, urgent, details }: {
  storageKey: string | null;
  urgent: boolean;
  details: boolean;
}) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const [checked, setChecked] = useState(() => readProgress(storageKey));
  const [saveFailed, setSaveFailed] = useState(false);
  const completed = checked.length;

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setChecked(readProgress(storageKey));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  function toggle(id: string) {
    const next = checked.includes(id) ? checked.filter((value) => value !== id) : [...checked, id];
    setChecked(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setSaveFailed(false);
      } catch { setSaveFailed(true); }
    }
    recordGuestPageEvent({
      eventType: 'checkout_checklist',
      path: pathname,
      user,
      guestAccessCode: !user ? getStoredGuestAccessCode() : null,
      targetId: id,
      value: Math.round(next.length / ITEMS.length * 100),
    }).catch((error) => console.warn('record checkout checklist failed', error));
  }

  return (
    <section className={`checkout-widget${urgent ? ' urgent' : ''}`} aria-labelledby={titleId}>
      <div className="checkout-widget-heading">
        <div><p>BEFORE YOU LEAVE · 退房前</p><h2 id={titleId}>離開前逐項確認</h2></div>
        <strong aria-live="polite" aria-atomic="true">{completed}/{ITEMS.length}</strong>
      </div>
      <div className="checkout-progress" role="progressbar" aria-label="退房清單完成進度" aria-valuemin={0} aria-valuemax={ITEMS.length} aria-valuenow={completed}>
        <span style={{ width: `${completed / ITEMS.length * 100}%` }} />
      </div>
      <div className="checkout-checklist">
        {ITEMS.map((item) => <label key={item.id} className={checked.includes(item.id) ? 'checked' : ''}>
          <input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)} />
          <span aria-hidden="true">{checked.includes(item.id) ? '✓' : ''}</span><strong>{item.label}</strong>
        </label>)}
      </div>
      <p className="checkout-save-note" role="status">
        {completed === ITEMS.length ? '清單已全部勾選，離開前請再檢查隨身物品。' : '完成一項就勾選一項，離開前更安心。'}
        <br />
        {!storageKey || saveFailed ? '目前進度僅保留在本頁，重新載入後可能重設。' : user?.role === 'admin' ? '這是管理員預覽進度，只保存在這台裝置，不影響房客。' : '進度保存在這台裝置，首頁與入退房頁共用；不代表已回報退房。'}
      </p>
      <button type="button" className="checkout-detail-link" onClick={() => navigate(details ? '/guest/arrival' : '/guest/checkin', { state: { anchor: details ? 'anchor-garbage' : 'anchor-checkout' } })}>
        {details ? '查看垃圾分類與放置位置 →' : '查看完整退房說明 →'}
      </button>
    </section>
  );
}
