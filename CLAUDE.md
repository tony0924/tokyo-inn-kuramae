# 藏前NEXT 民宿管理系統 — 專案說明

React + Vite + TypeScript 前端，後端用 Firebase（Auth + Firestore + Hosting + Cloud Functions v2）。
管理一間位於東京蔵前的單一房間民宿（Room 204），提供三種使用者體驗：

1. **Preview（公開）** — 未登入訪客看到精簡介紹（不洩漏實際地址）
2. **Guest（房客）** — 兩種進入方式：
   - **Google 登入**：Gmail 帳號經 admin 授權（或在 `emailAccess` 白名單）後看到完整住宿資訊
   - **訪客碼**：不需 Google 帳號，在 `/code-login` 輸入時效性訪客碼即可查看
3. **Admin（管理者）** — 收入總覽、行事曆、預約 CRUD、房客/白名單管理、鑰匙、訪客碼、推薦地點、通知設定

> 專案根路徑：`/Users/chenweian/Documents/git/tokyo-inn-kurama/tokyo_inn`
> 線上網址：`https://tokyo-inn-kuramae.web.app`
> 全新建置流程見 `SETUP.md`；部署流程見 `DEPLOYMENT.md`；環境事實見 `PROJECT_CONTEXT.md`。

---

## 技術棧與環境

- React 18 + React Router 6 + TypeScript + Vite 5
- Firebase Web SDK v11：Auth（Google）、Firestore、Functions
- FullCalendar（admin 行事曆）、React-Leaflet（地圖）、date-fns
- Firebase 專案 ID：`tokyo-inn-kuramae`
- **Firestore database ID：`default`**（注意不是 `(default)`；`firebase.ts` 與 `functions/index.js` 都明確指定）
- Cloud Functions region：`asia-east1`；排程時區：`Asia/Taipei`
- `@/` alias → `src/`（`vite.config.ts` + `tsconfig`）

---

## 目錄結構

