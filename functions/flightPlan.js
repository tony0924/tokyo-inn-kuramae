export const AIRPORTS = {
  NRT: {
    name: "成田機場",
    routeLocation: "Narita International Airport",
  },
  HND: {
    name: "羽田機場",
    routeLocation: "Haneda Airport",
  },
};

export const STAY_ROUTE_LOCATION =
  "東京都台東区蔵前4丁目23-7 日神デュオステージ蔵前NEXT";

export function normalizeFlightPlanInput(data) {
  const direction = data?.direction === "departure" ? "departure" : data?.direction === "arrival" ? "arrival" : "";
  const flightNumber = String(data?.flightNumber || "")
    .replace(/\s+/g, "")
    .toUpperCase();
  const flightDate = String(data?.flightDate || "");
  const scheduledTime = String(data?.scheduledTime || "");
  const airport = String(data?.airport || "").toUpperCase();
  const terminal = String(data?.terminal || "").trim().slice(0, 30);

  if (!direction) throw new Error("INVALID_DIRECTION");
  if (!/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber)) throw new Error("INVALID_FLIGHT_NUMBER");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flightDate)) throw new Error("INVALID_DATE");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) throw new Error("INVALID_TIME");
  if (!AIRPORTS[airport]) throw new Error("INVALID_AIRPORT");

  const scheduledAt = new Date(`${flightDate}T${scheduledTime}:00+09:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("INVALID_DATE");

  return {
    direction,
    flightNumber,
    flightDate,
    scheduledTime,
    airport,
    terminal,
    scheduledAt,
  };
}

export function routeRequestForFlight(plan) {
  const isArrival = plan.direction === "arrival";
  const routeTime = new Date(
    plan.scheduledAt.getTime() + (isArrival ? 105 : -180) * 60 * 1000
  );
  const airport = AIRPORTS[plan.airport];

  return {
    origin: isArrival ? airport.routeLocation : STAY_ROUTE_LOCATION,
    destination: isArrival ? STAY_ROUTE_LOCATION : airport.routeLocation,
    ...(isArrival
      ? { departureTime: routeTime.toISOString() }
      : { arrivalTime: routeTime.toISOString() }),
  };
}

export function flightPlanDocumentId(bookingId, direction) {
  return `${bookingId}_${direction}`;
}

export function summarizeGoogleRoute(route) {
  const leg = route?.legs?.[0];
  if (!leg?.departureTime || !leg?.arrivalTime) return null;

  const transitSteps = (leg.steps || [])
    .filter((step) => step.travelMode === "TRANSIT" && step.transitDetails)
    .map((step) => {
      const details = step.transitDetails;
      const line = details.transitLine || {};
      return {
        lineName: String(line.name || line.nameShort || "大眾運輸").slice(0, 80),
        headsign: String(details.headsign || "").slice(0, 80),
        departureStop: String(details.stopDetails?.departureStop?.name || "").slice(0, 80),
        arrivalStop: String(details.stopDetails?.arrivalStop?.name || "").slice(0, 80),
        departureTime: details.stopDetails?.departureTime || null,
        arrivalTime: details.stopDetails?.arrivalTime || null,
      };
    })
    .slice(0, 6);

  return {
    departureTime: leg.departureTime,
    arrivalTime: leg.arrivalTime,
    durationMinutes: parseDurationMinutes(route.duration),
    transitSteps,
  };
}

function parseDurationMinutes(value) {
  const match = String(value || "").match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1]) / 60) : null;
}
