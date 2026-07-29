# 藏前NEXT 開發與架構規範

本檔是 `tokyo_inn/` 的最高層專案規範。更深層的 `AGENTS.md` 只補充該子目錄規則；若內容衝突，以最接近被修改檔案的規範為準。

## 1. 專案定位

這是一套單房源民宿營運系統，包含三個使用介面：

- Preview：公開介紹頁，不得洩漏完整地址、房號、門鎖或訪客碼。
- Guest：核准的 Google 房客或持有效訪客碼者可查看完整住宿指南、地圖與共享推薦牆。
- Admin：管理預約、收入、行事曆、使用者、鑰匙、訪客碼、推薦地點、共享推薦牆、Email／手機通知與通知紀錄。

正式環境：

- Firebase project：`tokyo-inn-kuramae`
- Hosting：`https://tokyo-inn-kuramae.web.app`
- Firestore database ID：`default`
- Cloud Functions region：`asia-east1`
- 排程與營運日期時區：`Asia/Taipei`
- Functions runtime：Node.js 24

架構圖與流程圖位於 `docs/architecture/`；文字版總覽見 `docs/ARCHITECTURE.md`。

## 2. 技術架構

```text
Browser / installed PWA
  └─ React 18 + TypeScript + Vite 5 + React Router 6
      ├─ Preview routes (public)
      ├─ Guest routes (Google guest/admin or valid guest code)
      └─ Admin routes (Google admin)
          ├─ Firebase Auth
          ├─ Firestore realtime data
          ├─ Firebase Cloud Messaging / service worker
          └─ Callable Function: Google Maps lookup

Firestore events / Cloud Scheduler
  └─ Cloud Functions v2 (asia-east1)
      ├─ Gmail SMTP email
      ├─ Admin FCM push + notification history
      ├─ booking / user / guest-message event handling
      └─ daily check-in / checkout reminders
```

主要相依：

- Firebase Web SDK 11：Auth、Firestore、Functions、Messaging
- FullCalendar 6：Admin 行事曆
- React-Leaflet / Leaflet：房客地圖
- date-fns：日期顯示與計算
- firebase-admin / firebase-functions / nodemailer：後端

## 3. 入口、路由與守衛

全域路由在 `src/App.tsx`；Guest 與 Admin 子路由分別在 `src/pages/GuestApp.tsx`、`src/pages/AdminApp.tsx`。

公開：

- `/`：Preview
- `/login`：Google 登入
- `/code-login`：訪客碼登入
- `/pending`：等待核准

Guest（`/guest/*`）：

- `home`、`guide`、`checkin`、`arrival`、`transit`、`messages`
- `airport`、`facilities`、`items`、`services`
- `restaurant`、`cityguide`、`faq`

Admin（`/admin/*`）：

- `today`、`revenue`、`calendar`、`bookings`、`messages`
- `users`、`keys`、`guest-codes`、`recommendations`
- `notification-history`、`notifications`

`src/auth/ProtectedRoute.tsx` 是唯一的路由授權入口：

- Admin：Google 使用者且 Firestore `users/{uid}.role == 'admin'`。
- Guest：active Google guest、admin 預覽，或 localStorage 中仍有效的訪客碼。
- Pending／停用使用者不得進入 Guest；Admin 不受 `active` 欄位限制。
- 不得在個別頁面自行複製或弱化角色判斷。

## 4. 前端分層

```text
src/
├─ main.tsx / App.tsx       啟動、Providers、全域路由
├─ auth/                    Firebase Auth 狀態與路由守衛
├─ pages/                   頂層路由組合
├─ admin/                   Admin 頁面、版面、即時資料 hooks
├─ guest/                   Guest 版面、分頁、搜尋、地圖、圖片
├─ preview/                 公開 Preview 專屬元件與樣式
├─ pwa/                     service worker 註冊、前景推播、安裝狀態
├─ lib/                     Firebase data/service layer
├─ types/index.ts           Firestore 文件與共用 domain 型別
├─ components/              跨介面共用元件
└─ styles/                  tokens、reset、global
```