```
tokyo_inn/
├── src/
│   ├── main.tsx / App.tsx           # 入口 + 路由 + AuthProvider
│   ├── vite-env.d.ts
│   │
│   ├── lib/                         # Firebase / data layer（每個檔一個 collection）
│   │   ├── firebase.ts              # 初始化 auth / db / functions / googleProvider
│   │   ├── auth.ts                  # signInWithGoogle / signOut（首次登入自動建 pending user doc）
│   │   ├── users.ts                 # users + emailAccess CRUD、grantGuestAccessForEmail
│   │   ├── bookings.ts              # bookings CRUD + 訂房衝突檢查
│   │   ├── keys.ts                  # keys（實體鑰匙）CRUD
│   │   ├── guestAccessCodes.ts      # 訪客碼產生/驗證 + localStorage session
│   │   ├── guestAnalytics.ts        # guestPageViews 事件記錄（含去重與 deviceId）
│   │   ├── recommendations.ts       # recommendations（地圖推薦地點）CRUD
│   │   ├── notificationSettings.ts  # settings/notifications 郵件範本
│   │   └── googleMaps.ts            # 呼叫 lookupGoogleMapPlace callable
│   │
│   ├── types/index.ts               # 所有 Firestore 文件型別（見下方 Schema）
│   │
│   ├── auth/
│   │   ├── AuthProvider.tsx         # Context: { fbUser, user, loading }，訂閱 users/{uid}
│   │   └── ProtectedRoute.tsx       # 依 role/active 守衛；也接受有效訪客碼
│   │
│   ├── pages/
│   │   ├── PreviewPage.tsx          # /（公開，含 PreviewMap 模糊地圖）
│   │   ├── LoginPage.tsx            # /login（Google 登入）
│   │   ├── GuestCodeLoginPage.tsx   # /code-login（訪客碼登入）
│   │   ├── PendingApprovalPage.tsx  # /pending
│   │   ├── GuestApp.tsx             # /guest/* — 13 個 tab routes
│   │   └── AdminApp.tsx             # /admin/* — 11 個管理頁 routes
│   │
│   ├── styles/                      # tokens.css / reset.css / global.css（共用 design tokens）
│   ├── preview/                     # PreviewPage 專屬（PreviewMap + preview.css）
│   │
│   ├── admin/                       # 管理後台（每頁一元件 + hook）
│   │   ├── AdminLayout.tsx          # 側欄 nav + Outlet
│   │   ├── RevenueOverview.tsx      # 收入總覽（預設頁）
│   │   ├── CalendarView.tsx         # FullCalendar 月檢視
│   │   ├── BookingList.tsx          # 預約清單（filter）
│   │   ├── BookingForm.tsx          # 新增/編輯/刪除預約 + 鑰匙 + 訪客碼 + 房客授權
│   │   ├── UserManagement.tsx       # 待審核 / 已核准 / emailAccess 白名單 + 訪客分析
│   │   ├── KeyManagement.tsx        # 實體鑰匙 CRUD
│   │   ├── GuestCodeManagement.tsx  # 訪客碼 CRUD
│   │   ├── RecommendationManagement.tsx # 推薦地點 CRUD（含 Google Maps 自動帶入）
│   │   ├── NotificationSettingsPage.tsx # 郵件寄件人 + 三種範本
│   │   ├── Modal.tsx                # 共用 modal（Portal + ESC）
│   │   ├── useBookings / useUsers / useKeys / useRecommendations / useEmailAccess.ts  # watch* hooks
│   │   └── admin.css
│   │
│   └── guest/                       # 房客頁（從原 index.html 遷移）
│       ├── GuestLayout.tsx          # Header + 搜尋 + Tab nav + Outlet；記錄 page_view
│       ├── legacy.css               # 從原 index.html 搬來的完整 guest 樣式
│       ├── useGuestPlaces.ts        # 合併預設地點 + admin recommendations
│       ├── assets/photos.ts         # 匯入 arrival 照片
│       ├── data/mapPlaces.ts        # 預設地圖地點（services/restaurant/cityguide）
│       ├── data/searchIndex.ts      # 全文搜尋索引
│       ├── shared/                  # Accordion / Lightbox / PlaceMap / useJumpAnchor
│       └── tabs/                    # home/checkin/arrival/airport/facilities/items/
│                                    #   services/restaurant/cityguide/faq
│
├── functions/index.js              # Cloud Functions v2（Email 通知 + Google Maps + 維護端點）
├── public/pic/ · pic/              # 靜態圖片（junction）
├── Previous/ · html/               # 舊版備份 / Notion 匯出（不修改）
├── firebase.json · firestore.rules · firestore.indexes.json
├── .env.example · .env.local（gitignored）
├── SETUP.md · DEPLOYMENT.md · PROJECT_CONTEXT.md · README.md · CLAUDE.md
```

---

## 路由

| Path | 元件 | 守衛 |
|------|------|------|
| `/` | PreviewPage | 公開 |
| `/login` | LoginPage | 公開（Google 登入） |
| `/code-login` | GuestCodeLoginPage | 公開（訪客碼登入） |
| `/pending` | PendingApprovalPage | 已登入但未核准 |
| `/guest` → `/guest/home` | — | role=guest+active、admin、或有效訪客碼 |
| `/guest/{home,checkin,arrival,airport,facilities,items,services,restaurant,cityguide,faq}` | 對應 Tab | 同上 |
| `/admin` → `/admin/today` | — | role=admin（`requireActive={false}`） |
| `/admin/{today,revenue,calendar,bookings,messages,users,keys,guest-codes,recommendations,notifications}` | 對應管理頁 | role=admin |
| `*` | → `/` | — |

`ProtectedRoute` 邏輯（`src/auth/ProtectedRoute.tsx`）：
- 若路由 `requireRoles` 含 `guest` 且未 Google 登入，會讀 localStorage 的訪客碼並 `validateGuestAccessCode` 放行。
- Google 已登入但 role 不符 → 導向 `/pending`。
- `requireActive && !active && role!=='admin'` → 導向 `/pending`。admin 一律略過 active 檢查。

---

## 存取與身分模型

三種身分來源：

