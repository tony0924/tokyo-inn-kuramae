# 藏前NEXT 系統架構

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
| Data | Firestore `default` | 營運資料、權限、通知歷史、留言 |
| Backend | Cloud Functions v2 / Node 24 | 事件、排程、Email、push、Maps |
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
  └─ 有效碼驗證 → Guest Guide
```

Google 使用者的權限由 `users/{uid}` 與 `emailAccess/{email}` 決定。訪客碼由
`guestAccessCodes/{code}` 的 `active`、`startsAt`、`expiresAt` 決定。

## 核心營運流程

### 預約

1. Admin 建立 booking。
2. batch 同步建立訪客碼與必要授權。
3. Function 寄送預約完成 Email。
4. Function 推播新預約並檢查日期／鑰匙衝突。
5. 入住與退房排程依台北時區執行。

### 訪客登入

1. Google guest 或訪客碼通過 `ProtectedRoute`。
2. Guest Layout 載入完整指南並寫入 `guestPageViews`。
3. 訪客碼每日首次 `code_login` 由 Function 以
   `guestCodeDailyLogins/{code_date}` 去重。
4. Admin 收到 push，事件同時寫入 `adminNotifications`。

### 留言

1. 訪客頁的「推薦牆」讀取 `guestCommunityMessages`，所有訪客看到相同內容。
2. 訪客送出推薦時呼叫 `createGuestCommunityMessage`；Function 驗證登入帳號或有效訪客碼。
3. Function 僅保存顯示名稱、內容、作者類型與時間，不保存訪客碼或 Email，並發送 Admin push。
4. 原本的 `guestMessageBoards/{code}/messages/{id}` 保留作為 Admin 與個別房客的既有私人對話資料。

## 部署單位

| 改動 | Firebase surface |
|---|---|
| React、CSS、PWA、圖片 | Hosting |
| Firestore 欄位權限、query | Rules / indexes |
| trigger、排程、Email、push | Functions |

跨層改動依 Rules → Functions → Hosting 順序部署，避免新版 client 先遇到舊權限或舊後端。

## 安全邊界

- Preview 是唯一真正公開的內容面。
- Admin data 由 Firebase Auth + Firestore role rules 保護。
- Functions 系統 collection 只允許 Admin 讀或完全禁止 client。
- Secrets 使用 Firebase Secret Manager，不進 Git 或 client bundle。
- 目前 Guest 敏感內容仍編譯在靜態 bundle；這是 Review 中最高優先技術債，詳見 `CODE_REVIEW.md`。
