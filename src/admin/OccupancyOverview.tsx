import { useState } from "react";
import { Link } from "react-router-dom";
import { bookingOccupancy } from "@/lib/bookingOccupancy";
import { taipeiDate } from "@/lib/expenseFinance";
import type { Booking } from "@/types";

const rate = (count: number, total: number) =>
  total > 0
    ? `${((count / total) * 100).toLocaleString("zh-TW", { maximumFractionDigits: 1 })}%`
    : "—";

export function OccupancyOverview({ bookings }: { bookings: Booking[] }) {
  const [year, setYear] = useState(Number(taipeiDate().slice(0, 4)));
  const [openingDate, setOpeningDate] = useState("");
  const data = bookingOccupancy(bookings, year, new Date(), openingDate);
  return (
    <section
      className="admin-table occupancy-panel"
      aria-labelledby="occupancy-title"
    >
      <div className="occupancy-heading">
        <div>
          <h2 id="occupancy-title" className="admin-section-title">
            住房率
          </h2>
          <p>從每月入住晚數，看全年的住房情況。</p>
        </div>
        <label>
          住房統計年度
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {Array.from({ length: 101 }, (_, i) => 2000 + i).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="occupancy-options">
        <label>
          開始營運日期（選填）
          <input
            type="date"
            min="2000-01-01"
            max="2100-12-31"
            value={openingDate}
            onChange={(event) => setOpeningDate(event.target.value)}
          />
        </label>
        <p>僅套用本次檢視；未填時按完整曆年計算，未扣除維修或自用封房。</p>
      </div>
      <div className="stats-grid occupancy-stats">
        <div className="stat-card green">
          <div className="stat-label">{year} 年已入住（依預約推算）</div>
          <div className="stat-value">{data.stayed} 晚</div>
          <p>計至昨天，最多計入所選年度年底</p>
        </div>
        <div className="stat-card gold">
          <div className="stat-label">已過期間住房率</div>
          <div className="stat-value">{rate(data.stayed, data.elapsed)}</div>
          <p>
            {data.stayed} 晚／已過 {data.elapsed} 天
          </p>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">全年已訂住房率</div>
          <div className="stat-value">
            {rate(data.stayed + data.upcoming, data.available)}
          </div>
          <p>
            共 {data.stayed + data.upcoming} 晚／{data.available} 天
          </p>
        </div>
      </div>
      <p className="occupancy-note">
        依現存預約統計，包含免費住宿；入住日計入、退房日不計入，跨月拆分，同一晚不重複計算。今天起列為已訂，未入住天數不代表一定可售。
      </p>
      {data.invalidBookings > 0 && (
        <p role="alert">
          有 {data.invalidBookings}{" "}
          筆預約日期異常，未列入住房統計，請檢查預約資料。
        </p>
      )}
      {data.stayed + data.upcoming === 0 && (
        <p className="occupancy-note">此年度統計範圍內尚無預約晚數。</p>
      )}
      <h3>每月住房率</h3>
      <div className="occupancy-legend">
        <span>
          <i className="occupancy-stayed" />
          已入住
        </span>
        <span>
          <i className="occupancy-upcoming" />
          今天起已訂
        </span>
        <span>
          <i className="occupancy-unbooked" />
          未訂
        </span>
      </div>
      <div className="occupancy-chart">
        {data.months.map((m, index) => (
          <Link
            key={m.month}
            to={`/admin/calendar?month=${m.month}`}
            className="occupancy-month"
            aria-label={`${m.month}：已入住 ${m.stayed} 晚，今天起已訂 ${m.upcoming} 晚，未訂 ${m.unbooked} 晚，已訂率 ${rate(m.stayed + m.upcoming, m.available)}。查看行事曆`}
          >
            <span>{index + 1} 月</span>
            <div className="occupancy-track" aria-hidden="true">
              <span
                className="occupancy-stayed"
                style={{
                  width: `${m.available ? (m.stayed / m.available) * 100 : 0}%`,
                }}
              />
              <span
                className="occupancy-upcoming"
                style={{
                  width: `${m.available ? (m.upcoming / m.available) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="occupancy-month-total">
              {m.stayed + m.upcoming}／{m.available} 晚・
              {rate(m.stayed + m.upcoming, m.available)}
            </span>
          </Link>
        ))}
      </div>
      <details className="occupancy-details">
        <summary>每月晚數明細</summary>
        <div className="occupancy-month-cards">
          {data.months.map((m, index) => (
            <article key={m.month}>
              <Link to={`/admin/calendar?month=${m.month}`}>
                {index + 1} 月 ↗
              </Link>
              <dl>
                <div>
                  <dt>已入住</dt>
                  <dd>{m.stayed} 晚</dd>
                </div>
                <div>
                  <dt>今天起已訂</dt>
                  <dd>{m.upcoming} 晚</dd>
                </div>
                <div>
                  <dt>未訂</dt>
                  <dd>{m.unbooked} 晚</dd>
                </div>
                <div>
                  <dt>整月已訂率</dt>
                  <dd>{rate(m.stayed + m.upcoming, m.available)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}