1. **Google 登入 + 自建 pending**：首次 `signInWithGoogle`（`lib/auth.ts`）會建立 `role='pending', active=false` 的 user doc，需 admin 核准。
2. **Email 白名單（`emailAccess`）自動授權**：admin 事先把 email 放進 `emailAccess`，該人 Google 首次登入時規則允許直接以白名單指定的 `role/active/bookingId` 建立 user doc（見 `firestore.rules` 的 `create` 條件與 `users.ts` 的 `grantGuestAccessForEmail`）。
3. **訪客碼（`guestAccessCodes`）**：不需 Google 帳號。`/code-login` 驗證碼有效（active + 在 `startsAt`~`expiresAt` 區間）後，把碼存進 localStorage，`ProtectedRoute` 據此放行 `/guest/*`。

第一位 admin 需在 Firebase Console 手動把 `users/{uid}.role` 改成 `'admin'`。

---

## Firestore Schema

型別定義集中在 `src/types/index.ts`。

### `users/{uid}`
```ts
{ email, displayName, photoURL, role: 'admin'|'guest'|'pending',
  active: boolean, bookingId: string|null, createdAt, updatedAt }
```

### `bookings/{id}`
```ts
{ guestUid: string|null, guestEmail, guestName,
  guestAccessCode?: string|null,          // 建立預約時自動產生的訪客碼
  partySize, checkIn(15:00), checkOut(11:00),
  amount(JPY 整數), paymentStatus: 'unpaid'|'partial'|'paid', paymentNotes,
  keyCode: string|null,                   // 指派的實體鑰匙編號
  keyLentAt: Timestamp|null, keyReturnedAt: Timestamp|null,
  notes, createdAt, updatedAt }
```

### `emailAccess/{email}`  — email 為 doc id（小寫）
```ts
{ email, role: 'admin'|'guest', active, bookingId: string|null, createdAt, updatedAt }
```

### `settings/notifications`  — 郵件設定（單一 doc）
```ts
{ senderName, senderEmail,
  bookingCreatedReminder: {subject, body},
  checkInReminder: {subject, body},
  checkoutAdminReminder: {subject, body}, updatedAt }
```
範本變數（`{{...}}`）：`guestName, guestEmail, checkInDate, checkOutDate, partySize, keyCode, guestAccessCode, websiteUrl, guestCodeLoginUrl, senderName`。前端預設值在 `lib/notificationSettings.ts`，Functions 端也有一份 `DEFAULT_SETTINGS`（改預設值兩邊都要同步）。

### `recommendations/{id}`  — 地圖推薦地點
```ts
{ section: 'services'|'restaurant'|'cityguide',
  category: 'convenience'|'supermarket'|'restaurant'|'cafe'|'sight',
  source?: 'default'|'admin', defaultKey?, placeId?, address?,
  name, lat, lng, url, note, rating?(1-5), active, sortOrder, createdAt, updatedAt }
```

### `keys/{code}`  — 實體鑰匙（code 為 doc id，大寫）
```ts
{ code, label, active, notes, createdAt, updatedAt }
```

### `guestAccessCodes/{code}`  — 訪客碼（正規化大寫，去除非英數）
```ts
{ code, label, bookingId?, guestEmail?, guestName?, active,
  startsAt, expiresAt, createdAt, updatedAt }
```
碼由 `generateGuestCode()` 用 `crypto.getRandomValues` 從無歧義字母表產生；顯示為 `XXXX-XXXX`。

### `guestPageViews/{id}`  — 訪客分析
```ts
{ eventType: 'page_view'|'code_login',
  visitorType: 'gmail'|'guest_code'|'admin_preview',
  path, userUid, userEmail, userName, guestAccessCode, guestEmail, guestName,
  userAgent, deviceId, createdAt }
```
`guestAnalytics.ts` 用 sessionStorage 做 5 秒去重、localStorage 存 `deviceId`。

### `adminPushDevices/{uid_deviceId}` — Admin 推播裝置
```ts
{ ownerUid, token, label, userAgent, enabled,
  createdAt, updatedAt, lastSeenAt }
```
每位 admin 只能管理自己的裝置。Web Push 需要 `.env.local` 的 `VITE_FIREBASE_VAPID_KEY`；此值來自 Firebase Console 的 Cloud Messaging → Web Push certificates。

### `adminNotifications/{id}` — Admin 通知紀錄
```ts
{ title, body, url, tag, badge,
  status: 'pending'|'sent'|'partial'|'failed'|'no_devices',
  deviceCount, successCount, failureCount, createdAt, completedAt }
```
由 Cloud Functions 在每次管理員推播時寫入，Admin 後台「通知紀錄」顯示最近 100 則。
前端僅限 Admin 讀取，不可新增、修改或刪除。

