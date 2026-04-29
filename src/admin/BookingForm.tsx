import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createBookingWithGuestAccessCode,
  deleteBookingWithGuestAccessCode,
  getGuestCodeWindow,
  updateBooking,
} from '@/lib/bookings';
import { Timestamp } from 'firebase/firestore';
import { useUsers } from './useUsers';
import { useEmailAccess } from './useEmailAccess';
import { grantGuestAccessForEmail } from '@/lib/users';
import { updateBookingGuestAccessCode } from '@/lib/guestAccessCodes';
import { useBookings } from './useBookings';
import { useKeys } from './useKeys';
import { normalizeKeyCode } from '@/lib/keys';
import type { Booking, PaymentStatus } from '@/types';

interface Props {
  /** Existing booking to edit, or null for create */
  booking: Booking | null;
  /** Default check-in date in yyyy-MM-dd if creating from a calendar click */
  defaultCheckIn?: string;
  onClose: () => void;
}

interface FormState {
  guestName: string;
  guestEmail: string;
  partySize: string;
  checkIn: string;
  checkOut: string;
  nightlyRate: string;
  amount: string;
  paymentStatus: PaymentStatus;
  paymentNotes: string;
  keyCode: string;
  keyLentAt: string;
  keyReturnedAt: string;
  notes: string;
}

const PAY_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'unpaid', label: '未付' },
  { value: 'partial', label: '部分付' },
  { value: 'paid', label: '已全額付' },
];

function toDateInput(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getNightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 86400000);
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

function buildInitialState(b: Booking | null, defaultCheckIn?: string): FormState {
  if (b) {
    const checkIn = toDateInput(b.checkIn);
    const checkOut = toDateInput(b.checkOut);
    const nights = getNightCount(checkIn, checkOut);
    return {
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      partySize: String(b.partySize),
      checkIn,
      checkOut,
      nightlyRate: nights > 0 ? String(Math.round(b.amount / nights)) : '0',
      amount: String(b.amount),
      paymentStatus: b.paymentStatus,
      paymentNotes: b.paymentNotes,
      keyCode: b.keyCode ?? '',
      keyLentAt: toDateInput(b.keyLentAt),
      keyReturnedAt: toDateInput(b.keyReturnedAt),
      notes: b.notes,
    };
  }
  return {
    guestName: '',
    guestEmail: '',
    partySize: '1',
    checkIn: defaultCheckIn ?? '',
    checkOut: '',
    nightlyRate: '2500',
    amount: '0',
    paymentStatus: 'unpaid',
    paymentNotes: '',
    keyCode: '',
    keyLentAt: '',
    keyReturnedAt: '',
    notes: '',
  };
}

