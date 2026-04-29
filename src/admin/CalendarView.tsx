import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useBookings } from './useBookings';
import { Modal } from './Modal';
import { BookingForm } from './BookingForm';
import type { Booking, PaymentStatus } from '@/types';

const PAY_COLOR: Record<PaymentStatus, string> = {
  unpaid: 'var(--pay-unpaid)',
  partial: 'var(--pay-partial)',
  paid: 'var(--pay-paid)',
};

export function CalendarView() {
  const { bookings, loading } = useBookings();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const events = useMemo(
    () =>
      bookings.map((b) => ({
        id: b.id,
        title: b.guestName,
        start: b.checkIn.toDate(),
        end: b.checkOut.toDate(),
        backgroundColor: PAY_COLOR[b.paymentStatus],
        borderColor: PAY_COLOR[b.paymentStatus],
        textColor: b.paymentStatus === 'paid' ? 'var(--ink)' : '#fff',
        extendedProps: { booking: b },
      })),
    [bookings]
  );

  function openCreate(dateStr?: string) {
    setEditing(null);
    setCreateDate(dateStr ?? null);
    setShowForm(true);
  }

  function openEdit(b: Booking) {
    setEditing(b);
    setCreateDate(null);
    setShowForm(true);
  }

  function close() {
    setShowForm(false);
    setEditing(null);
    setCreateDate(null);
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">行事曆</h1>
        <button type="button" className="btn-gold" onClick={() => openCreate()}>
          ＋ 新增預約
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          locale="zh-tw"
          firstDay={1}
          headerToolbar={{
            start: 'prev,next today',
            center: 'title',
            end: '',
          }}
          buttonText={{ today: '今天' }}
          events={events}
          dateClick={(info) => openCreate(info.dateStr)}
          eventClick={(info) => {
            const b = info.event.extendedProps.booking as Booking | undefined;
            if (b) openEdit(b);
          }}
          dayMaxEvents={3}
          displayEventTime={false}
        />
      )}

      <Modal open={showForm} onClose={close}>
        <BookingForm
          booking={editing}
          defaultCheckIn={createDate ?? undefined}
          onClose={close}
        />
      </Modal>

      <CalendarLegend />
    </div>
  );
}

function CalendarLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        marginTop: 20,
        fontSize: 12,
        color: 'var(--text-mid)',
        flexWrap: 'wrap',
      }}
    >
      <LegendDot color="var(--pay-unpaid)" label="未付" />
      <LegendDot color="var(--pay-partial)" label="部分付" />
      <LegendDot color="var(--pay-paid)" label="已全額付" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
        }}
      />
      {label}
    </span>
  );
}
