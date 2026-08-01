import { useCallback, useEffect, useState } from 'react';
import { getGuestWeather } from '@/lib/guestWeather';
import type { GuestWeatherData } from '@/types';

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

export function AdminWeatherCard() {
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
      <section className="admin-weather-card admin-weather-status" aria-busy="true">
        <span aria-hidden="true">🌤️</span>
        <div>
          <strong>正在取得東京天氣…</strong>
          <small>讀取日本氣象廳最新資料</small>
        </div>
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="admin-weather-card admin-weather-status" role="status">
        <span aria-hidden="true">🌥️</span>
        <div>
          <strong>天氣資訊暫時無法載入</strong>
          <small>其他營運資料不受影響。</small>
        </div>
        <button type="button" onClick={() => void load()}>重新載入</button>
      </section>
    );
  }

  const updatedTime = new Intl.DateTimeFormat('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(weather.updatedAt));

  return (
    <section className="admin-weather-card" aria-labelledby="admin-weather-title">
      <div className="admin-weather-current">
        <span className="admin-weather-icon" aria-hidden="true">
          {weather.current.condition.emoji}
        </span>
        <div>
          <p className="today-eyebrow">{weather.locationName}</p>
          <div className="admin-weather-temperature">
            <strong>{Math.round(weather.current.temperature)}°</strong>
            <span>
              <b id="admin-weather-title">{weather.current.condition.description}</b>
              <small>
                濕度 {weather.current.humidity ?? '—'}%
                {weather.stale ? '・較早資料' : `・${updatedTime} 更新`}
              </small>
            </span>
          </div>
        </div>
      </div>

      <div className="admin-weather-forecast" aria-label="三日天氣預報">
        {weather.days.map((day, index) => (
          <div key={day.date}>
            <span>{dayLabel(day.date, index)}</span>
            <strong>{day.condition.emoji}</strong>
            <small>{temperature(day.maxTemperature)} / {temperature(day.minTemperature)}</small>
            <em>降雨 {day.precipitationProbability ?? '—'}%</em>
          </div>
        ))}
      </div>

      <div className="admin-weather-advice">
        <p>💡 {weather.advice}</p>
        <a href={weather.sourceUrl} target="_blank" rel="noreferrer">
          資料：{weather.sourceName}
        </a>
      </div>
    </section>
  );
}