export function BookingForm({ booking, defaultCheckIn, onClose }: Props) {
  const { users } = useUsers();
  const { emailAccess } = useEmailAccess();
  const { bookings } = useBookings();
  const { keys } = useKeys();
  const [state, setState] = useState<FormState>(() =>
    buildInitialState(booking, defaultCheckIn)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = booking !== null;
  const checkInRef = useRef<HTMLInputElement | null>(null);
  const checkOutRef = useRef<HTMLInputElement | null>(null);
  const keyLentAtRef = useRef<HTMLInputElement | null>(null);
  const keyReturnedAtRef = useRef<HTMLInputElement | null>(null);
  const lastAutoFilledNameRef = useRef<string>('');
  const emailOptions = Array.from(
    new Set(
      [...users.map((u) => u.email), ...emailAccess.map((item) => item.email)]
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
  const selectedKeyCode = normalizeKeyCode(state.keyCode);
  const selectedKeyExists = keys.some((key) => normalizeKeyCode(key.code) === selectedKeyCode);
  const keyOptions = keys.map((key) => {
    const code = normalizeKeyCode(key.code);
    const loanedBooking = bookings.find((item) => {
      if (booking && item.id === booking.id) return false;
      return (
        normalizeKeyCode(item.keyCode || '') === code &&
        item.keyLentAt &&
        !item.keyReturnedAt
      );
    });
    return {
      key,
      code,
      disabled: !key.active || Boolean(loanedBooking),
      reason: !key.active
        ? '已停用'
        : loanedBooking
          ? `出借中：${loanedBooking.guestName}`
          : '可出借',
    };
  });

  useEffect(() => {
    const normalizedEmail = state.guestEmail.trim().toLowerCase();
    if (!normalizedEmail) return;

    const matchedUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    const matchedBooking = bookings.find(
      (item) => item.guestEmail.toLowerCase() === normalizedEmail
    );
    const suggestedName =
      matchedUser?.displayName?.trim() || matchedBooking?.guestName?.trim() || '';

    if (!suggestedName) return;
    if (
      !state.guestName.trim() ||
      state.guestName === lastAutoFilledNameRef.current
    ) {
      lastAutoFilledNameRef.current = suggestedName;
      setState((prev) =>
        prev.guestName === suggestedName ? prev : { ...prev, guestName: suggestedName }
      );
    }
  }, [state.guestEmail, state.guestName, users, bookings]);

  useEffect(() => {
    setState(buildInitialState(booking, defaultCheckIn));
  }, [booking, defaultCheckIn]);

  useEffect(() => {
    const nights = getNightCount(state.checkIn, state.checkOut);
    const nightlyRate = Number(state.nightlyRate);
    if (!Number.isFinite(nightlyRate) || nightlyRate < 0) return;
    const nextAmount = String(nights * nightlyRate);
    setState((s) => (s.amount === nextAmount ? s : { ...s, amount: nextAmount }));
  }, [state.checkIn, state.checkOut, state.nightlyRate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) return;
    input.focus();
    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };
    pickerInput.showPicker?.();
  }

  function validate(): string | null {
    if (!state.guestName.trim()) return '請填房客姓名';
    if (!state.guestEmail.trim()) return '請填 Email';
    if (!state.checkIn) return '請選入住日期';
    if (!state.checkOut) return '請選退房日期';
    if (state.checkIn >= state.checkOut) return '退房日期需在入住日期之後';
    const conflict = bookings.find((item) => {
      if (booking && item.id === booking.id) return false;
      return rangesOverlap(
        state.checkIn,
        state.checkOut,
        toDateInput(item.checkIn),
        toDateInput(item.checkOut)
      );
    });
    if (conflict) {
      const conflictStart = toDateInput(conflict.checkIn);
      const conflictEnd = toDateInput(conflict.checkOut);
      return `此期間與「${conflict.guestName}」的預約衝突（${conflictStart} 至 ${conflictEnd}）。目前只有一間房，請調整入住或退房日期。`;
    }
    if (!Number.isFinite(Number(state.nightlyRate)) || Number(state.nightlyRate) < 0)
      return '每日房價需為非負數';
    if (!Number.isFinite(Number(state.amount)) || Number(state.amount) < 0)
      return '金額需為非負數';
    if (Number(state.partySize) < 1) return '人數至少 1';
    if (selectedKeyCode) {
      const key = keys.find((item) => normalizeKeyCode(item.code) === selectedKeyCode);
      if (!key) return `請先到「鑰匙管理」新增鑰匙 ${selectedKeyCode}，再選擇使用。`;
      if (!key.active) return `鑰匙 ${selectedKeyCode} 已停用，請選擇其他鑰匙。`;
      const loanedBooking = bookings.find((item) => {
        if (booking && item.id === booking.id) return false;
        return (
          normalizeKeyCode(item.keyCode || '') === selectedKeyCode &&
          item.keyLentAt &&
          !item.keyReturnedAt
        );
      });
      if (loanedBooking) {
        return `鑰匙 ${selectedKeyCode} 目前已出借給「${loanedBooking.guestName}」，歸還前不能選用。`;
      }
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && booking) {
        const checkIn = new Date(`${state.checkIn}T15:00`);
        const checkOut = new Date(`${state.checkOut}T11:00`);
        await updateBooking(booking.id, {
          guestName: state.guestName,
          guestEmail: state.guestEmail.trim().toLowerCase(),
          partySize: Number(state.partySize),
          checkIn: Timestamp.fromDate(checkIn),
          checkOut: Timestamp.fromDate(checkOut),
          amount: Number(state.amount),
          paymentStatus: state.paymentStatus,
          paymentNotes: state.paymentNotes,
          keyCode: selectedKeyCode || null,
          keyLentAt: state.keyLentAt
            ? Timestamp.fromDate(new Date(`${state.keyLentAt}T00:00`))
            : null,
          keyReturnedAt: state.keyReturnedAt
            ? Timestamp.fromDate(new Date(`${state.keyReturnedAt}T00:00`))
            : null,
          notes: state.notes,
        });
        if (booking.guestAccessCode) {
          const { startsAt, expiresAt } = getGuestCodeWindow(checkIn, checkOut);
          await updateBookingGuestAccessCode({
            code: booking.guestAccessCode,
            label: `${state.guestName} 的預約訪客碼`,
            bookingId: booking.id,
            guestEmail: state.guestEmail,
            guestName: state.guestName,
            startsAt,
            expiresAt,
          });
        }
        await grantGuestAccessForEmail(state.guestEmail, booking.id);
      } else {
        const input = {
          guestUid: null,
          guestEmail: state.guestEmail,
          guestName: state.guestName,
          partySize: Number(state.partySize),
          checkIn: new Date(`${state.checkIn}T15:00`),
          checkOut: new Date(`${state.checkOut}T11:00`),
          amount: Number(state.amount),
          paymentStatus: state.paymentStatus,
          paymentNotes: state.paymentNotes,
          keyCode: selectedKeyCode || null,
          notes: state.notes,
        };
        const { bookingId } = await createBookingWithGuestAccessCode(input);
        await grantGuestAccessForEmail(state.guestEmail, bookingId);
      }
      onClose();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : '儲存失敗');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;
    if (!confirm(`確定要刪除「${booking.guestName}」的預約嗎？`)) return;
    setSubmitting(true);
    try {
      await deleteBookingWithGuestAccessCode(booking.id, booking.guestAccessCode);
      onClose();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : '刪除失敗');
      setSubmitting(false);
    }
  }

  const nightCount = getNightCount(state.checkIn, state.checkOut);

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isEdit ? '編輯預約' : '新增預約'}</h2>

      <div className="form-grid">
        <div className="form-field">
          <label>姓名 *</label>
          <input
            value={state.guestName}
            onChange={(e) => {
              lastAutoFilledNameRef.current = '';
              update('guestName', e.target.value);
            }}
            required
          />
        </div>

        <div className="form-field">
          <label>人數 *</label>
          <input
            type="number"
            min={1}
            value={state.partySize}
            onChange={(e) => update('partySize', e.target.value)}
            required
          />
        </div>

        <div className="form-field full">
          <label>Email *</label>
          <input
            type="email"
            value={state.guestEmail}
            list="guest-email-options"
            onChange={(e) => update('guestEmail', e.target.value)}
            required
          />
          <datalist id="guest-email-options">
            {emailOptions.map((email) => (
              <option key={email} value={email} />
            ))}
          </datalist>
          <span className="helper-text">
            可直接輸入，或輸入幾個字後從既有 Gmail 清單中選擇。儲存預約時，這個 Email 也會自動加入授權清單。
          </span>
        </div>

        <div className="form-field">
          <label>入住日 *</label>
          <div className="date-input-row">
            <input
              ref={checkInRef}
              type="date"
              value={state.checkIn}
              onChange={(e) => update('checkIn', e.target.value)}
              required
            />
            <button
              type="button"
              className="picker-button"
              onClick={() => openDatePicker(checkInRef.current)}
            >
              選日期
            </button>
          </div>
          <span className="helper-text">可直接輸入，或點右側按鈕開啟日曆。</span>
        </div>

        <div className="form-field">
          <label>退房日 *</label>
          <div className="date-input-row">
            <input
              ref={checkOutRef}
              type="date"
              value={state.checkOut}
              min={state.checkIn || undefined}
              onChange={(e) => update('checkOut', e.target.value)}
              required
            />
            <button
              type="button"
              className="picker-button"
              onClick={() => openDatePicker(checkOutRef.current)}
            >
              選日期
            </button>
          </div>
          <span className="helper-text">可直接輸入，或點右側按鈕開啟日曆。</span>
        </div>

        <div className="form-field">
          <label>每日房價 (TWD)</label>
          <div className="currency-input-row">
            <span className="currency-prefix">TWD</span>
            <input
              type="number"
              min={0}
              step={1}
              value={state.nightlyRate}
              onChange={(e) => update('nightlyRate', e.target.value)}
            />
          </div>
          <span className="helper-text">
            {nightCount > 0 ? `共 ${nightCount} 晚，會自動換算總金額。` : '先選入住與退房日期，再自動計算總金額。'}
          </span>
        </div>

        <div className="form-field">
          <label>金額 (TWD)</label>
          <div className="currency-input-row">
            <span className="currency-prefix">TWD</span>
            <input
              type="number"
              min={0}
              step={1}
              value={state.amount}
              readOnly
            />
          </div>
          <span className="helper-text">總金額 = 晚數 × 每日房價。</span>
        </div>

        <div className="form-field">
          <label>付款狀態</label>
          <select
            value={state.paymentStatus}
            onChange={(e) => update('paymentStatus', e.target.value as PaymentStatus)}
          >
            {PAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field full">
          <label>付款備註</label>
          <input
            value={state.paymentNotes}
            onChange={(e) => update('paymentNotes', e.target.value)}
            placeholder="如：分兩期、Airbnb 收款、訂金 TWD 5000"
          />
        </div>

        <div className="form-field">
          <label>鑰匙</label>
          <select
            value={selectedKeyCode}
            onChange={(e) => update('keyCode', e.target.value)}
          >
            <option value="">未指定</option>
            {selectedKeyCode && !selectedKeyExists && (
              <option value={selectedKeyCode}>
                {selectedKeyCode}（尚未建立於鑰匙管理）
              </option>
            )}
            {keyOptions.map(({ key, code, disabled, reason }) => (
              <option key={key.id} value={code} disabled={disabled && code !== selectedKeyCode}>
                {key.label === code ? code : `${code} - ${key.label}`}（{reason}）
              </option>
            ))}
          </select>
          <span className="helper-text">
            鑰匙需先在「鑰匙管理」新增；已出借且尚未歸還的鑰匙不能被其他預約選用。
          </span>
        </div>

        {isEdit && (
          <>
            <div className="form-field">
              <label>鑰匙出借日</label>
              <div className="date-input-row">
                <input
                  ref={keyLentAtRef}
                  type="date"
                  value={state.keyLentAt}
                  onChange={(e) => update('keyLentAt', e.target.value)}
                />
                <button
                  type="button"
                  className="picker-button"
                  onClick={() => openDatePicker(keyLentAtRef.current)}
                >
                  選日期
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>鑰匙歸還日</label>
              <div className="date-input-row">
                <input
                  ref={keyReturnedAtRef}
                  type="date"
                  value={state.keyReturnedAt}
                  onChange={(e) => update('keyReturnedAt', e.target.value)}
                />
                <button
                  type="button"
                  className="picker-button"
                  onClick={() => openDatePicker(keyReturnedAtRef.current)}
                >
                  選日期
                </button>
              </div>
            </div>
          </>
        )}

        <div className="form-field full">
          <label>備註</label>
          <textarea
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="特殊需求、來源平台訂單編號、聯絡方式…"
          />
        </div>
      </div>

      {error && <p className="field-error" style={{ marginTop: 12 }}>{error}</p>}

      <div className="form-actions">
        {isEdit && (
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={submitting}
            style={{ marginRight: 'auto' }}
          >
            刪除
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="btn-gold" disabled={submitting}>
          {submitting ? '儲存中…' : isEdit ? '更新' : '建立'}
        </button>
      </div>
    </form>
  );
}
