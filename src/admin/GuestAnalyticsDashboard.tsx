import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { watchGuestPageViews } from '@/lib/guestAnalytics';
import type { GuestPageView, GuestPageViewVisitorType } from '@/types';

type RangeDays = 7 | 30 | 90;

const PAGE_LABELS: Record<string, string> = {
  '/guest/home': '首頁',
  '/guest/guide': '使用指南',
  '/guest/checkin': '入退房',
  '/guest/arrival': '抵達與進房',
  '/guest/transit': '地鐵／公車',
  '/guest/airport': '機場交通',
  '/guest/facilities': '設施',
  '/guest/items': '備品',
  '/guest/services': '附近購物',
  '/guest/restaurant': '餐廳推薦',
  '/guest/cityguide': '景點推薦',
  '/guest/messages': '推薦牆',
  '/guest/faq': 'FAQ',
};

export function GuestAnalyticsDashboard() {
  const [views, setViews] = useState<GuestPageView[]>([]);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => watchGuestPageViews(
      (items) => {
        setViews(items);
        setLoading(false);
        setError(null);
      },
      2000,
      () => {
        setLoading(false);
        setError('無法載入訪客分析資料，請重新整理後再試。');
      }
    ),
    []
  );

  const analysis = useMemo(
    () => analyzeGuestEvents(views, rangeDays),
    [rangeDays, views]
  );

  return (
    <div className="guest-analytics">
      <header className="admin-page-header analytics-header">
        <div>
          <p className="today-eyebrow">GUEST INSIGHTS</p>
          <h1 className="admin-page-title">訪客使用分析</h1>
          <p className="admin-page-subtitle">
            了解房客是否找到抵達、入住、推薦與退房資訊；管理員預覽不列入統計。
          </p>
        </div>
        <div className="analytics-range" aria-label="分析期間">
          {([7, 30, 90] as RangeDays[]).map((days) => (
            <button
              type="button"
              key={days}
              className={rangeDays === days ? 'active' : ''}
              onClick={() => setRangeDays(days)}
            >
              {days} 天
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="analytics-empty">正在整理訪客使用資料…</div>
      ) : error ? (
        <div className="analytics-empty error">{error}</div>
      ) : analysis.events.length === 0 ? (
        <div className="analytics-empty">
          <span aria-hidden="true">◌</span>
          <strong>這段期間還沒有房客使用紀錄</strong>
          <p>房客登入並開始查看指南後，這裡會自動出現統計。</p>
        </div>
      ) : (
        <>
          <section className="analytics-summary-grid" aria-label="訪客分析摘要">
            <MetricCard
              label="實際訪客"
              value={analysis.uniqueVisitors}
              detail={`${analysis.returningVisitors} 位曾在不同日期回訪`}
              tone="gold"
            />
            <MetricCard
              label="頁面瀏覽"
              value={analysis.pageViews}
              detail={`平均每位 ${formatDecimal(analysis.pagesPerVisitor)} 頁`}
              tone="blue"
            />
            <MetricCard
              label="Email 導流"
              value={analysis.emailEntries}
              detail="從住宿 Email 連結成功進站"
              tone="green"
            />
            <MetricCard
              label="推薦點擊"
              value={analysis.recommendationClicks}
              detail={`${analysis.recommendationVisitors} 位房客開啟地圖`}
              tone="purple"
            />
          </section>

          <div className="analytics-primary-grid">
            <section className="analytics-panel">
              <PanelHeading eyebrow="JOURNEY FUNNEL" title="重要資訊閱讀情況" />
              <div className="analytics-funnel">
                {analysis.funnel.map((step, index) => (
                  <div className="analytics-funnel-row" key={step.label}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <small>{step.description}</small>
                    </div>
                    <div className="analytics-funnel-value">
                      <strong>{step.visitors}</strong>
                      <small>{percentage(step.visitors, analysis.uniqueVisitors)}</small>
                    </div>
                    <div className="analytics-progress" aria-hidden="true">
                      <span style={{ width: percentage(step.visitors, analysis.uniqueVisitors) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="analytics-panel">
              <PanelHeading eyebrow="DAILY ACTIVITY" title={`最近 ${Math.min(rangeDays, 30)} 天使用趨勢`} />
              <div className="analytics-daily-chart">
                {analysis.dailyActivity.map((day) => {
                  const height = analysis.maxDailyEvents
                    ? Math.max(5, Math.round((day.events / analysis.maxDailyEvents) * 100))
                    : 0;
                  return (
                    <div className="analytics-day" key={day.key} title={`${day.label}・${day.events} 次`}>
                      <span className="analytics-day-value">{day.events || ''}</span>
                      <div><span style={{ height: `${height}%` }} /></div>
                      <small>{day.shortLabel}</small>
                    </div>
                  );
                })}
              </div>
              <div className="analytics-channel-grid">
                <Channel label="Gmail 登入" value={analysis.gmailVisitors} />
                <Channel label="訪客碼" value={analysis.codeVisitors} />
                <Channel label="PWA 教學" value={analysis.pwaGuideVisitors} />
                <Channel label="已安裝 PWA" value={analysis.pwaInstallVisitors} />
              </div>
            </section>
          </div>

          <div className="analytics-secondary-grid">
            <section className="analytics-panel">
              <PanelHeading eyebrow="TOP PAGES" title="最常查看的頁面" />
              <RankedList
                rows={analysis.topPages.map((item) => ({
                  id: item.path,
                  label: pageLabel(item.path),
                  detail: item.path,
                  value: item.count,
                  percentage: percentage(item.count, analysis.pageViews),
                }))}
                empty="尚無頁面瀏覽資料"
              />
            </section>

            <section className="analytics-panel">
              <PanelHeading eyebrow="TOP PICKS" title="最常開啟的推薦地點" />
              <RankedList
                rows={analysis.topRecommendations.map((item) => ({
                  id: item.id,
                  label: item.label,
                  detail: 'Google Maps 點擊',
                  value: item.count,
                  percentage: percentage(item.count, analysis.recommendationClicks),
                }))}
                empty="尚無推薦地點點擊"
              />
            </section>
          </div>

          <section className="analytics-panel analytics-visitor-panel">
            <PanelHeading
              eyebrow="GUEST ACTIVITY"
              title="房客使用狀況"
              aside={`顯示最近活動的 ${Math.min(analysis.visitors.length, 20)} 位`}
            />
            <div className="analytics-visitor-list">
              {analysis.visitors.slice(0, 20).map((visitor) => (
                <article className="analytics-visitor-row" key={visitor.id}>
                  <span className="analytics-visitor-avatar" aria-hidden="true">
                    {visitor.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="analytics-visitor-name">
                    <strong>{visitor.name}</strong>
                    <small>{visitorTypeLabel(visitor.type)}・最後使用 {formatRelativeDate(visitor.lastAt)}</small>
                  </span>
                  <VisitorSignal label="瀏覽" value={`${visitor.pageViews} 頁`} active={visitor.pageViews > 0} />
                  <VisitorSignal label="抵達資訊" value={visitor.arrivalViewed ? '已查看' : '未查看'} active={visitor.arrivalViewed} />
                  <VisitorSignal label="推薦" value={visitor.recommendationClicked ? '已開啟' : '未開啟'} active={visitor.recommendationClicked} />
                  <VisitorSignal label="退房清單" value={visitor.checkoutCompleted ? '已完成' : visitor.checkoutStarted ? '進行中' : '未使用'} active={visitor.checkoutCompleted} />
                </article>
              ))}
            </div>
          </section>

          <p className="analytics-privacy-note">
            統計只顯示住宿網站內的使用事件，不記錄搜尋內容、留言內容、門鎖資訊或 Wi-Fi 資料。
            本頁最多分析最近 2,000 筆事件。
          </p>
        </>
      )}
    </div>
  );
}

function analyzeGuestEvents(allEvents: GuestPageView[], rangeDays: RangeDays) {
  const cutoff = subDays(new Date(), rangeDays).getTime();
  const events = allEvents.filter((event) => {
    const createdAt = event.createdAt?.toMillis?.() ?? 0;
    return event.visitorType !== 'admin_preview' && createdAt >= cutoff;
  });
  const visitors = new Map<string, {
    id: string;
    name: string;
    type: GuestPageViewVisitorType;
    lastAt: Date;
    pageViews: number;
    activeDays: Set<string>;
    arrivalViewed: boolean;
    recommendationClicked: boolean;
    checkoutStarted: boolean;
    checkoutCompleted: boolean;
    pwaGuideOpened: boolean;
    pwaInstalled: boolean;
  }>();
  const pageCounts = new Map<string, number>();
  const recommendationCounts = new Map<string, { label: string; count: number }>();
  const emailVisitors = new Set<string>();
  const recommendationVisitors = new Set<string>();

  events.forEach((event) => {
    const identity = visitorIdentity(event);
    const createdAt = event.createdAt?.toDate?.() ?? new Date(0);
    const existing = visitors.get(identity) ?? {
      id: identity,
      name: event.guestName || event.userName || '訪客',
      type: event.visitorType,
      lastAt: createdAt,
      pageViews: 0,
      activeDays: new Set<string>(),
      arrivalViewed: false,
      recommendationClicked: false,
      checkoutStarted: false,
      checkoutCompleted: false,
      pwaGuideOpened: false,
      pwaInstalled: false,
    };
    if (existing.name === '訪客') {
      existing.name = event.guestName || event.userName || existing.name;
    }
    if (createdAt > existing.lastAt) existing.lastAt = createdAt;
    existing.activeDays.add(format(createdAt, 'yyyy-MM-dd'));

    if (event.eventType === 'page_view') {
      existing.pageViews += 1;
      pageCounts.set(event.path, (pageCounts.get(event.path) ?? 0) + 1);
      if (['/guest/arrival', '/guest/airport', '/guest/transit', '/guest/checkin'].includes(event.path)) {
        existing.arrivalViewed = true;
      }
    }
    if (event.eventType === 'email_entry') emailVisitors.add(identity);
    if (event.eventType === 'pwa_guide_open') existing.pwaGuideOpened = true;
    if (event.eventType === 'pwa_install') existing.pwaInstalled = true;
    if (event.eventType === 'recommendation_click') {
      existing.recommendationClicked = true;
      recommendationVisitors.add(identity);
      const targetId = event.targetId || event.targetLabel || 'unknown';
      const target = recommendationCounts.get(targetId) ?? {
        label: event.targetLabel || '未命名地點',
        count: 0,
      };
      target.count += 1;
      recommendationCounts.set(targetId, target);
    }
    if (event.eventType === 'checkout_checklist') {
      existing.checkoutStarted = true;
      if ((event.value ?? 0) >= 100) existing.checkoutCompleted = true;
    }
    visitors.set(identity, existing);
  });

  const visitorList = Array.from(visitors.values())
    .sort((first, second) => second.lastAt.getTime() - first.lastAt.getTime());
  const pageViews = events.filter((event) => event.eventType === 'page_view').length;
  const chartDays = Math.min(rangeDays, 30);
  const dailyActivity = Array.from({ length: chartDays }, (_, index) => {
    const date = subDays(new Date(), chartDays - index - 1);
    const key = format(date, 'yyyy-MM-dd');
    const count = events.filter((event) => {
      const eventDate = event.createdAt?.toDate?.();
      return eventDate && format(eventDate, 'yyyy-MM-dd') === key;
    }).length;
    return {
      key,
      label: format(date, 'M月d日 EEE', { locale: zhTW }),
      shortLabel: chartDays <= 7 || index % 5 === 0 || index === chartDays - 1
        ? format(date, 'M/d')
        : '',
      events: count,
    };
  });

  const visitorsMatching = (predicate: (visitor: typeof visitorList[number]) => boolean) =>
    visitorList.filter(predicate).length;
  const funnel = [
    {
      label: '進入房客網站',
      description: '至少有一次有效使用紀錄',
      visitors: visitorList.length,
    },
    {
      label: '查看抵達／入住資訊',
      description: '抵達、機場、交通或入退房頁面',
      visitors: visitorsMatching((visitor) => visitor.arrivalViewed),
    },
    {
      label: '開啟推薦地點',
      description: '從網站前往 Google Maps',
      visitors: visitorsMatching((visitor) => visitor.recommendationClicked),
    },
    {
      label: '使用退房清單',
      description: '開始勾選首頁退房 Checklist',
      visitors: visitorsMatching((visitor) => visitor.checkoutStarted),
    },
    {
      label: '完成退房清單',
      description: '退房 Checklist 達到 100%',
      visitors: visitorsMatching((visitor) => visitor.checkoutCompleted),
    },
  ];

  return {
    events,
    uniqueVisitors: visitorList.length,
    returningVisitors: visitorsMatching((visitor) => visitor.activeDays.size > 1),
    pageViews,
    pagesPerVisitor: visitorList.length ? pageViews / visitorList.length : 0,
    emailEntries: emailVisitors.size,
    recommendationClicks: events.filter((event) => event.eventType === 'recommendation_click').length,
    recommendationVisitors: recommendationVisitors.size,
    gmailVisitors: visitorsMatching((visitor) => visitor.type === 'gmail'),
    codeVisitors: visitorsMatching((visitor) => visitor.type === 'guest_code'),
    pwaGuideVisitors: visitorsMatching((visitor) => visitor.pwaGuideOpened),
    pwaInstallVisitors: visitorsMatching((visitor) => visitor.pwaInstalled),
    funnel,
    dailyActivity,
    maxDailyEvents: Math.max(0, ...dailyActivity.map((day) => day.events)),
    topPages: Array.from(pageCounts, ([path, count]) => ({ path, count }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 7),
    topRecommendations: Array.from(recommendationCounts, ([id, value]) => ({ id, ...value }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 7),
    visitors: visitorList,
  };
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: 'gold' | 'blue' | 'green' | 'purple';
}) {
  return (
    <div className={`analytics-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="analytics-panel-heading">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {aside && <span>{aside}</span>}
    </div>
  );
}

function RankedList({
  rows,
  empty,
}: {
  rows: { id: string; label: string; detail: string; value: number; percentage: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <div className="analytics-list-empty">{empty}</div>;
  const maxValue = Math.max(...rows.map((row) => row.value));
  return (
    <div className="analytics-ranked-list">
      {rows.map((row, index) => (
        <div className="analytics-ranked-row" key={row.id}>
          <span>{index + 1}</span>
          <div>
            <strong>{row.label}</strong>
            <small>{row.detail}</small>
            <div><span style={{ width: `${(row.value / maxValue) * 100}%` }} /></div>
          </div>
          <span>
            <strong>{row.value}</strong>
            <small>{row.percentage}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function Channel({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VisitorSignal({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <span className={`analytics-visitor-signal${active ? ' active' : ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function visitorIdentity(event: GuestPageView): string {
  if (event.visitorType === 'gmail') return `user:${event.userUid || event.deviceId}`;
  return `code:${event.guestAccessCode || event.deviceId}`;
}

function visitorTypeLabel(type: GuestPageViewVisitorType): string {
  if (type === 'gmail') return 'Gmail';
  if (type === 'guest_code') return '訪客碼';
  return '管理員預覽';
}

function pageLabel(path: string): string {
  return PAGE_LABELS[path] || path.replace('/guest/', '') || '其他頁面';
}

function percentage(value: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 }).format(value);
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return '剛剛';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小時前`;
  return format(date, 'M月d日 HH:mm', { locale: zhTW });
}
