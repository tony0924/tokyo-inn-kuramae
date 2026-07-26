# Cloud Functions 開發規範

適用於 `functions/`；根目錄 `AGENTS.md` 的安全、驗證與自動部署規則仍然有效。

## Runtime 與共通設定

- ES modules、Node.js 24、Firebase Functions v2。
- 入口：`index.js`；純 helper 可拆成同層 domain module 並加 `*.test.js`。
- region 固定 `asia-east1`；Firestore 使用 `getFirestore("default")`。
- 排程 timezone 固定 `Asia/Taipei`。
- 目前 secrets：`GMAIL_APP_PASSWORD`、`GOOGLE_MAPS_API_KEY`、`MAINTENANCE_TOKEN`。

## Domain 邊界

- Booking lifecycle：建立 Email、更新／取消 push、衝突檢查。
- User lifecycle：pending、核准、退回 pending。
- Guest communication：留言與每日首次訪客碼登入。
- Scheduled operations：入住、退房、缺訪客碼、未還鑰匙。
- Notification delivery：FCM、失效 token 清理、`adminNotifications` 歷史。
- Maps maintenance：URL allowlist、Places lookup、排序維護端點。

新增功能優先放入相符 domain；不要繼續讓無關 helper 集中在單一區段。

## 安全

- `onCall` 必須驗證 `request.auth` 與 Firestore Admin 角色。
- `onRequest` 必須限制 method、驗證 maintenance secret、驗證輸入 enum／長度。
- 外部 URL 必須經 allowlist；不得自動跟隨到未允許 host。
- log 只記錄必要 id／錯誤碼，不記 token、secret、Email 內文或住客隱私。
- Functions 系統 collection 不得開放 client 寫入。

## 通知

- 所有管理員 push 走 `sendAdminPush`，不可在個別 trigger 直接呼叫 Messaging。
- push 必須同時建立 `adminNotifications` 歷史；沒有裝置時 status 為 `no_devices`。
- tag 應穩定且能指出 domain，但不要包含 secret 或完整個資。
- 無效 registration token 要自動刪除。

## Email

- 寄信一律使用 `defineSecret` 掛載 Gmail app password。
- `DEFAULT_SETTINGS` 與 `src/lib/notificationSettings.ts` 必須同步。
- template variable 必須經既有 `renderTemplate`，不得用任意程式碼執行。
- 日期與營運日一律以台北時區處理。

## 驗證與部署

在 `functions/`：

```bash
node --check index.js
npm test
```

新增純 helper 必須補 Node test。從 repo root 部署：

```bash
firebase deploy --only functions --project tokyo-inn-kuramae
```

若 CLI 最後只回報 Artifact Registry cleanup policy 警告，仍須確認每個 function 都顯示 successful operation。