### `adminNotificationReads/{uid}` — Admin 通知已讀位置
```ts
{ ownerUid, lastReadAt, updatedAt }
```
每位 Admin 只能讀寫自己的文件。手機版右上角鈴鐺依 `lastReadAt` 顯示未讀數量，
進入「通知紀錄」後自動更新已讀時間。

### `guestCodeDailyLogins/{code_YYYY-MM-DD}` — 訪客碼每日首次登入去重

由 Cloud Function 寫入，記錄各訪客碼以台北日期計算的每日第一筆成功登入，
避免同一天重複發送管理員推播。前端不可直接讀寫。

### Security rules 重點（`firestore.rules`）
- `users`：自己讀自己 / admin 全讀；create 僅限「自建 pending」或「符合 emailAccess 白名單」；self update 不得改 role/active/bookingId/email。
- `emailAccess`/`settings`/`keys`：admin 全權；`emailAccess` 本人可讀自己那筆。
- `recommendations`：公開讀、admin 寫。
- `guestCommunityMessages`：公開讀、Function 驗證訪客後寫入、admin 可刪除；文件不保存訪客碼或 Email。
- `guestAccessCodes`：admin 全權；有效碼可被 `get`（供訪客驗證）。
- `guestPageViews`：admin 讀/刪；create 需通過身分驗證（登入者或持有效訪客碼），不可 update。
- `adminNotifications`：僅 admin 可讀，由 Cloud Functions 寫入。
- `adminNotificationReads`：admin 僅能讀寫自己的已讀位置。
- `bookings`：admin 全寫；guest 只能讀 `guestUid == uid` 的那筆。

---

## Cloud Functions（`functions/index.js`，region `asia-east1`）

Secrets（用 `defineSecret`，勿寫進 code）：`GMAIL_APP_PASSWORD`、`GOOGLE_MAPS_API_KEY`、`MAINTENANCE_TOKEN`。郵件走 Gmail SMTP（nodemailer）。

| Function | 觸發 | 用途 |
|----------|------|------|
| `sendBookingCreatedReminder` | Firestore `bookings/{id}` onCreate | 寄「預約完成」給房客、CC admin（`suppressBookingCreatedEmail=true` 可跳過） |
| `sendUpcomingCheckInReminders` | 排程 `0 9 * * *` | 入住前一天 09:00 寄提醒給房客、CC admin |
| `sendCheckoutAdminReminders` | 排程 `0 12 * * *` | 退房當天 12:00 寄提醒給 admin |
| `sendGuestMessagePush` | `guestMessageBoards/{code}/messages/{messageId}` onCreate | 房客新增留言時推播到已註冊的 admin 裝置 |
| `createGuestCommunityMessage` | onCall（有效訪客帳號／訪客碼） | 驗證身分後新增共享推薦，並推播 admin |
| `sendFirstDailyGuestCodeLoginPush` | `guestPageViews/{viewId}` onCreate | 每個訪客碼每日第一次成功登入時推播 |
| `sendBookingUpdatedPush` | `bookings/{bookingId}` onUpdate | 預約日期異動或鑰匙變更時檢查並推播 |
| `sendBookingDeletedPush` | `bookings/{bookingId}` onDelete | 預約取消時推播 |
| `sendTodayCheckInAdminPushes` | 排程 `0 9 * * *` | 入住當天與缺少有效訪客碼時推播 |
| `sendTodayCheckoutAdminPushes` | 排程 `0 11 * * *` | 退房時間與鑰匙未歸還時推播 |
| `lookupGoogleMapPlace` | onCall（限 admin） | 貼 Google Maps 連結，解析出名稱/地址/座標（Places API New，含 fallback） |
| `normalizeRecommendationCategorySortOrders` | onRequest（需 `x-maintenance-token`） | 一次性重排某 section/category 的 sortOrder |

---

## 推薦地點系統（重要行為）

Guest 地圖頁（services/restaurant/cityguide）的地點來自 `useGuestPlaces(section)`：

