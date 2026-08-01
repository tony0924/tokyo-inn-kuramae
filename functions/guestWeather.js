export const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000;
export const WEATHER_STALE_TTL_MS = 12 * 60 * 60 * 1000;
export const JMA_TOKYO_AREA_CODE = "130010";
export const JMA_TOKYO_STATION_CODE = "44132";

export function normalizeJmaWeather(observation, forecast) {
  const currentTemperature = finiteNumber(observation?.temp?.[0]);
  const humidity = finiteNumber(observation?.humidity?.[0]);
  const shortForecast = forecast?.[0];
  const weeklyForecast = forecast?.[1];
  const weatherSeries = shortForecast?.timeSeries?.[0];
  const weatherArea = findArea(weatherSeries, JMA_TOKYO_AREA_CODE);
  const popSeries = shortForecast?.timeSeries?.[1];
  const popArea = findArea(popSeries, JMA_TOKYO_AREA_CODE);
  const tempSeries = shortForecast?.timeSeries?.[2];
  const tempArea = findArea(tempSeries, JMA_TOKYO_STATION_CODE);
  const weeklyWeatherSeries = weeklyForecast?.timeSeries?.[0];
  const weeklyWeatherArea = findArea(weeklyWeatherSeries, JMA_TOKYO_AREA_CODE);
  const weeklyTempSeries = weeklyForecast?.timeSeries?.[1];
  const weeklyTempArea = findArea(weeklyTempSeries, JMA_TOKYO_STATION_CODE);

  const shortDates = (weatherSeries?.timeDefines || []).slice(0, 3).map(dateOnly);
  const temperaturesByDate = groupNumbersByDate(tempSeries?.timeDefines, tempArea?.temps);
  const precipitationByDate = groupNumbersByDate(popSeries?.timeDefines, popArea?.pops);
  const weeklyByDate = new Map(
    (weeklyWeatherSeries?.timeDefines || []).map((time, index) => [
      dateOnly(time),
      {
        code: weeklyWeatherArea?.weatherCodes?.[index],
        precipitation: finiteNumber(weeklyWeatherArea?.pops?.[index]),
        min: finiteNumber(weeklyTempArea?.tempsMin?.[index]),
        max: finiteNumber(weeklyTempArea?.tempsMax?.[index]),
      },
    ])
  );

  const days = shortDates.map((date, index) => {
    const temperatures = temperaturesByDate.get(date) || [];
    const weekly = weeklyByDate.get(date);
    return {
      date,
      condition: normalizeJmaCondition(
        weatherArea?.weatherCodes?.[index] || weekly?.code,
        weatherArea?.weathers?.[index]
      ),
      maxTemperature: temperatures.length
        ? Math.max(...temperatures)
        : weekly?.max ?? null,
      minTemperature: temperatures.length > 1
        ? Math.min(...temperatures)
        : weekly?.min ?? null,
      precipitationProbability: maximumOrNull(
        precipitationByDate.get(date),
        weekly?.precipitation
      ),
    };
  });

  if (currentTemperature == null || days.length === 0) {
    throw new Error("INVALID_WEATHER_RESPONSE");
  }

  return {
    locationName: "東京・藏前",
    current: {
      temperature: currentTemperature,
      feelsLikeTemperature: null,
      condition: days[0].condition,
      humidity,
    },
    days,
    sourceName: "日本氣象廳",
    sourceUrl: "https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=130000",
  };
}

export function weatherAdvice(weather) {
  const today = weather?.days?.[0];
  const conditionType = String(
    today?.condition?.type || weather?.current?.condition?.type || ""
  ).toUpperCase();
  const precipitation = today?.precipitationProbability ?? 0;

  if (
    precipitation >= 50
    || conditionType.includes("RAIN")
    || conditionType.includes("THUNDER")
    || conditionType.includes("SHOWER")
  ) {
    return "今天可能下雨，出門建議攜帶折疊傘。";
  }
  if ((today?.maxTemperature ?? weather?.current?.temperature ?? 0) >= 30) {
    return "今天較炎熱，建議注意防曬並隨時補充水分。";
  }
  if ((today?.minTemperature ?? weather?.current?.temperature ?? 99) <= 12) {
    return "早晚氣溫偏低，出門建議準備一件保暖外套。";
  }
  return "天氣大致舒適，出門前仍可再確認最新預報。";
}

export function weatherEmoji(conditionType) {
  const type = String(conditionType || "").toUpperCase();
  if (type.includes("THUNDER")) return "⛈️";
  if (type.includes("SNOW") || type.includes("SLEET") || type.includes("ICE")) return "❄️";
  if (type.includes("RAIN") || type.includes("SHOWER") || type.includes("DRIZZLE")) return "🌧️";
  if (type.includes("FOG") || type.includes("HAZE") || type.includes("MIST")) return "🌫️";
  if (type.includes("PARTLY") || type.includes("MOSTLY_CLOUDY")) return "⛅";
  if (type.includes("CLOUD")) return "☁️";
  if (type.includes("CLEAR") || type.includes("SUNNY")) return "☀️";
  return "🌤️";
}

function normalizeJmaCondition(code, rawDescription) {
  const raw = String(rawDescription || "");
  const type = jmaConditionType(code, raw);
  return {
    type,
    description: jmaDescription(type, raw),
    emoji: weatherEmoji(type),
  };
}

function jmaConditionType(code, raw) {
  const family = Math.floor(Number(code) / 100);
  if (family === 4) return "SNOW";
  if (family === 3) return raw.includes("雷") ? "THUNDERSTORM" : "RAIN";
  if (family === 2) return "CLOUDY";
  if (family === 1) return "CLEAR";
  if (raw.includes("雷")) return "THUNDERSTORM";
  if (raw.includes("雪")) return "SNOW";
  if (raw.includes("雨")) return "RAIN";
  if (raw.includes("曇") || raw.includes("くもり")) return "CLOUDY";
  return "CLEAR";
}

function jmaDescription(type, raw) {
  const hasSun = raw.includes("晴");
  const hasCloud = raw.includes("曇") || raw.includes("くもり");
  const hasRain = raw.includes("雨");
  if (type === "THUNDERSTORM") return hasRain ? "局部雷雨" : "局部雷雨";
  if (type === "SNOW") return "可能降雪";
  if (hasSun && hasRain) return "晴時有雨";
  if (hasCloud && hasRain) return "多雲有雨";
  if (type === "RAIN") return "有雨";
  if (hasSun && hasCloud) return "晴時多雲";
  if (type === "CLOUDY") return "多雲";
  return "晴";
}

function findArea(series, code) {
  return series?.areas?.find((item) => item?.area?.code === code);
}

function groupNumbersByDate(times = [], values = []) {
  const result = new Map();
  times.forEach((time, index) => {
    const value = finiteNumber(values?.[index]);
    if (value == null) return;
    const date = dateOnly(time);
    result.set(date, [...(result.get(date) || []), value]);
  });
  return result;
}

function maximumOrNull(values = [], fallback = null) {
  const candidates = [...(values || []), fallback].filter((value) => value != null);
  return candidates.length ? Math.max(...candidates) : null;
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
