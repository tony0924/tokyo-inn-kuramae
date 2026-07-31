import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  deleteGuestFlightPlan,
  getGuestFlightPlans,
  saveGuestFlightPlan,
  type SaveGuestFlightInput,
} from '@/lib/guestFlights';
import type {
  Booking,
  GuestFlightAirport,
  GuestFlightDirection,
  GuestFlightPlan,
} from '@/types';

const EMPTY_FORM: Omit<SaveGuestFlightInput, 'bookingId'> = {
  direction: 'arrival',
  flightNumber: '',
  flightDate: '',
  scheduledTime: '',
  airport: 'NRT',
  terminal: '',
};

export function GuestFlightCard({ booking }: { booking: Booking }) {
  const [plans, setPlans] = useState<GuestFlightPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingDirection, setEditingDirection] = useState<GuestFlightDirection | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlans(await getGuestFlightPlans(booking.id));
    } catch {
      setError('暫時無法載入航班資料，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.direction.localeCompare(b.direction)),
    [plans]
  );

  const startAdd = (direction: GuestFlightDirection) => {
    setEditingDirection(null);
    setForm({
      ...EMPTY_FORM,
      direction,
      flightDate: format(
        direction === 'arrival' ? booking.checkIn.toDate() : booking.checkOut.toDate(),
        'yyyy-MM-dd'
      ),
      airport: 'NRT',
    });
    setError('');
    setShowForm(true);
  };

  const startEdit = (plan: GuestFlightPlan) => {
    setEditingDirection(plan.direction);
    setForm({
      direction: plan.direction,
      flightNumber: plan.flightNumber,
      flightDate: plan.flightDate,
      scheduledTime: plan.scheduledTime,
      airport: plan.airport,
      terminal: plan.terminal || '',
    });
    setError('');
    setShowForm(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const plan = await saveGuestFlightPlan({
        bookingId: booking.id,
        ...form,
        flightNumber: form.flightNumber.trim(),
        terminal: form.terminal.trim(),
      });
      setPlans((current) => [
        ...current.filter((item) => item.direction !== plan.direction),
        plan,
      ]);
      setShowForm(false);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '';
      setError(message.includes('航班') ? message : '儲存失敗，請確認資料後再試一次。');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan: GuestFlightPlan) => {
    if (!window.confirm(`確定要移除 ${plan.flightNumber} 的航班資料嗎？`)) return;
    setError('');
    try {
      await deleteGuestFlightPlan(booking.id, plan.direction);
      setPlans((current) => current.filter((item) => item.direction !== plan.direction));
    } catch {
      setError('無法移除航班資料，請稍後再試。');
    }
  };

  return (
    <section className="guest-flight-widget" aria-labelledby="guest-flight-title">
      <div className="guest-flight-heading">
        <div>
          <p>我的航班</p>
          <h2 id="guest-flight-title">機場交通提醒</h2>
        </div>
        <span aria-hidden="true">✈️</span>
      </div>

      {loading ? (
        <div className="guest-flight-loading">正在載入已儲存的航班…</div>
      ) : (
        <>
          {sortedPlans.length > 0 && (
            <div className="guest-flight-list">
              {sortedPlans.map((plan) => (
                <FlightPlanSummary
                  key={plan.id}
                  plan={plan}
                  onEdit={() => startEdit(plan)}
                  onRemove={() => void remove(plan)}
                />
              ))}
            </div>
          )}

          {!showForm && (
            <div className="guest-flight-add-actions">
              {!plans.some((plan) => plan.direction === 'arrival') && (
                <button type="button" onClick={() => startAdd('arrival')}>＋ 新增抵達航班</button>
              )}
              {!plans.some((plan) => plan.direction === 'departure') && (
                <button type="button" onClick={() => startAdd('departure')}>＋ 新增回程航班</button>
              )}
            </div>
          )}

          {showForm && (
            <form className="guest-flight-form" onSubmit={submit}>
              <div className="guest-flight-direction" role="group" aria-label="航班方向">
                <button
                  type="button"
                  className={form.direction === 'arrival' ? 'active' : ''}
                  disabled={editingDirection !== null || plans.some((plan) => plan.direction === 'arrival')}
                  onClick={() => setForm((current) => ({ ...current, direction: 'arrival' }))}
                >抵達東京</button>
                <button
                  type="button"
                  className={form.direction === 'departure' ? 'active' : ''}
                  disabled={editingDirection !== null || plans.some((plan) => plan.direction === 'departure')}
                  onClick={() => setForm((current) => ({ ...current, direction: 'departure' }))}
                >前往機場</button>
              </div>
              <div className="guest-flight-form-grid">
                <label>
                  <span>航班號碼</span>
                  <input
                    required
                    maxLength={8}
                    autoCapitalize="characters"
                    placeholder="例如 BR198"
                    value={form.flightNumber}
                    onChange={(event) => setForm((current) => ({ ...current, flightNumber: event.target.value.toUpperCase() }))}
                  />
                </label>
                <label>
                  <span>航班日期</span>
                  <input
                    required
                    type="date"
                    value={form.flightDate}
                    onChange={(event) => setForm((current) => ({ ...current, flightDate: event.target.value }))}
                  />
                </label>
                <label>
                  <span>{form.direction === 'arrival' ? '預定抵達時間' : '預定起飛時間'}</span>
                  <input
                    required
                    type="time"
                    value={form.scheduledTime}
                    onChange={(event) => setForm((current) => ({ ...current, scheduledTime: event.target.value }))}
                  />
                </label>
                <label>
                  <span>機場</span>
                  <select
                    value={form.airport}
                    onChange={(event) => setForm((current) => ({ ...current, airport: event.target.value as GuestFlightAirport }))}
                  >
                    <option value="NRT">成田機場 NRT</option>
                    <option value="HND">羽田機場 HND</option>
                  </select>
                </label>
                <label className="guest-flight-terminal-field">
                  <span>航廈（選填）</span>
                  <input
                    maxLength={30}
                    placeholder="例如 第 2 航廈"
                    value={form.terminal}
                    onChange={(event) => setForm((current) => ({ ...current, terminal: event.target.value }))}
                  />
                </label>
              </div>
              <p className="guest-flight-form-note">
                第一版請依電子機票填寫表定時間；儲存後下次登入會自動顯示，不必重填。
              </p>
              <div className="guest-flight-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '正在儲存並計算路線…' : '儲存航班'}
                </button>
                <button type="button" className="btn-ghost" disabled={saving} onClick={() => setShowForm(false)}>
                  取消
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {error && <p className="guest-flight-error" role="alert">{error}</p>}
    </section>
  );
}

function FlightPlanSummary({
  plan,
  onEdit,
  onRemove,
}: {
  plan: GuestFlightPlan;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const directionLabel = plan.direction === 'arrival' ? '抵達東京' : '回程出發';
  const scheduleLabel = plan.direction === 'arrival' ? '表定抵達' : '表定起飛';
  const route = plan.route;
  const firstRailStep = route?.transitSteps.find((step) => step.departureTime);

  return (
    <article className="guest-flight-plan">
      <div className="guest-flight-plan-topline">
        <span>{directionLabel}</span>
        <strong>{plan.flightNumber}</strong>
      </div>
      <div className="guest-flight-schedule">
        <strong>{formatFlightDate(plan.flightDate)}</strong>
        <span>{scheduleLabel} {plan.scheduledTime}</span>
        <small>{plan.airportName}{plan.terminal ? `・${plan.terminal}` : ''}</small>
      </div>

      {route && firstRailStep ? (
        <div className="guest-flight-route">
          <span>建議交通</span>
          <strong>
            {formatJapanTime(firstRailStep.departureTime)} 搭乘 {firstRailStep.lineName}
          </strong>
          <small>
            {firstRailStep.departureStop || '機場'} → {firstRailStep.arrivalStop || '藏前方向'}
            {route.durationMinutes ? `・全程約 ${route.durationMinutes} 分鐘` : ''}
          </small>
        </div>
      ) : (
        <div className="guest-flight-route unavailable">
          <span>交通班次尚未產生</span>
          <small>可能是日期超過可查詢範圍，接近出發日可按「編輯」後再次儲存更新。</small>
        </div>
      )}

      <p className="guest-flight-buffer-note">
        {plan.direction === 'arrival'
          ? '已預留 1 小時 45 分入境與領行李時間。'
          : '以起飛前 3 小時抵達機場回推。'}
      </p>
      <div className="guest-flight-plan-actions">
        <a href={plan.mapsUrl} target="_blank" rel="noreferrer">開啟完整路線</a>
        <button type="button" onClick={onEdit}>編輯</button>
        <button type="button" className="danger" onClick={onRemove}>移除</button>
      </div>
    </article>
  );
}

function formatFlightDate(value: string): string {
  const date = new Date(`${value}T12:00:00+09:00`);
  return format(date, 'M月d日 EEE', { locale: zhTW });
}

function formatJapanTime(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
