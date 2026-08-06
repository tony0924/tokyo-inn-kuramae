export function buildBookingDateChangeBody(before, after, formatDate) {
  const changes = [];
  if (!timestampsEqual(before?.checkIn, after?.checkIn)) {
    changes.push(
      `入住：${formatDate(before?.checkIn)} → ${formatDate(after?.checkIn)}`
    );
  }
  if (!timestampsEqual(before?.checkOut, after?.checkOut)) {
    changes.push(
      `退房：${formatDate(before?.checkOut)} → ${formatDate(after?.checkOut)}`
    );
  }
  return changes.join("；");
}

function timestampsEqual(first, second) {
  return first?.toMillis?.() === second?.toMillis?.();
}
