import test from "node:test";
import assert from "node:assert/strict";
import {
  flightPlanDocumentId,
  normalizeFlightPlanInput,
  routeRequestForFlight,
  summarizeGoogleRoute,
} from "./flightPlan.js";

test("normalizes a valid arrival flight", () => {
  const plan = normalizeFlightPlanInput({
    direction: "arrival",
    flightNumber: "br 198",
    flightDate: "2026-08-15",
    scheduledTime: "15:20",
    airport: "nrt",
    terminal: "第 2 航廈",
  });
  assert.equal(plan.flightNumber, "BR198");
  assert.equal(plan.airport, "NRT");
  assert.equal(plan.scheduledAt.toISOString(), "2026-08-15T06:20:00.000Z");
});

test("builds arrival and departure route buffers", () => {
  const arrival = normalizeFlightPlanInput({
    direction: "arrival", flightNumber: "BR198", flightDate: "2026-08-15",
    scheduledTime: "15:20", airport: "NRT",
  });
  const departure = normalizeFlightPlanInput({
    direction: "departure", flightNumber: "BR197", flightDate: "2026-08-20",
    scheduledTime: "14:00", airport: "NRT",
  });
  assert.equal(routeRequestForFlight(arrival).departureTime, "2026-08-15T08:05:00.000Z");
  assert.equal(routeRequestForFlight(departure).arrivalTime, "2026-08-20T02:00:00.000Z");
  assert.equal(flightPlanDocumentId("booking-1", "arrival"), "booking-1_arrival");
});

test("summarizes transit details", () => {
  const result = summarizeGoogleRoute({
    duration: "3600s",
    legs: [{
      departureTime: "2026-08-15T08:05:00Z",
      arrivalTime: "2026-08-15T09:05:00Z",
      steps: [{
        travelMode: "TRANSIT",
        transitDetails: {
          headsign: "羽田空港",
          transitLine: { name: "都営浅草線" },
          stopDetails: {
            departureStop: { name: "蔵前" },
            arrivalStop: { name: "羽田空港" },
            departureTime: "2026-08-15T08:10:00Z",
            arrivalTime: "2026-08-15T08:55:00Z",
          },
        },
      }],
    }],
  });
  assert.equal(result.durationMinutes, 60);
  assert.equal(result.transitSteps[0].lineName, "都営浅草線");
});

test("rejects malformed flight numbers", () => {
  assert.throws(() => normalizeFlightPlanInput({
    direction: "arrival", flightNumber: "flight 123", flightDate: "2026-08-15",
    scheduledTime: "15:20", airport: "NRT",
  }), /INVALID_FLIGHT_NUMBER/);
});
