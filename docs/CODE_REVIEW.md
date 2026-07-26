# 程式碼 Review 與優化清單

Review 日期：2026-07-26。範圍包含前端分層、Firestore Rules、Functions、PWA、通知流程、相依套件與文件。

## 已在本次完成

### 1. 通知 listener 去重

原本 `AdminLayout` 與 `NotificationHistoryPage` 各自監聽最近 100 則
`adminNotifications`。現在由 Layout 建立單一 listener，透過 React Router
Outlet context 提供歷史頁使用，降低重複讀取與狀態不一致。

### 2. 非破壞性相依套件安全更新

執行兩個 package 的 `npm audit fix`（未使用 `--force`）：

- 前端更新 Firebase、FullCalendar、TypeScript、Vite plugin 與相關 transitive packages。
- Functions 更新 firebase-admin 13.x、firebase-functions 6.x、nodemailer 8.x 與多個 Google／gRPC／protobuf transitive packages。
- 更新後仍需 major migration 的項目列於下方，未直接冒險升級正式系統。

### 3. 開發規範分層

重寫根 `AGENTS.md`，並新增 Admin、Guest、data layer、Functions、docs 的局部規範，移除過時的頁數、路由與通知描述。

## P0 — 優先處理

### Guest 敏感內容被編譯進公開靜態 bundle

**現況**

`src/guest/tabs` 與 `searchIndex.ts` 直接包含住宿地址、Wi-Fi 與進房資訊。
`ProtectedRoute` 只能阻止 React 畫面進入，無法阻止任何人下載 Firebase Hosting
上的 JavaScript chunk。因此這些內容不是真正的 server-side protected data。

**風險**

- 未授權者可從靜態資產或 Git 歷史取得敏感住宿資訊。
- 更換 UI route guard 或檔名不能解決問題。

**建議**

1. 建立由 Functions callable 或具權限 Firestore 文件提供的 `guestGuideContent`。
2. Google guest 依 booking 授權；訪客碼改由 callable 驗證後回傳短效內容，或換成 Firebase custom token session。
3. Guest bundle 只保留非敏感版面與 placeholder。
4. 完成遷移後旋轉 Wi-Fi／進房憑證，並評估 Git 歷史清理。

這是架構級變更，必須先做資料與授權設計，不應在沒有完整回歸測試時直接熱修。

## P1 — 下一輪

### 相依套件 major 安全升級

2026-07-26 `npm audit --omit=dev` 在非破壞性修正後仍回報：

- 前端：4 項（React Router 6、Vite 5 / esbuild 等），修正需要 React Router 7 或 Vite 8 migration。
- Functions：10 項（firebase-admin／Google libraries、nodemailer 等），完整修正需要 firebase-admin 14、nodemailer 9 等 major upgrade。

建議分支處理，每一組 major upgrade 都執行登入、Firestore、Functions discovery、Email 與部署 smoke test；不要使用 `npm audit fix --force` 一次跨多個 major。

### Firestore Rules 與 domain 測試不足

目前 Functions 只有 Google Maps URL helper 的 3 個 Node tests，缺少：

- Admin／Guest／訪客碼的 Rules emulator tests。
- booking + guest code batch 一致性測試。
- 台北時區入住／退房邊界測試。
- 通知歷史、已讀數與 retry 測試。

建議先建立 emulator test harness，再重構安全與資料流程。

### 通知歷史缺少 retention 與完全冪等

`adminNotifications` UI 只讀最近 100 筆，但 collection 會永久成長；Function retry
也可能建立重複歷史。建議：

- 設定 Firestore TTL 或排程清除，例如保留 90 天。
- trigger 傳入 event id，使用 deterministic history id／transaction 去重。
- 補上 delivery retry 與部分成功測試。

## P2 — 可維護性

### `functions/index.js` 過大

目前超過 1,000 行且混合 booking、users、notifications、Email、Maps 與排程。
建議逐步拆成：

```text
functions/
├─ index.js
├─ bookings/
├─ users/
├─ notifications/
├─ email/
├─ maps/
└─ shared/
```

每次只搬一個 domain，export name、region、secret binding 與 trigger path 不變。

### Admin 元件與 CSS 過大

- `RecommendationManagement.tsx`、`KeyManagement.tsx`、`BookingForm.tsx` 都超過 500 行。
- `admin.css` 超過 2,000 行；`legacy.css` 接近 2,500 行。
- 多個 Admin 頁仍使用大量 inline style。

建議先抽純資料轉換／表單 reducer，再拆 UI section；CSS 依 dashboard、booking、notifications、responsive 分檔，由單一入口 import。

### Guest 搜尋索引手動維護

`searchIndex.ts` 與 tab 內容分開維護，容易過期。可把可搜尋 metadata 與內容資料化，
或在 build time 產生索引。敏感內容遷移到 server 後，索引也必須只在授權後取得。

### 日期與營運規則需集中

入住 15:00、退房 11:00、台北日界線目前分散於前後端 helper。建議建立共享規格測試，
前後端各保留 implementation，但用相同案例驗證 DST／午夜／Timestamp 邊界。

## 建議執行順序

1. 設計並遷移 Guest 敏感內容（P0）。
2. 建 Rules／Functions emulator tests。
3. 分別升級 Functions 與前端 major dependencies。
4. 增加通知 TTL／冪等。
5. 拆 Functions domain 與大型 Admin 元件。
6. 資料化 Guest 內容與搜尋索引。
