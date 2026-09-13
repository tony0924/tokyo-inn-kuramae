import type { Booking } from "@/types";

const dayMs = 86400000;
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function dayNumber(date: Date): number {
  if (!Number.isFinite(date.getTime())) return NaN;
  return Date.parse(`${dateFormatter.format(date)}T00:00:00Z`) / dayMs;
}

/** Single property: check-in inclusive, checkout exclusive; count each night once. */
export function bookingOccupancy(
  bookings: Pick<Booking, "checkIn" | "checkOut">[],
  year: number,
  today = new Date(),
  openingDate = "",
) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new Error("無效年度");
  const start = Date.UTC(year, 0, 1) / dayMs;
  const end = Date.UTC(year + 1, 0, 1) / dayMs;
  const opening = openingDate
    ? Date.parse(`${openingDate}T00:00:00Z`) / dayMs
    : start;
  const availableStart = Math.max(
    start,
    Number.isFinite(opening) ? opening : start,
  );
  const cutoff = dayNumber(today);
  const occupied = new Set<number>();
  let invalidBookings = 0;
  for (const booking of bookings) {
    const checkIn = booking.checkIn?.toDate();
    const checkOut = booking.checkOut?.toDate();
    const first = checkIn ? dayNumber(checkIn) : NaN;
    const last = checkOut ? dayNumber(checkOut) : NaN;
    if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) {
      invalidBookings++;
      continue;
    }
    for (
      let day = Math.max(first, availableStart);
      day < Math.min(last, end);
      day++
    )
      occupied.add(day);
  }
  const months = Array.from({ length: 12 }, (_, index) => {
    const first = Math.max(Date.UTC(year, index, 1) / dayMs, availableStart);
    const last = Date.UTC(year, index + 1, 1) / dayMs;
    let stayed = 0,
      upcoming = 0;
    for (let day = first; day < last; day++) {
      if (occupied.has(day)) {
        if (day < cutoff) stayed++;
        else upcoming++;
      }
    }
    const available = Math.max(0, last - first);
    return {
      month: `${year}-${String(index + 1).padStart(2, "0")}`,
      available,
      stayed,
      upcoming,
      unbooked: available - stayed - upcoming,
    };
  });
  const available = months.reduce((sum, m) => sum + m.available, 0);
  const stayed = months.reduce((sum, m) => sum + m.stayed, 0);
  const upcoming = months.reduce((sum, m) => sum + m.upcoming, 0);
  const elapsed = Math.max(
    0,
    Math.min(cutoff, end) - Math.min(availableStart, end),
  );
  return { months, available, stayed, upcoming, elapsed, invalidBookings };
}
