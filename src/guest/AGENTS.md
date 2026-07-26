# Guest 前端規範

適用於 `src/guest/`。

## 安全邊界

- Guest 完整內容只能位於 `/guest/*` 並由 `ProtectedRoute` 保護。
- Admin 可預覽 Guest；公開 Preview 不得引用 Guest 的敏感內容。
- 不在 URL、analytics path、console 或畫面錯誤中顯示完整訪客碼。
- 訪客碼 session 只經 `src/lib/guestAccessCodes.ts` 讀寫與正規化。

## 路由與內容

- tabs 定義在 `GuestLayout.tsx`，routes 在 `src/pages/GuestApp.tsx`。
- 新增 tab 時同步更新：兩處路由／導覽、`data/searchIndex.ts`，必要時更新使用指南。
- Guest 首次每日導覽由 `shared/WelcomeGuideModal.tsx` 管理；每位帳號／訪客碼分開記錄。
- 留言只透過 `src/lib/guestMessages.ts`。

## 地圖與推薦

- Firestore `recommendations` 是主要管理來源。
- `data/mapPlaces.ts` 只作尚未匯入 Firestore 預設資料時的 fallback。
- 地址、座標與外部連結在顯示前保持現有驗證與分類。
- 地圖共用 `shared/PlaceMap.tsx`，不要在各 tab 重建 Leaflet 邏輯。

## 圖片與樣式

- 打包圖片放 `assets/` 並由 `assets/photos.ts` 匯出。
- 共用互動元件放 `shared/`。
- Guest class 寫入 `legacy.css`；新增 class 應按功能區塊命名，逐步降低 inline style。
- 圖片要有有意義的 alt；可放大的住宿照片使用既有 Lightbox。

## Analytics

- page view 與 code login 只走 `recordGuestPageEvent`。
- 保留 session 去重與匿名 device id；不得新增 fingerprinting 或額外個資。

## 驗證

- `npm run build`
- 測試 Google guest、訪客碼、Admin preview 三種進入方式。
- 手機檢查 header 橫向 tab、搜尋、首次導覽、留言與地圖。
