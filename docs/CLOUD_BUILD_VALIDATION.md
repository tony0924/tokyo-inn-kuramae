# Cloud Build regular 頻道驗證

驗證日期：2026-10-17（Asia/Taipei）。原始碼版本：`6d416f6`。

## 結果

目前 Functions 原始碼可在 `regular` 頻道成功建置，未發現此次 worker VM 更新需要修改的程式或設定。保留 Firebase 管理的部署流程與 Node.js 24，不另切換 `stable`。

- 專案：`tokyo-inn-kuramae`；區域：`asia-east1`。
- [Cloud Build 驗證紀錄](https://console.cloud.google.com/cloud-build/builds;region=asia-east1/f02be256-8ab3-4b6f-83bd-a74232ccd298?project=263022233310)：`SUCCESS`。
- API 回傳 `options.workerRelease = regular`；建置日誌確認 release `2026.09`。
- Docker server：29.9.0；Functions buildpack 的 Node.js：24.19.0。

## 已執行的檢查

| 檢查 | 結果 |
|---|---|
| 本機 `node --check functions/index.js` | 通過 |
| 本機安裝 lockfile 相依套件後執行 Functions 測試 | 15 / 15 通過 |
| 正式 Functions 狀態 | 20 個皆為 ACTIVE，runtime 皆為 nodejs24 |
| regular worker 的 Docker 運作 | 通過 |
| 使用目前 Functions 原始碼與 package-lock.json 取得來源 | 通過 |
| 沿用正式建置的 Google buildpack 執行 production npm ci、建置與映像推送 | 通過 |
| 同一個 regular 建置內，以 node:24-slim 執行語法檢查與測試 | 15 / 15 通過 |
| 匯入 Functions 入口模組 | 全部 20 個 export 可載入，未呼叫 handler |

本機首次測試因尚未安裝 `functions/node_modules` 而缺少 firebase-admin；依既有 lockfile 安裝後即通過，無須改相依版本。

## 隔離方式與驗證範圍

以最新成功的 Functions 建置 `ea8a1fa3-070d-4695-9eec-c5bee35dcc36` 為基礎，保留 fetcher、Google builder、runtime、buildpack 參數與服務帳戶，改為 `regular` 並上傳目前原始碼。測試來源只包含 Functions JavaScript 與 package JSON，不含環境檔或 secrets。

映像與快取使用獨立的 `build-validation-1792226519599` 名稱，沒有覆寫正式映像，也沒有部署 Cloud Functions、建立觸發器、修改 Scheduler 或寄送通知。建置完成後刪除測試來源、映像與快取，保留 Cloud Build 紀錄。

容器以 `loadExpenseOverview` 作為 buildpack target；其餘函式共用相同套件與入口模組，並已驗證全部 export 可載入。這是建置相容性驗證，不是 20 個函式各自部署或寄信、推播、Firestore 寫入的端到端測試。

隔離建置的首次快取不存在，曾出現找不到舊快取／無法刪除不存在 manifest 的警告；最終 buildpack 與整體建置皆成功，沒有因此修改正式部署設定。

## 後續部署

依原有 `firebase deploy --only functions --project tokyo-inn-kuramae` 流程部署。此次未發現需要重新部署正式函式的變更。

`workerRelease` 是 Cloud Build 建置設定，不能直接加進 firebase.json。此專案的 Functions 建置由 Firebase 管理，新增一份 cloudbuild.yaml 不會自動改變 Firebase CLI 產生的建置。

regular 會持續更新；本次結果適用於測試當下的 release，並不保證 2027-03-28 的版本完全相同。切換前或下次有 Functions 改動時，應重新確認建置結果與正式函式狀態。

2026-10-17 的既有 lockfile 曾回報 15 項相依漏洞（11 moderate、3 high、1 critical）。此問題已於 2026-10-19 更新套件修正，詳見下節；原有 regular 驗證紀錄仍代表 10 月 17 日當時的相依版本。

## 2026-10-19 安全更新

- firebase-admin：13.10.0 → 14.5.0。
- firebase-functions：6.6.0 → 7.4.0，以支援 Admin SDK 14。
- nodemailer：8.0.7 → 10.1.7。
- 更新 lockfile 的間接相依套件，包含 proxy-addr、@fastify/busboy、@grpc/grpc-js 等漏洞修補；未加入 overrides 或忽略漏洞設定。
- 全新 `npm ci --ignore-scripts` 安裝成功，`npm audit` 為 0 項漏洞，`npm ls --depth=0` 無 peer dependency 衝突。
- `node --check functions/index.js` 通過；Functions 測試 17 / 17 通過。
- 新增 SDK 相容性測試：20 個函式均保留第二代平台與 asia-east1；7 個 callable、1 個 HTTP、7 個 Firestore 事件與 5 個排程，排程時區保留 Asia/Taipei。
- 新增本機 SMTP 回歸測試：驗證新版 Nodemailer 的認證、收件者、CC 與 UTF-8 內容，全程使用本機測試伺服器與 example.com 地址，未對外寄送郵件。
- 正式 Functions 部署完成，20 個函式逐一更新成功，部署後 API 確認全部 ACTIVE / nodejs24。[正式建置紀錄](https://console.cloud.google.com/cloud-build/builds;region=asia-east1/954d44b5-046d-491d-9722-d13d11766215?project=263022233310)。
- 正式環境未登入請求測試：sendGuestBookingEmail、manageRecurringExpenses 均回傳 HTTP 401 / UNAUTHENTICATED，確認 SDK 升級後仍保留存取限制；未寄信或寫入資料。
- 更新套件後重跑 [regular 隔離建置](https://console.cloud.google.com/cloud-build/builds;region=asia-east1/bc5ffe02-94d7-4cd7-b531-9b2bd6760cb2?project=263022233310)：整體 SUCCESS，Google buildpack 產生映像成功，雲端 17 / 17 測試及全部 20 個函式入口載入通過。測試來源、映像與快取於驗證後清除。

本次更新針對 Functions 相依套件，不修改前端、Firestore Rules 或通知範本。npm audit 的零漏洞代表檢查當下套件資料庫未列出已知漏洞，仍需持續更新。

參考：[Cloud Build release channels](https://docs.cloud.google.com/build/docs/release-channels)、[Cloud Functions 建置流程](https://docs.cloud.google.com/functions/docs/building)。
