import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import type { StayStage, StayStatus } from '@/lib/stayStatus';
import type { Booking } from '@/types';
import { useAuth } from '@/auth/AuthProvider';
import { getStoredGuestAccessCode } from '@/lib/guestAccessCodes';
import { recordGuestPageEvent } from '@/lib/guestAnalytics';

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
    eyebrow: '住宿進行中',
    title: '今天是入住第 1 天',
    description: '歡迎來到藏前，抵達後可從進房教學確認入口、電梯與電子鎖。',
    icon: '🔑',
  },
  staying: {
    eyebrow: '住宿中',
    title: '今天的東京行程開始了',
    description: '下方整理今天的天氣與每日推薦，祝你在東京玩得開心。',
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

export function StayOverviewCard({
  booking,
  status,
}: {
  booking: Booking;
  status: StayStatus;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const baseCopy = STAGE_COPY[status.stage];
  const copy =
    status.stage === 'staying' && status.stayDay
      ? { ...baseCopy, title: `今天是入住第 ${status.stayDay} 天` }
      : baseCopy;
  const checkIn = booking.checkIn.toDate();
  const checkOut = booking.checkOut.toDate();
  const primary = primaryAction(status.stage);
  const secondary = secondaryAction(status.stage);
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
      const completed = CHECKOUT_ITEMS.filter((item) => next.includes(item.id)).length;
      recordGuestPageEvent({
        eventType: 'checkout_checklist',
        path: '/guest/home',
        user,
        guestAccessCode: !user ? getStoredGuestAccessCode() : null,
        targetId: id,
        value: Math.round((completed / CHECKOUT_ITEMS.length) * 100),
      }).catch((error) => console.warn('record checkout checklist failed', error));
      return next;
    });
  };

  const completedCount = CHECKOUT_ITEMS.filter((item) => checked.includes(item.id)).length;
  const showChecklist = status.stage === 'checkout_today';

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
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(primary.path, primary.state ? { state: primary.state } : undefined)}
          >
            {primary.label}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate(secondary.path, secondary.state ? { state: secondary.state } : undefined)}
          >
            {secondary.label}
          </button>
        </div>
      </section>

      {status.stage === 'before_checkin' && (
        <section className="prestay-guide-card" aria-labelledby="prestay-guide-title">
          <div className="prestay-guide-heading">
            <div>
              <p>BEFORE YOUR STAY · 入住前準備</p>
              <h2 id="prestay-guide-title">先確認抵達與入住方式</h2>
            </div>
            <span aria-hidden="true">🧳</span>
          </div>
          <div className="prestay-guide-grid">
            <button type="button" onClick={() => navigate('/guest/airport')}>
              <span aria-hidden="true">✈️</span>
              <strong>機場到住宿</strong>
              <small>成田、羽田交通與藏前站出口</small>
            </button>
            <button type="button" onClick={() => navigate('/guest/arrival')}>
              <span aria-hidden="true">🚃</span>
              <strong>抵達與進房</strong>
              <small>建築入口、電梯與房門位置</small>
            </button>
            <button type="button" onClick={() => navigate('/guest/checkin')}>
              <span aria-hidden="true">📋</span>
              <strong>入住須知</strong>
              <small>床單、室內規則與設備準備</small>
            </button>
          </div>
        </section>
      )}

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

function countdownLabel(status: StayStatus): string {
  switch (status.stage) {
    case 'before_checkin':
      return status.daysUntilCheckIn === 1 ? '明天入住' : `${status.daysUntilCheckIn} 天後入住`;
    case 'checkin_today':
      return '入住第 1 天';
    case 'staying':
      return `入住第 ${status.stayDay} 天`;
    case 'checkout_today':
      return '今天 11:00 前';
    case 'completed':
      return '已完成';
  }
}

interface StayAction {
  label: string;
  path: string;
  state?: { anchor: string };
}

function primaryAction(stage: StayStage): StayAction {
  switch (stage) {
    case 'before_checkin':
      return { label: '🚃 查看抵達方式', path: '/guest/arrival' };
    case 'checkin_today':
      return { label: '🔑 開啟進房教學', path: '/guest/arrival' };
    case 'staying':
      return { label: '🍜 查看今日推薦', path: '/guest/restaurant' };
    case 'checkout_today':
      return { label: '🏁 查看退房須知', path: '/guest/checkin' };
    case 'completed':
      return { label: '🗺️ 查看東京推薦', path: '/guest/cityguide' };
  }
}

function secondaryAction(stage: StayStage): StayAction {
  switch (stage) {
    case 'before_checkin':
      return { label: '✈️ 查看機場交通', path: '/guest/airport' };
    case 'checkin_today':
      return { label: '📋 查看入住須知', path: '/guest/checkin' };
    case 'staying':
      return { label: '🗺️ 查看東京景點', path: '/guest/cityguide' };
    case 'checkout_today':
      return {
        label: '🗑️ 查看垃圾位置',
        path: '/guest/arrival',
        state: { anchor: 'anchor-garbage' },
      };
    case 'completed':
      return { label: '💬 查看推薦牆', path: '/guest/messages' };
  }
}
