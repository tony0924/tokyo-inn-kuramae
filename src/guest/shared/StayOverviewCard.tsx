import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { getStayStatus, type StayStage } from '@/lib/stayStatus';
import type { Booking } from '@/types';

const CHECKOUT_ITEMS = [
  { id: 'remotes', label: '冷氣與電視遙控器放回客廳餐桌' },
  { id: 'floor', label: '用吸塵器清潔全室地板' },
  { id: 'sheets', label: '移除使用過的拋棄式床單' },
  { id: 'fridge', label: '清空冰箱內的食物與飲料' },
  { id: 'garbage', label: '依分類丟棄所有垃圾' },
  { id: 'power', label: '關閉燈、浴室抽風機與熱水機' },
  { id: 'photos', label: '拍照或錄影回傳房內狀態' },
] as const;

const STAGE_COPY: Record<
  StayStage,
  { eyebrow: string; title: string; description: string; icon: string }
> = {
  before_checkin: {
    eyebrow: '準備入住',
    title: '旅程即將開始',
    description: '先收藏抵達方式與入住注意事項，抵達當天會更輕鬆。',
    icon: '🧳',
  },
  checkin_today: {
    eyebrow: '今日入住',
    title: '歡迎來到藏前',
    description: '抵達後依進房教學使用磁扣、電梯與電子鎖。',
    icon: '🔑',
  },
  staying: {
    eyebrow: '住宿中',
    title: '祝你在東京玩得開心',
    description: '需要設備說明、附近餐廳或交通資訊，都能從這裡快速前往。',
    icon: '🏠',
  },
  checkout_today: {
    eyebrow: '今日退房',
    title: '退房前再確認一次',
    description: '請在退房時間前完成下方清單，避免遺漏物品或電器。',
    icon: '🏁',
  },
  completed: {
    eyebrow: '住宿完成',
    title: '謝謝你的入住',
    description: '希望這趟東京旅程留下美好回憶，期待下次再見。',
    icon: '✨',
  },
};

function checklistStorageKey(bookingId: string): string {
  return `guest-checkout-checklist:${bookingId}`;
}

function loadCheckedItems(bookingId: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(checklistStorageKey(bookingId)) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function StayOverviewCard({ booking }: { booking: Booking }) {
  const navigate = useNavigate();
  const status = useMemo(() => getStayStatus(booking), [booking]);
  const copy = STAGE_COPY[status.stage];
  const checkIn = booking.checkIn.toDate();
  const checkOut = booking.checkOut.toDate();
  const [checked, setChecked] = useState<string[]>(() => loadCheckedItems(booking.id));

  useEffect(() => {
    setChecked(loadCheckedItems(booking.id));
  }, [booking.id]);

  const toggleItem = (id: string) => {
    setChecked((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      try {
        localStorage.setItem(checklistStorageKey(booking.id), JSON.stringify(next));
      } catch {
        // Keep checklist usable in memory when storage is unavailable.
      }
      return next;
    });
  };

  const completedCount = CHECKOUT_ITEMS.filter((item) => checked.includes(item.id)).length;
  const showChecklist = status.stage !== 'completed';

  return (
    <>
      <section className={`stay-overview-card stage-${status.stage}`} aria-labelledby="stay-overview-title">
        <div className="stay-overview-heading">
          <span className="stay-overview-icon" aria-hidden="true">{copy.icon}</span>
          <div>
            <p>{copy.eyebrow}</p>
            <h2 id="stay-overview-title">{copy.title}</h2>
          </div>
          <span className="stay-overview-countdown">{countdownLabel(status)}</span>
        </div>
        <p className="stay-overview-description">{copy.description}</p>
        <div className="stay-date-grid">
          <div>
            <span>入住</span>
            <strong>{format(checkIn, 'M月d日 EEE', { locale: zhTW })}</strong>
            <small>15:00 後</small>
          </div>
          <div>
            <span>退房</span>
            <strong>{format(checkOut, 'M月d日 EEE', { locale: zhTW })}</strong>
            <small>11:00 前</small>
          </div>
          <div>
            <span>入住人數</span>
            <strong>{booking.partySize} 人</strong>
            <small>{booking.guestName}</small>
          </div>
        </div>
        <div className="stay-overview-actions">
          <button type="button" className="btn-primary" onClick={() => navigate(primaryAction(status.stage).path)}>
            {primaryAction(status.stage).label}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/guest/messages')}>
            💬 聯絡管理員
          </button>
        </div>
      </section>

      {showChecklist && (
        <section className={`checkout-widget ${status.stage === 'checkout_today' ? 'urgent' : ''}`} aria-labelledby="checkout-widget-title">
          <div className="checkout-widget-heading">
            <div>
              <p>退房 Checklist</p>
              <h2 id="checkout-widget-title">離開前逐項確認</h2>
            </div>
            <strong>{completedCount}/{CHECKOUT_ITEMS.length}</strong>
          </div>
          <div
            className="checkout-progress"
            role="progressbar"
            aria-label="退房清單完成進度"
            aria-valuemin={0}
            aria-valuemax={CHECKOUT_ITEMS.length}
            aria-valuenow={completedCount}
          >
            <span style={{ width: `${(completedCount / CHECKOUT_ITEMS.length) * 100}%` }} />
          </div>
          <div className="checkout-checklist">
            {CHECKOUT_ITEMS.map((item) => {
              const isChecked = checked.includes(item.id);
              return (
                <label key={item.id} className={isChecked ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span aria-hidden="true">{isChecked ? '✓' : ''}</span>
                  <strong>{item.label}</strong>
                </label>
              );
            })}
          </div>
          <button type="button" className="checkout-detail-link" onClick={() => navigate('/guest/checkin', { state: { anchor: 'anchor-checkout' } })}>
            查看完整退房說明 →
          </button>
        </section>
      )}
    </>
  );
}

function countdownLabel(status: ReturnType<typeof getStayStatus>): string {
  switch (status.stage) {
    case 'before_checkin':
      return status.daysUntilCheckIn === 1 ? '明天入住' : `${status.daysUntilCheckIn} 天後入住`;
    case 'checkin_today':
      return '今天 15:00';
    case 'staying':
      return status.daysUntilCheckOut === 1 ? '明天退房' : `${status.daysUntilCheckOut} 天後退房`;
    case 'checkout_today':
      return '今天 11:00 前';
    case 'completed':
      return '已完成';
  }
}

function primaryAction(stage: StayStage): { label: string; path: string } {
  switch (stage) {
    case 'before_checkin':
      return { label: '🚃 查看抵達方式', path: '/guest/arrival' };
    case 'checkin_today':
      return { label: '🔑 開啟進房教學', path: '/guest/arrival' };
    case 'staying':
      return { label: '🔧 查看設施說明', path: '/guest/facilities' };
    case 'checkout_today':
      return { label: '🏁 查看退房須知', path: '/guest/checkin' };
    case 'completed':
      return { label: '🗺️ 查看東京推薦', path: '/guest/cityguide' };
  }
}
