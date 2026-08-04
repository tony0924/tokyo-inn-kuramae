import { useMemo } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Modal } from './Modal';
import { useBookings } from './useBookings';
import { getStayStatus, type StayStatus } from '@/lib/stayStatus';

export function GuestPreviewPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (bookingId: string | null) => void;
}) {
  const { bookings, loading } = useBookings();
  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((booking) => getStayStatus(booking).stage !== 'completed')
        .sort((first, second) => (
          first.checkIn.toMillis() - second.checkIn.toMillis()
          || first.guestName.localeCompare(second.guestName, 'zh-Hant')
        )),
    [bookings]
  );

  return (
    <Modal open={open} onClose={onClose}>
      <section className="guest-preview-picker" aria-labelledby="guest-preview-picker-title">
        <header className="guest-preview-picker-heading">
          <div>
            <p>GUEST VIEW PREVIEW</p>
            <h2 id="guest-preview-picker-title">選擇要預覽的住客</h2>
            <span>預覽住客登入後看到的姓名、住宿階段與首頁資訊。</span>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉住客預覽選擇器">×</button>
        </header>

        {loading ? (
          <div className="guest-preview-picker-loading" role="status">
            正在載入接下來的住客…
          </div>
        ) : upcomingBookings.length > 0 ? (
          <div className="guest-preview-booking-list">
            {upcomingBookings.map((booking, index) => {
              const status = getStayStatus(booking);
              return (
                <button
                  type="button"
                  className="guest-preview-booking"
                  key={booking.id}
                  onClick={() => onSelect(booking.id)}
                >
                  <span className="guest-preview-booking-number">{index + 1}</span>
                  <span className="guest-preview-booking-copy">
                    <strong>{booking.guestName || '未填寫住客姓名'}</strong>
                    <small>
                      {format(booking.checkIn.toDate(), 'M月d日 EEE', { locale: zhTW })}
                      {' → '}
                      {format(booking.checkOut.toDate(), 'M月d日 EEE', { locale: zhTW })}
                      {' · '}
                      {booking.partySize} 人
                    </small>
                  </span>
                  <span className={`guest-preview-stage stage-${status.stage}`}>
                    {previewStageLabel(status)}
                  </span>
                  <span className="guest-preview-booking-arrow" aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="guest-preview-empty">
            <span aria-hidden="true">🏠</span>
            <strong>目前沒有住宿中或接下來的住客</strong>
            <p>可以預覽尚未綁定預約時，房客指南會呈現的通用畫面。</p>
            <button type="button" className="btn-gold" onClick={() => onSelect(null)}>
              查看無住客狀態
            </button>
          </div>
        )}

        {upcomingBookings.length > 0 && (
          <footer className="guest-preview-picker-footer">
            <span>只列出住宿中與尚未入住的預約。</span>
            <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
          </footer>
        )}
      </section>
    </Modal>
  );
}

function previewStageLabel(status: StayStatus): string {
  switch (status.stage) {
    case 'before_checkin':
      return status.daysUntilCheckIn === 1 ? '明天入住' : `${status.daysUntilCheckIn} 天後入住`;
    case 'checkin_today':
      return '今天入住';
    case 'staying':
      return `入住第 ${status.stayDay} 天`;
    case 'checkout_today':
      return '今天退房';
    case 'completed':
      return '已退房';
  }
}
