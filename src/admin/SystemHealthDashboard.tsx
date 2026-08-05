import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useBookings } from './useBookings';
import { useRecommendations } from './useRecommendations';
import { getPrivateGuestGuide } from '@/lib/guestGuide';
import { watchGuestAccessCodes } from '@/lib/guestAccessCodes';
import { watchEmailDeliveries } from '@/lib/emailDeliveries';
import {
  buildSystemHealthReport,
  type HealthArea,
  type HealthIssue,
  type HealthSeverity,
} from '@/lib/systemHealth';
import type {
  EmailDelivery,
  GuestAccessCode,
  GuestGuidePrivateContent,
} from '@/types';
import type { AdminOutletContext } from './AdminLayout';

const AREA_META: Record<HealthArea, { eyebrow: string; title: string; description: string }> = {
  content: {
    eyebrow: 'CONTENT HEALTH',
    title: '內容健康',
    description: '檢查房客指南、推薦分類與地點資料是否完整。',
  },
  access: {
    eyebrow: 'ACCESS INTEGRITY',
    title: '預約與存取',
    description: '檢查近期預約、訪客碼與有效期限是否互相一致。',
  },
  delivery: {
    eyebrow: 'DELIVERY STATUS',
    title: '寄送穩定性',
    description: '檢查 Email 與管理員通知是否失敗或卡住。',
  },
};

export function SystemHealthDashboard() {
  const { bookings, loading: bookingsLoading } = useBookings();
  const { recommendations, loading: recommendationsLoading } = useRecommendations();
  const { notifications, notificationsLoading, notificationsError } =
    useOutletContext<AdminOutletContext>();
  const [guide, setGuide] = useState<GuestGuidePrivateContent | null>(null);
  const [guideLoading, setGuideLoading] = useState(true);
  const [guideLoadFailed, setGuideLoadFailed] = useState(false);
  const [codes, setCodes] = useState<GuestAccessCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<EmailDelivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkedAt, setCheckedAt] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    setGuideLoading(true);
    getPrivateGuestGuide()
      .then((content) => {
        if (!active) return;
        setGuide(content);
        setGuideLoadFailed(false);
      })
      .catch(() => {
        if (!active) return;
        setGuide(null);
        setGuideLoadFailed(true);
      })
      .finally(() => {
        if (active) setGuideLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(
    () => watchGuestAccessCodes(
      (items) => {
        setCodes(items);
        setCodesLoading(false);
      },
      () => {
        setCodesLoading(false);
        setDataError('部分系統資料無法載入，請重新整理後再試。');
      }
    ),
    []
  );

  useEffect(
    () => watchEmailDeliveries(
      (items) => {
        setDeliveries(items);
        setDeliveriesLoading(false);
      },
      () => {
        setDeliveriesLoading(false);
        setDataError('部分系統資料無法載入，請重新整理後再試。');
      }
    ),
    []
  );

  const loading =
    bookingsLoading ||
    recommendationsLoading ||
    notificationsLoading ||
    guideLoading ||
    codesLoading ||
    deliveriesLoading;

  const report = useMemo(
    () => buildSystemHealthReport({
      guide,
      guideLoadFailed,
      recommendations,
      bookings,
      guestAccessCodes: codes,
      emailDeliveries: deliveries,
      notifications,
      nowMs: checkedAt.getTime(),
    }),
    [
      bookings,
      checkedAt,
      codes,
      deliveries,
      guide,
      guideLoadFailed,
      notifications,
      recommendations,
    ]
  );

  const overall = getOverallState(report.criticalCount, report.warningCount);
  const visibleError = dataError || notificationsError;

  function refresh() {
    setDataError(null);
    setCheckedAt(new Date());
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="system-health">
      <header className="admin-page-header health-header">
        <div>
          <p className="today-eyebrow">SYSTEM CARE</p>
          <h1 className="admin-page-title">系統健康檢查</h1>
          <p className="admin-page-subtitle">
            集中檢查房客內容、預約存取與通知寄送，及早發現可能影響房客的問題。
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={refresh} disabled={loading}>
          {loading ? '檢查中…' : '重新檢查'}
        </button>
      </header>

      {visibleError && <div className="health-load-error">{visibleError}</div>}

      <section className={`health-overview health-overview-${overall.tone}`}>
        <span className="health-overview-icon" aria-hidden="true">{overall.icon}</span>
        <div>
          <p>目前狀態</p>
          <h2>{loading ? '正在檢查系統…' : overall.title}</h2>
          <span>
            {loading
              ? '正在整理最新內容與寄送紀錄。'
              : report.issues.length === 0
                ? '目前沒有發現需要處理的問題。'
                : `共發現 ${report.issues.length} 項提醒，建議先處理嚴重項目。`}
          </span>
        </div>
        <small>最後檢查：{formatCheckedAt(checkedAt)}</small>
      </section>

      <section className="health-summary-grid" aria-label="健康檢查摘要">
        <HealthMetric label="嚴重" value={loading ? '—' : report.criticalCount} tone="critical" />
        <HealthMetric label="注意" value={loading ? '—' : report.warningCount} tone="warning" />
        <HealthMetric label="內容問題" value={loading ? '—' : report.contentIssueCount} tone="content" />
        <HealthMetric
          label="存取與寄送"
          value={loading ? '—' : report.accessIssueCount + report.deliveryIssueCount}
          tone="system"
        />
      </section>

      {!loading && (
        <div className="health-area-grid">
          {(['content', 'access', 'delivery'] as HealthArea[]).map((area) => (
            <HealthAreaPanel
              key={area}
              area={area}
              issues={report.issues.filter((item) => item.area === area)}
            />
          ))}
        </div>
      )}

      <section className="health-test-note">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>自動化檢查已納入發布流程</strong>
          <p>正式建置、核心健康規則測試與 Functions 測試通過後才發布新版。</p>
        </div>
      </section>
    </div>
  );
}

function HealthMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'critical' | 'warning' | 'content' | 'system';
}) {
  return (
    <article className={`health-metric health-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function HealthAreaPanel({ area, issues }: { area: HealthArea; issues: HealthIssue[] }) {
  const meta = AREA_META[area];
  return (
    <section className="health-area-panel">
      <header>
        <div>
          <p>{meta.eyebrow}</p>
          <h2>{meta.title}</h2>
          <span>{meta.description}</span>
        </div>
        <strong className={issues.length === 0 ? 'healthy' : ''}>
          {issues.length === 0 ? '正常' : `${issues.length} 項`}
        </strong>
      </header>
      {issues.length === 0 ? (
        <div className="health-area-empty">
          <span aria-hidden="true">✓</span>
          <p>這個區域目前沒有發現問題。</p>
        </div>
      ) : (
        <div className="health-issue-list">
          {sortIssues(issues).map((item) => (
            <article className={`health-issue health-issue-${item.severity}`} key={item.id}>
              <span className="health-issue-dot" aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              {item.actionPath && item.actionLabel && (
                <Link to={item.actionPath}>{item.actionLabel} →</Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function sortIssues(issues: HealthIssue[]): HealthIssue[] {
  const weight: Record<HealthSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return [...issues].sort((a, b) => weight[a.severity] - weight[b.severity]);
}

function getOverallState(critical: number, warning: number) {
  if (critical > 0) {
    return { tone: 'critical', icon: '!', title: '有需要優先處理的問題' };
  }
  if (warning > 0) {
    return { tone: 'warning', icon: '△', title: '整體正常，但有幾項提醒' };
  }
  return { tone: 'healthy', icon: '✓', title: '系統與內容狀態良好' };
}

function formatCheckedAt(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