- 讀 `recommendations` collection。
- **若該 section 有任何 `source==='default'` 的文件**（代表預設清單已匯入 Firestore），只顯示 Firestore 內 active 的地點。
- **否則** 顯示 `data/mapPlaces.ts` 的硬編碼預設 + admin 新增的地點。
- 依 `sortOrder` 排序；顏色由 `category` 決定。

所以「改地圖地點」的正確做法通常是到 **admin `/admin/recommendations`**，而不是改 `mapPlaces.ts`（除非該 section 尚未匯入 default）。

---

## 設計系統（CSS）

- `src/styles/tokens.css` — 共用 `:root` design tokens（金色、深色階層、shadow、transition）。三種頁面共用同一套 token。
- `src/guest/legacy.css` — guest 頁完整樣式（從原 index.html 搬來）。
- `src/admin/admin.css` — 管理後台。
- `src/preview/preview.css` — Preview 頁。

改色改 `tokens.css`；改 guest 版面改 `legacy.css`。

---

## 常見任務

### 改地圖推薦地點
到 `/admin/recommendations` 新增/編輯（可貼 Google Maps 連結自動帶入）。僅在該 section 尚未匯入 default 時才需動 `data/mapPlaces.ts`。同時視需要更新 `data/searchIndex.ts`。

### 新增 Guest 分頁
1. 建 `src/guest/tabs/NewTab.tsx`
2. `GuestLayout.tsx` 的 `TABS` 陣列加一筆（id/icon/label）
3. `pages/GuestApp.tsx` 加 `<Route>`
4. `searchIndex.ts` 補條目

### 新增 Admin 頁
1. 建 `src/admin/XxxPage.tsx`（需要即時資料就配一個 `useXxx` watch hook）
2. `pages/AdminApp.tsx` 加 `<Route>`
3. `admin/AdminLayout.tsx` 的 `navItems` 加連結

### 改 booking 欄位
`types/index.ts` → `admin/BookingForm.tsx` → `admin/BookingList.tsx` → `admin/CalendarView.tsx`（顯示用）。admin 全寫，不需動 rules。

### 改郵件範本 / 排程
- 範本文字：`/admin/notifications`（存到 `settings/notifications`）。
- 預設值：同步改 `lib/notificationSettings.ts` 與 `functions/index.js` 的 `DEFAULT_SETTINGS`。
- 排程時間/收件邏輯：改 `functions/index.js` 後 `deploy --only functions`。

### 跨 tab 跳轉（guest）
`useJumpTo()('facilities','anchor-hotwater')`；目標 tab 呼叫 `useJumpAnchor()`，目標 Accordion 設 `id="anchor-hotwater"`。

### 切換 admin
`/admin/users` 已核准區段可升降 role；第一位 admin 需在 Firebase Console 手動改。

---

## 圖片管理

- `src/guest/assets/arrival/*` 由 `assets/photos.ts` import（走 Vite 打包）。
- `public/pic/` 是 junction → 根目錄 `pic/`，用絕對路徑 `/pic/arrival/xxx.jpg` 直接引用（build 會複製到 `dist/pic/`）。
- 新增圖片後重啟 dev server。

---

## 部署（macOS）

從 `tokyo_inn` 執行。詳見 `DEPLOYMENT.md`（含完整 firebase-tools 絕對路徑指令）。

```bash
npm run build                                          # 產出 dist/
node --check functions/index.js                        # 只改 functions 時先檢查語法
firebase deploy --only hosting --project tokyo-inn-kuramae
firebase deploy --only firestore:rules,firestore:indexes --project tokyo-inn-kuramae
firebase deploy --only functions --project tokyo-inn-kuramae
```

依改動類型分開部署較好定位問題。functions 部署後出現 "could not set up cleanup policy" 屬正常警告，只要 "Functions Deployed / 0 Errored" 即成功。**勿把 Gmail app password 或任何 secret 寫進 code 或文件。**

---

## 住宿資料安全

完整地址、房號、Wi-Fi、門鎖與進房資訊屬 Guest 敏感內容，不應重複寫在架構文件。
公開 Preview 只能使用模糊地點。現行 Guest 靜態 bundle 的敏感內容風險與遷移建議見
`docs/CODE_REVIEW.md`。
</content>
</invoke>
