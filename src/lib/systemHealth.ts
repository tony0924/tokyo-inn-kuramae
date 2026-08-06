import type {
  AdminNotification,
  Booking,
  EmailDelivery,
  GuestAccessCode,
  GuestGuidePrivateContent,
  Recommendation,
} from '@/types';

export type HealthSeverity = 'critical' | 'warning' | 'info';
export type HealthArea = 'content' | 'access' | 'delivery';

export interface HealthIssue {
  id: string;
  area: HealthArea;
  severity: HealthSeverity;
  title: string;
  detail: string;
  actionLabel?: string;
  actionPath?: string;
}

export interface SystemHealthReport {
  issues: HealthIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  contentIssueCount: number;
  accessIssueCount: number;
  deliveryIssueCount: number;
}

interface SystemHealthInput {
  guide: GuestGuidePrivateContent | null;
  guideLoadFailed?: boolean;
  recommendations: Recommendation[];
  bookings: Booking[];
  guestAccessCodes: GuestAccessCode[];
  emailDeliveries: EmailDelivery[];
  notifications: AdminNotification[];
  nowMs?: number;
}

const REQUIRED_RECOMMENDATION_CATEGORIES = [
  ['convenience', '便利商店'],
  ['supermarket', '超市'],
  ['restaurant', '餐廳'],
  ['cafe', '咖啡廳'],
  ['sight', '景點'],
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function buildSystemHealthReport(input: SystemHealthInput): SystemHealthReport {
  const issues: HealthIssue[] = [];
  const nowMs = input.nowMs ?? Date.now();

  inspectGuide(input, issues);
  inspectRecommendations(input.recommendations, issues);
  inspectBookingAccess(input.bookings, input.guestAccessCodes, nowMs, issues);
  inspectDeliveries(input.emailDeliveries, input.notifications, nowMs, issues);

  return {
    issues,
    criticalCount: countBySeverity(issues, 'critical'),
    warningCount: countBySeverity(issues, 'warning'),
    infoCount: countBySeverity(issues, 'info'),
    contentIssueCount: countByArea(issues, 'content'),
    accessIssueCount: countByArea(issues, 'access'),
    deliveryIssueCount: countByArea(issues, 'delivery'),
  };
}

function inspectGuide(input: SystemHealthInput, issues: HealthIssue[]) {
  if (input.guideLoadFailed) {
    issues.push(issue(
      'guide-load-failed',
      'content',
      'critical',
      '無法讀取私密房客指南',
      '請確認 Firestore 文件與管理員讀取權限是否正常。'
    ));
    return;
  }
  if (!input.guide) {
    issues.push(issue(
      'guide-missing',
      'content',
      'critical',
      '私密房客指南尚未建立',
      '住宿地址、Wi-Fi 與進房資訊目前無法提供給房客。'
    ));
    return;
  }

  const missing: string[] = [];
  if (!input.guide.accommodation?.address?.trim()) missing.push('住宿地址');
  if (!input.guide.accommodation?.roomLabel?.trim()) missing.push('房間資訊');
  if (!input.guide.accommodation?.mapUrl?.trim()) missing.push('住宿地圖');
  if (!input.guide.wifi?.ssid?.trim()) missing.push('Wi-Fi 名稱');
  if (!input.guide.wifi?.password?.trim()) missing.push('Wi-Fi 密碼');
  if (!input.guide.arrival?.steps?.length) missing.push('抵達步驟');
  if (!input.guide.doorLock?.instructions?.length) missing.push('門鎖說明');
  if (!input.guide.searchEntries?.length) missing.push('私密搜尋內容');
  if (missing.length > 0) {
    issues.push(issue(
      'guide-incomplete',
      'content',
      'critical',
      '私密房客指南內容不完整',
      `缺少：${missing.join('、')}。`
    ));
  }
}

function inspectRecommendations(recommendations: Recommendation[], issues: HealthIssue[]) {
  const active = recommendations.filter((item) => item.active && !item.archivedAt);
  if (active.length === 0) {
    issues.push(issue(
      'recommendations-empty',
      'content',
      'critical',
      '沒有可顯示的推薦地點',
      '餐廳、購物與景點頁目前都不會出現推薦內容。',
      '管理推薦地點',
      '/admin/recommendations'
    ));
    return;
  }

  REQUIRED_RECOMMENDATION_CATEGORIES.forEach(([category, label]) => {
    if (!active.some((item) => item.category === category)) {
      issues.push(issue(
        `recommendation-category-${category}`,
        'content',
        'warning',
        `${label}分類沒有內容`,
        `房客在${label}分類中看不到任何啟用的推薦地點。`,
        '前往補充內容',
        '/admin/recommendations'
      ));
    }
  });

  const duplicatePlaceIds = findDuplicateValues(active, (item) => item.placeId?.trim() || '');
  const duplicateUrls = findDuplicateValues(active, (item) => normalizeUrl(item.url));

  active.forEach((item) => {
    const missing: string[] = [];
    if (!item.note?.trim()) missing.push('推薦介紹');
    if (!isGoogleMapsUrl(item.url)) missing.push('有效的 Google Maps 連結');
    if (!validCoordinates(item.lat, item.lng)) missing.push('正確座標');
    if (!Number.isInteger(item.rating) || (item.rating ?? 0) < 1 || (item.rating ?? 0) > 5) {
      missing.push('1～5 顆星評分');
    }
    if (missing.length > 0) {
      issues.push(issue(
        `recommendation-incomplete-${item.id}`,
        'content',
        'warning',
        `${item.name || '未命名地點'}資料不完整`,
        `缺少或格式不正確：${missing.join('、')}。`,
        '編輯推薦地點',
        '/admin/recommendations'
      ));
    }
    if (
      (item.placeId && duplicatePlaceIds.has(item.placeId.trim())) ||
      duplicateUrls.has(normalizeUrl(item.url))
    ) {
      issues.push(issue(
        `recommendation-duplicate-${item.id}`,
        'content',
        'warning',
        `${item.name || '未命名地點'}可能重複`,
        'Place ID 或 Google Maps 連結與其他啟用地點相同。',
        '檢查重複項目',
        '/admin/recommendations'
      ));
    }
  });
}

function inspectBookingAccess(
  bookings: Booking[],
  codes: GuestAccessCode[],
  nowMs: number,
  issues: HealthIssue[]
) {
  const relevantBookings = bookings.filter(
    (booking) => toMillis(booking.checkOut) >= nowMs - DAY_MS
  );
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const codeByValue = new Map(
    codes.map((code) => [normalizeCode(code.code || code.id), code])
  );

  relevantBookings.forEach((booking) => {
    const label = booking.guestName?.trim() || '未命名預約';
    if (!booking.guestName?.trim() || !booking.guestEmail?.trim()) {
      issues.push(issue(
        `booking-contact-${booking.id}`,
        'access',
        'critical',
        `${label}缺少房客資料`,
        '姓名或 Email 不完整，可能影響登入與自動寄信。',
        '檢查預約',
        '/admin/bookings'
      ));
    }
    if (toMillis(booking.checkOut) <= toMillis(booking.checkIn)) {
      issues.push(issue(
        `booking-dates-${booking.id}`,
        'access',
        'critical',
        `${label}的住宿日期不正確`,
        '退房時間必須晚於入住時間。',
        '修正預約日期',
        '/admin/bookings'
      ));
    }
    const bookingCode = normalizeCode(booking.guestAccessCode || '');
    if (!bookingCode) {
      issues.push(issue(
        `booking-code-${booking.id}`,
        'access',
        'warning',
        `${label}尚未設定訪客碼`,
        '房客若沒有核准的 Gmail 帳號，將無法進入住宿指南。',
        '管理訪客碼',
        '/admin/guest-codes'
      ));
      return;
    }
    const code = codeByValue.get(bookingCode);
    if (!code) {
      issues.push(issue(
        `booking-code-missing-${booking.id}`,
        'access',
        'critical',
        `${label}的訪客碼文件不存在`,
        '預約內有訪客碼，但訪客碼管理中找不到對應資料。',
        '管理訪客碼',
        '/admin/guest-codes'
      ));
    } else if (!code.active && toMillis(booking.checkOut) >= nowMs) {
      issues.push(issue(
        `booking-code-inactive-${booking.id}`,
        'access',
        'warning',
        `${label}的訪客碼目前停用`,
        '住宿尚未結束，但房客無法使用這組訪客碼。',
        '管理訪客碼',
        '/admin/guest-codes'
      ));
    }
  });

  codes.filter((code) => code.active).forEach((code) => {
    if (!code.bookingId) return;
    const booking = bookingById.get(code.bookingId);
    if (!booking) {
      issues.push(issue(
        `orphan-code-${code.id}`,
        'access',
        'warning',
        '有訪客碼連結到不存在的預約',
        '訪客碼仍為啟用狀態，但對應預約已不存在。',
        '檢查訪客碼',
        '/admin/guest-codes'
      ));
      return;
    }
    if (toMillis(code.expiresAt) < toMillis(booking.checkOut)) {
      issues.push(issue(
        `code-window-${code.id}`,
        'access',
        'critical',
        `${booking.guestName || '房客'}的訪客碼過早到期`,
        '訪客碼有效期限早於預約退房時間。',
        '調整有效期限',
        '/admin/guest-codes'
      ));
    }
  });
}

function inspectDeliveries(
  deliveries: EmailDelivery[],
  notifications: AdminNotification[],
  nowMs: number,
  issues: HealthIssue[]
) {
  const recentThreshold = nowMs - 14 * DAY_MS;
  const failedEmails = deliveries.filter(
    (item) => item.status === 'failed' && toMillis(item.createdAt) >= recentThreshold
  );
  const stuckEmails = deliveries.filter(
    (item) => item.status === 'pending' && toMillis(item.createdAt) < nowMs - HOUR_MS
  );
  if (failedEmails.length > 0) {
    issues.push(issue(
      'email-failures',
      'delivery',
      'critical',
      `最近 14 天有 ${failedEmails.length} 封 Email 寄送失敗`,
      '請查看失敗原因，確認房客信箱與寄件設定後再重寄。',
      '查看 Email 紀錄',
      '/admin/emails'
    ));
  }
  if (stuckEmails.length > 0) {
    issues.push(issue(
      'email-pending',
      'delivery',
      'warning',
      `有 ${stuckEmails.length} 封 Email 長時間停在處理中`,
      '寄送狀態已超過一小時沒有完成。',
      '查看 Email 紀錄',
      '/admin/emails'
    ));
  }

  const failedNotifications = notifications.filter(
    (item) =>
      (item.status === 'failed' || item.status === 'partial') &&
      toMillis(item.createdAt) >= recentThreshold
  );
  const stuckNotifications = notifications.filter(
    (item) => item.status === 'pending' && toMillis(item.createdAt) < nowMs - HOUR_MS
  );
  if (failedNotifications.length > 0) {
    issues.push(issue(
      'notification-failures',
      'delivery',
      'warning',
      `最近 14 天有 ${failedNotifications.length} 次通知未完全送達`,
      '可能有停用或失效的管理員推播裝置。',
      '查看通知紀錄',
      '/admin/notification-history'
    ));
  }
  if (stuckNotifications.length > 0) {
    issues.push(issue(
      'notification-pending',
      'delivery',
      'warning',
      `有 ${stuckNotifications.length} 則通知長時間停在處理中`,
      '通知狀態已超過一小時沒有完成。',
      '查看通知紀錄',
      '/admin/notification-history'
    ));
  }
}

function issue(
  id: string,
  area: HealthArea,
  severity: HealthSeverity,
  title: string,
  detail: string,
  actionLabel?: string,
  actionPath?: string
): HealthIssue {
  return { id, area, severity, title, detail, actionLabel, actionPath };
}

function toMillis(value: { toMillis(): number } | null | undefined): number {
  return value?.toMillis?.() ?? 0;
}

function normalizeCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (
      url.hostname === 'maps.app.goo.gl' ||
      url.hostname === 'goo.gl' ||
      url.hostname === 'google.com' ||
      url.hostname.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function findDuplicateValues(
  items: Recommendation[],
  getValue: (item: Recommendation) => string
): Set<string> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = getValue(item);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

function countBySeverity(issues: HealthIssue[], severity: HealthSeverity): number {
  return issues.filter((item) => item.severity === severity).length;
}

function countByArea(issues: HealthIssue[], area: HealthArea): number {
  return issues.filter((item) => item.area === area).length;
}
