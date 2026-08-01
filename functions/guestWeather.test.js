import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeJmaWeather,
  weatherAdvice,
  weatherEmoji,
} from "./guestWeather.js";

test("prioritizes rain advice over heat advice", () => {
  const weather = {
    current: { temperature: 31 },
    days: [{
      condition: { type: "RAIN" },
      maxTemperature: 33,
      minTemperature: 25,
      precipitationProbability: 60,
    }],
  };
  assert.equal(weatherAdvice(weather), "今天可能下雨，出門建議攜帶折疊傘。");
});

test("maps common weather conditions to emoji", () => {
  assert.equal(weatherEmoji("THUNDERSTORM"), "⛈️");
  assert.equal(weatherEmoji("HEAVY_RAIN"), "🌧️");
  assert.equal(weatherEmoji("CLEAR"), "☀️");
  assert.equal(weatherEmoji("UNKNOWN"), "🌤️");
});

test("normalizes JMA observation and Tokyo forecast", () => {
  const forecast = [
    {
      timeSeries: [
        {
          timeDefines: [
            "2026-08-01T11:00:00+09:00",
            "2026-08-02T00:00:00+09:00",
            "2026-08-03T00:00:00+09:00",
          ],
          areas: [{
            area: { code: "130010" },
            weatherCodes: ["111", "112", "200"],
            weathers: ["晴れ　所により　雨　で　雷を伴う", "晴れ後雨", "くもり"],
          }],
        },
        {
          timeDefines: [
            "2026-08-01T12:00:00+09:00",
            "2026-08-02T00:00:00+09:00",
            "2026-08-02T12:00:00+09:00",
          ],
          areas: [{ area: { code: "130010" }, pops: ["20", "10", "50"] }],
        },
        {
          timeDefines: [
            "2026-08-01T09:00:00+09:00",
            "2026-08-02T00:00:00+09:00",
            "2026-08-02T09:00:00+09:00",
          ],
          areas: [{ area: { code: "44132" }, temps: ["36", "27", "35"] }],
        },
      ],
    },
    {
      timeSeries: [
        {
          timeDefines: ["2026-08-02T00:00:00+09:00", "2026-08-03T00:00:00+09:00"],
          areas: [{
            area: { code: "130010" },
            weatherCodes: ["112", "200"],
            pops: ["", "40"],
          }],
        },
        {
          timeDefines: ["2026-08-02T00:00:00+09:00", "2026-08-03T00:00:00+09:00"],
          areas: [{
            area: { code: "44132" },
            tempsMin: ["", "22"],
            tempsMax: ["", "30"],
          }],
        },
      ],
    },
  ];

  const result = normalizeJmaWeather(
    { temp: [35, 0], humidity: [48, 0] },
    forecast
  );
  assert.equal(result.current.temperature, 35);
  assert.equal(result.current.humidity, 48);
  assert.equal(result.days[1].precipitationProbability, 50);
  assert.equal(result.days[2].minTemperature, 22);
  assert.equal(result.sourceName, "日本氣象廳");
});
