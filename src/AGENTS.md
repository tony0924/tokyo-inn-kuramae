# 前端開發規範

適用於 `src/`。先遵守根目錄 `AGENTS.md`，再依目標目錄讀取更深層規範。

## 分層

- `App.tsx`：只負責 Providers、頂層路由與守衛組合。
- `pages/`：組合 Admin／Guest 子路由；不要放 Firestore query。
- `auth/`：Firebase Auth 狀態與 `ProtectedRoute`。
- `admin/`、`guest/`、`preview/`：各介面 UI 與專屬樣式。
- `lib/`：唯一的 Firebase client data/service layer。
- `types/index.ts`：Firestore 文件與共享 domain 型別的唯一來源。
- `pwa/`：service worker 註冊與前景推播橋接。

依賴只能由 UI 指向 data layer，不得反向。

## React 與 TypeScript

- 使用 function components、hooks、嚴格 TypeScript；不要以 `any` 隱藏資料錯誤。
- route component 維持 lazy loading；新增頁面時同步更新 route 與所有導覽入口。
- Firestore listener 必須在 effect cleanup 中 unsubscribe。
- 同一畫面樹需要相同即時資料時，透過 Context、Outlet context 或共用 hook 共用 subscription，不要重複監聽。
- 非同步 UI 必須有 loading、empty、error 狀態；錯誤訊息不可洩漏 Firebase 內部細節。
- 可互動元素使用原生 `button`／`a`／`input`，提供 label、focus 與鍵盤操作。

## 資料變更

欄位／collection 變更順序：

1. `types/index.ts`
2. `lib/<domain>.ts`
3. UI / hooks
4. `firestore.rules`
5. `firestore.indexes.json`（若 query 需要）
6. `functions/index.js`（若 server 讀寫）

所有 Timestamp 欄位在 UI 使用前都要容忍 serverTimestamp 尚未解析的狀態。

## 樣式

- 共用色彩與 spacing 改 `styles/tokens.css`。
- 不在 `global.css` 覆蓋 Admin／Guest 特定 class。
- 新增大量 UI 時使用語意 class，不擴散 inline style。
- 手機版要考慮 `safe-area-inset-*`、底部導覽與 320px 寬度。
- 動畫支援 `prefers-reduced-motion`。

## 驗證

- 必跑：`npm run build`。
- 改路由、登入、modal、手機導覽時，另做實際互動驗證。
- 修改 PWA／service worker 時確認 Hosting cache headers 仍正確。
