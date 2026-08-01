# KURACHEN Stay 系統架構

本文件提供人類可讀的系統導覽；開發規則與最新架構真相以根目錄及各子目錄 `AGENTS.md` 為準。

## 圖解

### 整體系統

![整體系統架構](architecture/system-overview.png)

### 登入與權限

![登入與權限流程](architecture/auth-access-flow.png)

### 通知與營運事件

![通知與營運事件流程](architecture/notification-flow.png)

## 執行層

| 層 | 技術 | 責任 |
|---|---|---|
| Web / PWA | React、TypeScript、Vite、React Router | Preview、Guest、Admin UI |
| Client services | Firebase Web SDK | Auth、Firestore listeners、Callable、FCM |
| Data | Firestore `default` | 營運資料、權限、通知歷史、留言、天氣快取 |
| Backend | Cloud Functions v2 / Node 24 | 事件、排程、Email、push、Maps、Weather |
| Delivery | Firebase Hosting / FCM / Gmail SMTP | 網站、手機通知、Email |

## 使用者與存取

```text
公開訪客
  └─ Preview

Google 使用者
  ├─ pending → 等待 Admin 核准
  ├─ active guest → Guest Guide
  └─ admin → Admin + Guest preview

訪客碼使用者
  └─ Callable 驗證有效碼 → Sanitized booking + private Guest Guide
```

Google 使用者的權限由 `users/{uid}` 與 `emailAccess/{email}` 決定。已啟用且綁定
預約的 Google guest 可由 Rules 讀取 `guestGuideContent/private`。訪客碼不再允許
client 直接讀取 `guestAccessCodes` 或 `bookings`；`getGuestPortalData` 驗證
`active`、`startsAt`、`expiresAt` 後，只回傳私密指南與經過清理的住宿摘要。

## 核心營運流程

### 預約

1. Admin 建立 booking。
2. batch 同步建立訪客碼與必要授權。
3. Function 寄送預約完成 Email。
4. Function 推播新預約並檢查日期／鑰匙衝突。
5. 入住與退房排程依台北時區執行。

### 訪客登入

1. Google guest 由 Auth／Rules 驗證；訪客碼由 `getGuestPortalData` 驗證。
2. Guest Layout 在授權後載入 `guestGuideContent/private` 並寫入 `guestPageViews`。
3. 訪客碼每日首次 `code_login` 由 Function 以
   `guestCodeDailyLogins/{code_date}` 去重。
4. Admin 收到 push，事件同時寫入 `adminNotifications`。
5. Guest Layout 集中載入當次預約姓名，供首次網站介紹、所有分頁頂部與首頁
   顯示 `Hi, {guestName}`；只有預約姓名尚未載入時才退回 Google 顯示名稱。

### 訪客 PWA 安裝

1. Guest Layout 載入後切換到 `guest-manifest.webmanifest`，並監聽瀏覽器的
   `beforeinstallprompt` 與 `appinstalled` 事件。
2. 每日歡迎視窗提供安裝介紹；「使用說明」頁保留固定入口。
3. iPhone／iPad 顯示 Safari「分享 → 加入主畫面」步驟；Android 優先呼叫
   瀏覽器原生安裝提示，無提示時顯示 Chrome 手動步驟。
4. 已在 standalone 模式開啟時顯示完成狀態。這個階段只改善安裝引導，
   不快取 Firestore 私密指南，也不承諾離線瀏覽。

### 訪客推薦牆

1. 訪客頁的「推薦牆」讀取 `guestCommunityMessages`，所有訪客看到相同內容。
2. 訪客送出推薦時呼叫 `createGuestCommunityMessage`；Function 驗證登入帳號或有效訪客碼。
3. Function 僅保存顯示名稱、內容、作者類型與時間，不保存訪客碼或 Email；訪客發文時發送 Admin push。
4. Admin 從同一面推薦牆公開回覆，也能刪除不適當內容；系統不再提供私人客服留言。

### 首頁天氣

1. Guest 首頁呼叫 `getGuestWeather`；Function 驗證 Google 帳號或有效訪客碼。
2. 一小時內優先回傳 `systemCache/kuramaeWeather`，避免每位房客重複呼叫外部服務。
3. 快取到期後由 Function 讀取日本氣象廳的東京觀測資料與預報，再更新共用快取；畫面標示資料來源與本站整理。
4. 氣象廳暫時無法回應時可顯示十二小時內的最近資料，並在畫面標示為較早資料；完全沒有可用資料時只隱藏天氣內容，不影響其他房客指南。

## 部署單位

| 改動 | Firebase surface |
|---|---|
| React、CSS、PWA、圖片 | Hosting |
| Firestore 欄位權限、query | Rules / indexes |
| trigger、排程、Email、push、Weather | Functions |

跨層改動依 Rules → Functions → Hosting 順序部署，避免新版 client 先遇到舊權限或舊後端。

## 安全邊界

- Preview 是唯一真正公開的內容面。
- Admin data 由 Firebase Auth + Firestore role rules 保護。
- Functions 系統 collection 只允許 Admin 讀或完全禁止 client。
- Secrets 使用 Firebase Secret Manager，不進 Git 或 client bundle。
- 地址、房號、Wi-Fi、入口與門鎖文字只存在 `guestGuideContent/private`，不編譯進公開 bundle。
- 訪客碼 client 只能透過 Callable 取得經過清理的資料，不能直接讀訪客碼或 booking 文件。
- 含入口、門鎖與平面圖的敏感圖片不進 Hosting bundle；未來若重新提供，必須使用受保護媒體端點。