依賴方向必須維持：

```text
UI pages/components → hooks / src/lib → Firebase SDK
                          ↓
                    src/types/index.ts
```

- UI 不直接散落 Firestore collection/query 實作。
- `src/lib` 不得依賴 Admin／Guest UI。
- Firestore 欄位變更必須同步：`src/types/index.ts`、`src/lib`、使用畫面、`firestore.rules`、Functions。
- `@/` alias 固定指向 `src/`。

## 5. Firestore 資料模型

| Collection / document | 來源與用途 | Client 權限摘要 |
|---|---|---|
| `users/{uid}` | Google 使用者角色、啟用狀態、booking | 自己可讀有限更新；Admin 管理 |
| `emailAccess/{email}` | Google 首次登入白名單 | 本人讀自己的；Admin 管理 |
| `bookings/{id}` | 預約、付款、鑰匙、訪客碼 | Admin 寫；對應 Guest 讀 |
| `keys/{code}` | 實體鑰匙 | Admin |
| `guestAccessCodes/{code}` | 有效期間訪客碼 | Admin 管理；有效碼可單筆驗證 |
| `recommendations/{id}` | Guest 地圖推薦 | 公開讀；Admin 寫 |
| `settings/notifications` | Email 寄件者與範本 | Admin |
| `guestPageViews/{id}` | page view / code login 分析 | 驗證身分後新增；Admin 讀 |
| `guestCommunityMessages/{id}` | 訪客共享推薦牆 | 公開讀；Function 驗證訪客後寫入；Admin 可刪除 |
| `adminPushDevices/{uid_deviceId}` | Admin FCM token | 每位 Admin 管理自己的裝置 |
| `adminNotifications/{id}` | Functions 保存的推播歷史 | Admin 唯讀 |
| `adminNotificationReads/{uid}` | 每位 Admin 最後已讀時間 | Admin 只讀寫自己 |
| `guestCodeDailyLogins/{code_date}` | 每日首次訪客碼登入去重 | Functions only |

規則：

- Server timestamps 使用 `serverTimestamp()`／Admin SDK `Timestamp.now()`。
- Email doc id 一律 trim + lowercase；訪客碼與鑰匙碼一律由對應 normalize helper 處理。
- Client 不得寫 `adminNotifications` 或 `guestCodeDailyLogins`。
- 新增 query 前確認是否需要更新 `firestore.indexes.json`。

## 6. Cloud Functions

入口目前為 `functions/index.js`，共 14 個 exports：

事件觸發：

- `sendBookingCreatedReminder`
- `sendPendingUserApprovalReminder`
- `sendFirstDailyGuestCodeLoginPush`
- `sendBookingUpdatedPush`
- `sendBookingDeletedPush`
- `sendUserApprovalCompletedNotice`
- `sendUserReturnedToPendingReminder`

排程：

- `sendUpcomingCheckInReminders`：09:00，入住前一天 Email
- `sendTodayCheckInAdminPushes`：09:00，入住日／缺訪客碼
- `sendTodayCheckoutAdminPushes`：11:00，退房／未還鑰匙
- `sendCheckoutAdminReminders`：12:00，Admin Email

HTTP / callable：

- `lookupGoogleMapPlace`：Admin callable，解析允許的 Google Maps URL。
- `normalizeRecommendationCategorySortOrders`：帶 maintenance token 的維護端點。

共同不變條件：

- 每個 Function 明確使用 `region: asia-east1`、Firestore `default`。
- 所有排程明確使用 `Asia/Taipei`。
- Secrets 僅能用 `defineSecret`：`GMAIL_APP_PASSWORD`、`GOOGLE_MAPS_API_KEY`、`MAINTENANCE_TOKEN`。
- `sendAdminPush` 必須先保存 `adminNotifications`，即使沒有啟用裝置也保留歷史。
- Email 預設範本同時存在 `src/lib/notificationSettings.ts` 與 `functions/index.js`；修改時必須同步。

