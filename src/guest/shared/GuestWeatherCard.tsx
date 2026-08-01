import { useCallback, useEffect, useState } from 'react';
import { getGuestWeather } from '@/lib/guestWeather';
import type { GuestWeatherData, GuestWeatherDay } from '@/types';

function temperature(value: number | null) {
  return value == null ? '—' : `${Math.round(value)}°`;
}

function dayLabel(date: string, index: number) {
  if (index === 0) return '今天';
  if (index === 1) return '明天';
  if (index === 2) return '後天';
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(`${date}T12:00:00+09:00`));
}

function ForecastDay({ day, index }: { day: GuestWeatherDay; index: number }) {
  return (
    <div className="weather-forecast-day">
      <span>{dayLabel(day.date, index)}</span>
      <strong aria-label={day.condition.description}>{day.condition.emoji}</strong>
      <small>
        {temperature(day.maxTemperature)} / {temperature(day.minTemperature)}
      </small>
    </div>
  );
}

export function GuestWeatherCard() {
  const [weather, setWeather] = useState<GuestWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setWeather(await getGuestWeather());
    } catch {
      setWeather(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="guest-weather-card weather-loading" aria-busy="true">
        <div className="weather-loading-icon">🌤️</div>
        <div>
          <strong>正在取得藏前天氣…</strong>
          <span>整理今天與未來兩天的預報</span>
        </div>
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="guest-weather-card weather-error" role="status">
        <div>
          <strong>🌥️ 天氣資訊暫時無法載入</strong>
          <span>其他房客指南仍可正常使用。</span>
        </div>
        <button type="button" onClick={() => void load()}>重新載入</button>
      </section>
    );
  }

  const today = weather.days[0];
  const updatedTime = new Intl.DateTimeFormat('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(weather.updatedAt));

  return (
    <section className="guest-weather-card" aria-labelledby="guest-weather-title">
      <div className="weather-card-heading">
        <div>
          <p>{weather.locationName}</p>
          <h2 id="guest-weather-title">今日天氣</h2>
        </div>
        <span className="weather-update">
          {weather.stale ? '較早資料' : `更新 ${updatedTime}`}
        </span>
      </div>

      <div className="weather-current">
        <div className="weather-current-icon" aria-hidden="true">
          {weather.current.condition.emoji}
        </div>
        <div className="weather-current-temp">
          <strong>{Math.round(weather.current.temperature)}°</strong>
          <span>{weather.current.condition.description}</span>
          {weather.current.feelsLikeTemperature != null && (
            <small>體感 {Math.round(weather.current.feelsLikeTemperature)}°C</small>
          )}
        </div>
        <div className="weather-today-stats">
          <div><span>最高</span><strong>{temperature(today?.maxTemperature ?? null)}</strong></div>
          <div><span>最低</span><strong>{temperature(today?.minTemperature ?? null)}</strong></div>
          <div><span>降雨</span><strong>{today?.precipitationProbability ?? '—'}%</strong></div>
        </div>
      </div>

      <div className="weather-forecast" aria-label="三日天氣預報">
        {weather.days.map((day, index) => (
          <ForecastDay key={day.date} day={day} index={index} />
        ))}
      </div>

      <div className="weather-advice">
        <span aria-hidden="true">💡</span>
        <p>{weather.advice}</p>
      </div>
      {weather.stale && (
        <p className="weather-stale-note">即時服務暫時忙碌，目前顯示最近一次預報。</p>
      )}
      <p className="weather-source">
        資料來源：
        <a href={weather.sourceUrl} target="_blank" rel="noreferrer">
          {weather.sourceName}
        </a>
        （本站整理）
      </p>
    </section>
  );
}
