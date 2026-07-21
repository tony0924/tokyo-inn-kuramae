# 開發指引

本檔適用於整個 `tokyo_inn/` Git 倉庫；更深層的 `AGENTS.md` 會補充其子目錄規則。

## 先讀文件

- `CLAUDE.md` 是架構、路由、資料模型與常見任務的主要說明；修改前先查閱相關段落。
- `PROJECT_CONTEXT.md` 記錄已部署環境與交接事實；部署請遵循 `DEPLOYMENT.md`，全新環境請遵循 `SETUP.md`。

## 通用規則

- 此專案為單一民宿管理系統：React/Vite/TypeScript 前端與 Firebase（Auth、Firestore、Hosting、Functions v2）。
- 不要修改 `Previous/`、`html/`、`dist/`、`.firebase/` 或任何 `node_modules/` 內容；它們是舊資料、建置輸出或相依套件。
- 不要提交 `.env.local`、任何密鑰、Firebase token 或使用者資料。Cloud Functions 的秘密必須使用 Firebase Secret。
- Firestore database ID 固定為 `default`，Cloud Functions region 為 `asia-east1`；變更資料模型時同步檢查 `src/types/index.ts`、前端 data layer、`firestore.rules` 與 Functions 的讀寫行為。
- 前端變更以 `npm run build` 驗證。只有在使用者明確要求部署時才執行 Firebase deploy。

## 目錄責任

- `src/`：React 前端；詳見 `src/AGENTS.md`。
- `functions/`：Firebase Cloud Functions；詳見 `functions/AGENTS.md`。
- `firestore.rules` 與 `firestore.indexes.json`：資料存取規則與索引，須和應用程式資料存取保持一致。
- `pic/`：靜態影像來源；由 Vite `public` 輸出使用。