## 7. PWA 與通知

- `public/sw.js`：背景推播、通知點擊、app badge。
- `src/pwa/registerServiceWorker.ts`：註冊 service worker。
- `src/pwa/PushForegroundBridge.tsx`：前景推播。
- `src/lib/pushNotifications.ts`：裝置註冊、停用、badge API。
- 手機 Admin header 鈴鐺顯示最近 100 則中的未讀數；進入通知紀錄即更新 `adminNotificationReads/{uid}`。
- 通知點擊 deep-link 到對應 Admin 頁面。
- 修改 service worker 後必須保留 Firebase Hosting 對 `/sw.js` 的 no-cache header。

## 8. 圖片、樣式與內容

- 共用 design tokens：`src/styles/tokens.css`。
- Admin 樣式：`src/admin/admin.css`。
- Guest 樣式：`src/guest/legacy.css`。
- Preview 樣式：`src/preview/preview.css`。
- Vite 打包圖片：`src/guest/assets/`。
- 原始靜態圖片：`pic/`；不要重複建立另一套來源。
- `dist/`、`.firebase/`、`node_modules/` 是產物，不得手動編輯或提交。
- 公開 Preview 不得出現真實住宿位置、房號、Wi-Fi、門鎖或有效存取碼。

## 9. 必做工作流程

每次修改：

1. 先讀本檔與目標目錄內最近的 `AGENTS.md`。
2. 以 `rg` 找既有模式，避免重複 data layer、型別或元件。
3. 僅修改任務範圍，保留使用者既有未提交變更。
4. 執行與風險相稱的測試。
5. 更新受影響的架構／部署文件。
6. 本專案已授權：完成且測試通過後，自動部署受影響的 Firebase surface、commit、push `origin main`。
7. 部署失敗不得宣稱完成；排除後重試。Functions 的 Artifact Registry cleanup-policy 警告不代表函式失敗，須逐一確認 operation success。

驗證矩陣：

| 改動 | 最低驗證 | 部署 |
|---|---|---|
| React / CSS / PWA | `npm run build` | Hosting |
| Firestore Rules / indexes | `firebase deploy --only firestore:rules,firestore:indexes` | Firestore |
| Functions | `node --check functions/index.js` + `npm test`（在 `functions/`） | Functions |
| 跨層資料模型 | 上述全部 | Rules → Functions → Hosting |
| 純 Markdown / 圖片文件 | `git diff --check` + 圖片檢視 | 不需 Firebase deploy |

部署順序：

1. Firestore Rules／indexes（若有）
2. Functions（若有）
3. Hosting（若有）
4. `git add`、語意化 commit、`git push origin main`

## 10. 安全與禁止事項

- 不得提交 `.env.local`、Firebase token、SMTP 密碼、API secret、maintenance token 或真實住客資料。
- 不得把 secret 值寫入 Markdown、測試 snapshot、console log 或圖片。
- 不得降低 Firestore Rules 來繞過 UI 錯誤。
- 不得用 client 身分執行應由 Admin SDK／Functions 負責的系統寫入。
- 不得修改 `node_modules`、`dist`、`.firebase` 或舊匯出備份。
- 不得用破壞性 Git 指令清除不屬於本次任務的變更。

## 11. 子目錄規範

- `src/AGENTS.md`：前端總則。
- `src/admin/AGENTS.md`：Admin UI、即時資料與手機導覽。
- `src/guest/AGENTS.md`：Guest 內容、安全、搜尋、地圖。
- `src/lib/AGENTS.md`：Firebase data layer。
- `functions/AGENTS.md`：Functions、通知、Email、Secrets。
- `docs/AGENTS.md`：架構文件與圖檔維護。

## 12. 已知技術債與 Review

優先順序與建議記錄於 `docs/CODE_REVIEW.md`。新增技術債時要附影響、風險與建議解法，不要只寫模糊 TODO。
