# Cloud Functions 開發指引

本檔補充倉庫根目錄 `AGENTS.md`，適用於 `functions/`。

## 執行環境

- 使用 ES modules 與 Node.js 24；主要入口為 `index.js`。
- 所有 Functions 維持 region `asia-east1`，Firestore database ID 使用 `default`。
- Firebase Secret（如 Gmail、Google Maps、維護 token）必須用 `defineSecret` 宣告並在函式設定中掛載；不得將值寫入原始碼、測試輸出或文件。

## 安全與相容性

- Callable / HTTP endpoints 必須驗證呼叫者身分或維護 token，並限制輸入、回傳與錯誤訊息中的敏感資料。
- 變更 Firestore 寫入或資料欄位時，須與 `src/types/index.ts`、`src/lib/` 及 `firestore.rules` 一起檢查。
- 郵件範本預設值存在前端 `src/lib/notificationSettings.ts` 與本檔案的 `DEFAULT_SETTINGS`；修改預設值時兩端要同步。
- 排程 Functions 使用 `Asia/Taipei` 時區；調整 cron 前確認其對入住與退房日的影響。

## 驗證與部署

- Functions 套件目前沒有獨立 npm scripts；至少以 `node --check index.js` 驗證語法。
- 只有使用者明確要求時才從倉庫根目錄執行 Firebase deploy。
