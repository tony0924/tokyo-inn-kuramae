# 前端開發指引

本檔補充倉庫根目錄 `AGENTS.md`，適用於 `src/` 下所有程式碼。

## 架構與慣例

- 使用 React 18、TypeScript、React Router 6 與 Firebase Web SDK；匯入 `@/` 指向 `src/`。
- Firestore 文件型別集中於 `types/index.ts`。新增或修改欄位時，先更新型別，再同步 data layer、畫面與 Firestore Rules 的授權條件。
- `lib/` 是 Firebase data layer；保持每個 collection/服務一個模組，不要把 Firestore 呼叫散落到頁面元件。
- 即時集合資料在 `admin/` 用對應的 `useXxx` watch hook；共用互動元件優先放在既有的 `admin/` 或 `guest/shared/`。
- 路由集中於 `pages/AdminApp.tsx` 和 `pages/GuestApp.tsx`；任何新頁面都必須同時更新路由與對應導覽。

## UI 與內容範圍

- 共用色彩與 spacing token 改 `styles/tokens.css`；全域基礎樣式改 `styles/global.css` 或 `styles/reset.css`。
- Guest 頁的版面樣式維持於 `guest/legacy.css`，Admin 樣式維持於 `admin/admin.css`，Preview 樣式維持於 `preview/preview.css`；避免跨區域覆寫。
- 訪客公開 Preview 不得揭露完整地址或存取碼。Guest / Admin 路由必須維持既有的角色與有效訪客碼保護。
- 推薦地點通常應由 Admin 介面與 `recommendations` collection 管理；只有尚未匯入預設地點時才改 `guest/data/mapPlaces.ts`。

## 驗證

- 完成前在倉庫根目錄執行 `npm run build`。
