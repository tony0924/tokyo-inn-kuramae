import type { Booking } from '@/types';

export type StayStage =
  | 'before_checkin'
  | 'checkin_today'
  | 'staying'
  | 'checkout_today'
  | 'completed';

export interface StayStatus {
  stage: StayStage;
  daysUntilCheckIn: number;
  daysUntilCheckOut: number;
  stayDay: number | null;
  totalStayDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const APP_TIME_ZONE = 'Asia/Tokyo';
const DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function calendarDayNumber(value: Date): number {
  const parts = DATE_PARTS_FORMATTER.formatToParts(value);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return Date.UTC(year, month - 1, day);
}

function calendarDayDifference(later: Date, earlier: Date): number {
  return Math.round((calendarDayNumber(later) - calendarDayNumber(earlier)) / DAY_MS);
}

export function getStayStatus(
  booking: Pick<Booking, 'checkIn' | 'checkOut'>,
  now: Date = new Date()
): StayStatus {
  const checkIn = booking.checkIn.toDate();
  const checkOut = booking.checkOut.toDate();
  const daysUntilCheckIn = calendarDayDifference(checkIn, now);
  const daysUntilCheckOut = calendarDayDifference(checkOut, now);
  const totalStayDays = Math.max(1, calendarDayDifference(checkOut, checkIn));

  let stage: StayStage;
  if (daysUntilCheckIn > 0) {
    stage = 'before_checkin';
  } else if (daysUntilCheckIn === 0) {
    stage = 'checkin_today';
  } else if (daysUntilCheckOut > 0) {
    stage = 'staying';
  } else if (daysUntilCheckOut === 0) {
    stage = 'checkout_today';
  } else {
    stage = 'completed';
  }

  const stayDay =
    stage === 'checkin_today' || stage === 'staying'
      ? Math.min(totalStayDays, calendarDayDifference(now, checkIn) + 1)
      : null;

  return {
    stage,
    daysUntilCheckIn,
    daysUntilCheckOut,
    stayDay,
    totalStayDays,
  };
}

export function selectOperationalBooking(
  bookings: Booking[],
  now: Date = new Date()
): Booking | null {
  const activeOrFuture = bookings
    .filter((booking) => getStayStatus(booking, now).stage !== 'completed')
    .sort((a, b) => {
      const aStatus = getStayStatus(a, now);
      const bStatus = getStayStatus(b, now);
      const priority: Record<StayStage, number> = {
        checkout_today: 0,
        checkin_today: 1,
        staying: 2,
        before_checkin: 3,
        completed: 4,
      };
      const stageOrder = priority[aStatus.stage] - priority[bStatus.stage];
      return stageOrder || a.checkIn.toMillis() - b.checkIn.toMillis();
    });

  return activeOrFuture[0] ?? null;
}
