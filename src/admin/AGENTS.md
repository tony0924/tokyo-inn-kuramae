# Admin 前端規範

適用於 `src/admin/`。

## 導覽與版面

- 路由定義在 `src/pages/AdminApp.tsx`；桌面 nav、手機 nav／更多選單在 `AdminLayout.tsx`。
- 新 Admin 頁必須同時更新 route 與合適的導覽入口。
- 手機 header 鈴鐺是通知紀錄入口；再次點擊回上一個 Admin 頁。
- 手機底部固定五項：今日、行事曆、預約、留言、更多。
- 頁面內容放在 `AdminLayout` 的 Outlet；需要 layout 已載入的資料時使用 Outlet context，避免重複 listener。

## 即時資料

- 簡單 collection 使用 `useXxx` hook；跨頁共享資料可由 Layout／Context 提供。
- listener 必須有 loading 與 error state 並在 unmount unsubscribe。
- Admin UI 不得直接寫 Functions-only collections：`adminNotifications`、`guestCodeDailyLogins`。
- notification history 最多顯示最近 100 則；已讀位置是每位 Admin 的 `adminNotificationReads/{uid}`。

## UI

- 沿用 `admin-page-header`、`admin-table`、`admin-empty-state`、`btn-gold` 等既有 class。
- 手機表格沿用 `mobile-card-table` 或明確的 card layout，不靠水平捲動完成主要操作。
- modal 優先用 `Modal.tsx`；確認 ESC、背景點擊、focus 與 safe area。
- 新版面 class 寫入 `admin.css`，不要再大量新增 inline style。

## 預約與金額

- 日期儲存為 Firestore Timestamp；入住 15:00、退房 11:00 的 domain 規則不可在不同頁各自重寫。
- 金額為 JPY 整數；付款狀態只用既有 union。
- 建立／刪除預約涉及訪客碼、Email 授權與鑰匙時，優先使用 `src/lib/bookings.ts` 的 batch helper。

## 驗證

- `npm run build`
- 重要手機頁至少檢查 390px 寬度。
- 導覽變更測試：深連結、返回、底部 nav active、更多選單關閉。
