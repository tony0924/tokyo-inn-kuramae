# 藏前NEXT 民宿管理系統 — 專案說明

React + Vite + TypeScript 應用，後端用 Firebase（Auth + Firestore + Hosting）。
管理一間位於東京蔵前的民宿，提供三種使用者體驗：

1. **Preview（公開）** — 未登入訪客看到精簡介紹（不洩漏實際地址）
2. **Guest（房客）** — Google 登入並通過 admin 審核後可看到完整住宿資訊（9 個分頁）
3. **Admin（管理者）** — 行事曆、預約 CRUD、房客審核

新建專案請看 `SETUP.md`。本文件描述既有架構與如何修改。

---

## 目錄結構

```
tokyo_inn/
├── src/
│   ├── main.tsx                 # Vite 入口
│   ├── App.tsx                  # 路由 + AuthProvider
│   ├── vite-env.d.ts            # ImportMetaEnv 型別
│   │
│   ├── lib/                     # Firebase / data layer
│   │   ├── firebase.ts          # Firebase 初始化（auth, db, googleProvider）
│   │   ├── auth.ts              # signInWithGoogle / signOut（含首次自動建 user doc）
│   │   ├── users.ts             # users CRUD + watchUsers
│   │   └── bookings.ts          # bookings CRUD + watchAllBookings
│   │
│   ├── types/index.ts           # User, Booking, UserRole, PaymentStatus
│   │
│   ├── auth/
│   │   ├── AuthProvider.tsx     # Context: { fbUser, user, loading }
│   │   └── ProtectedRoute.tsx   # 依 role/active 守衛路由
│   │
│   ├── pages/
│   │   ├── PreviewPage.tsx      # / （公開，含 PreviewMap 模糊地圖）
│   │   ├── LoginPage.tsx        # /login
│   │   ├── PendingApprovalPage.tsx  # /pending
│   │   ├── GuestApp.tsx         # /guest/* — 9 個 tab routes
│   │   └── AdminApp.tsx         # /admin/* — 行事曆/預約/使用者 routes
│   │
│   ├── styles/                  # 全站共用樣式（reset, tokens, global）
│   │   ├── tokens.css           # :root design tokens（金色、深色階層）
│   │   ├── reset.css
│   │   └── global.css
│   │
│   ├── preview/                 # Preview 頁專屬
│   │   ├── PreviewMap.tsx       # React-Leaflet 模糊地圖（只顯示車站＋範圍圈）
│   │   └── preview.css
│   │
│   ├── admin/                   # 管理者後台
│   │   ├── AdminLayout.tsx      # 側欄 + Outlet
│   │   ├── CalendarView.tsx     # FullCalendar 月檢視
│   │   ├── BookingForm.tsx      # 新增/編輯/刪除預約 + 鑰匙借還登記
│   │   ├── BookingList.tsx      # 清單檢視（filter: 未來/全部/已退房）
│   │   ├── UserManagement.tsx   # 待審核 + 已核准 + role/active 切換
│   │   ├── Modal.tsx            # 共用 modal（Portal + ESC 關閉）
│   │   ├── useBookings.ts       # watchAllBookings hook
│   │   ├── useUsers.ts          # watchUsers hook
│   │   └── admin.css
│   │
│   └── guest/                   # 房客頁 — 從原 index.html 遷移而來
│       ├── GuestLayout.tsx      # Header + 搜尋框 + Tab nav + Outlet
│       ├── legacy.css           # 從原 index.html 完整搬來的 1400 行 CSS
│       ├── data/
│       │   ├── mapPlaces.ts     # services/restaurant/cityguide 地點資料
│       │   └── searchIndex.ts   # 全文搜尋索引（41 條）
│       ├── shared/
│       │   ├── Accordion.tsx    # 摺疊段落
│       │   ├── Lightbox.tsx     # 燈箱 Provider + ZoomableImg 元件
│       │   ├── PlaceMap.tsx     # 共用 React-Leaflet 列表+地圖
│       │   └── useJumpAnchor.ts # 跨 tab 跳轉並 scrollIntoView
│       └── tabs/
│           ├── HomeTab.tsx      # 🏠 Hero + Wi-Fi + 住宿資訊 + 導覽格
│           ├── CheckinTab.tsx   # 📋 入退房 accordion
│           ├── ArrivalTab.tsx   # 🚃 交通 + 入口 + 室內照片 + 垃圾分類
│           ├── FacilitiesTab.tsx # 🔧 門鎖/燈/IH 爐/熱水機 等 accordion
│           ├── ItemsTab.tsx     # 📦 備品清單 grid
│           ├── ServicesTab.tsx  # 🏪 超市便利商店地圖
│           ├── RestaurantTab.tsx # 🍜 餐廳/咖啡廳地圖
│           ├── CityguideTab.tsx # 🗺️ 景點地圖
│           └── EmergencyTab.tsx # 🆘 緊急電話
│
├── public/pic/                  # 靜態圖片（junction → ../pic/）
├── pic/                         # 原始圖片（44 個檔案，HEIC 已轉 JPG）
│   ├── arrival/                 # 室內照片 + 平面圖 + 門鎖說明
│   └── facilities/              # 設施操作截圖
├── Previous/                    # 舊版本備份
│   ├── index_v1.html
│   ├── index_v2.html
│   └── index_v3.html            # 最後的純靜態單頁版（保留作為對照參考）
├── html/                        # Notion 原始匯出（不修改）
│
├── index.html                   # Vite 入口（極簡，<div id="root">）
├── package.json                 # 依賴
├── vite.config.ts               # Vite 設定（@/ alias）
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── firebase.json                # Hosting + Firestore 設定（SPA rewrites）
├── firestore.rules              # 安全規則
├── firestore.indexes.json       # Firestore composite indexes
├── .env.example                 # 公開範本
├── .env.local                   # 真實 Firebase config（gitignored）
├── .gitignore
├── SETUP.md                     # 0-to-deploy 設置指南
└── CLAUDE.md                    # 本檔
```

---

## 路由

| Path | 元件 | 守衛 |
|------|------|------|
| `/` | PreviewPage | 公開 |
| `/login` | LoginPage | 公開 |
| `/pending` | PendingApprovalPage | 已登入 |
| `/guest` | redirect → `/guest/home` | role=guest+active 或 admin |
| `/guest/{home,checkin,arrival,facilities,items,services,restaurant,cityguide,emergency}` | 對應 Tab 元件 | 同上 |
| `/admin` | redirect → `/admin/calendar` | role=admin |
| `/admin/calendar` | CalendarView | role=admin |
| `/admin/bookings` | BookingList | role=admin |
| `/admin/users` | UserManagement | role=admin |

---

## Firestore Schema

### `users/{uid}`

```ts
{
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'guest' | 'pending';   // 新註冊預設 pending
  active: boolean;                        // false 時即使是 guest 也不能進 /guest
  bookingId: string | null;               // 對應到 bookings 的 doc id
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `bookings/{id}`

```ts
{
  guestUid: string | null;        // 還沒有人註冊就是 null
  guestEmail: string;             // 已轉小寫，作為配對依據
  guestName: string;
  partySize: number;
  checkIn: Timestamp;             // 預設下午 3 點 (15:00)
  checkOut: Timestamp;            // 預設早上 11 點 (11:00)
  amount: number;                 // JPY 整數
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentNotes: string;
  keyLentAt: Timestamp | null;
  keyReturnedAt: Timestamp | null;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Security rules（`firestore.rules`）

- 自己只能讀自己的 user doc，admin 全部可讀
- 自己只能建立 `role='pending', active=false` 的 user doc（首次登入用）
- 自己只能改 `displayName/photoURL`，不能改 role/active/bookingId
- bookings：admin 全寫；guest 只能讀 `resource.data.guestUid == request.auth.uid` 的那一筆

---

## 設計系統（CSS）

兩層樣式系統：
1. **`src/styles/tokens.css`** — 共用 design tokens（金色、深色階層、shadow、transition）
2. **`src/guest/legacy.css`** — 從原始 index.html 整段搬來的 1400 行 CSS，包含所有 guest 頁的精細樣式

兩者都用同一套 `:root` token 變數，所以管理者頁、Preview 頁、Guest 頁視覺風格完全一致。

修改視覺：
- **改色：** 編 `tokens.css` 的 `--gold` / `--bg` / `--text` 等
- **改 guest 頁版面：** 編 `legacy.css`（保持與原 index.html 結構一致）
- **改管理者頁版面：** 編 `src/admin/admin.css`
- **改 Preview 頁：** 編 `src/preview/preview.css`

---

## 常見任務

### 新增地點到地圖
1. 編輯 `src/guest/data/mapPlaces.ts`，往對應陣列加一筆 `{ name, lat, lng, color, url }`
2. 在對應的 Tab 元件（`ServicesTab` / `RestaurantTab` / `CityguideTab`）的 sidebar JSX 加一個 `<PlaceCard>`，`idx` 依序遞增

### 新增 search 索引
編輯 `src/guest/data/searchIndex.ts`，加一筆 `{ section, tab, title, content }`。

### 新增 Guest 分頁
1. `src/guest/tabs/NewTab.tsx`
2. 在 `GuestLayout.tsx` 的 `TABS` 陣列加一筆
3. 在 `pages/GuestApp.tsx` 加一條 `<Route>`
4. 在 `searchIndex.ts` 補相關條目

### 改 admin 預約的欄位（例如新增「房型」）
1. `src/types/index.ts` — 加 BookingDoc 欄位
2. `src/admin/BookingForm.tsx` — 表單 input
3. `src/admin/BookingList.tsx` — 表格欄位
4. `src/admin/CalendarView.tsx` — 顯示用法
5. 不需要動 firestore.rules（admin 全寫）

### 切換管理者
- 在 `/admin/users` 已核准帳號區段點「升級 admin」/「降為 guest」即可
- 第一個 admin 需在 Firebase Console 手動把 `users/{uid}.role` 改成 `'admin'`

### 部署到正式環境
```powershell
npm run build
firebase deploy
```

詳細流程見 `SETUP.md`。

---

## 跨 tab 跳轉（Guest 頁）

在某個 tab 元件需要跳到另一個 tab 並 scroll 到特定 accordion：

```tsx
import { useJumpTo } from '@/guest/shared/useJumpAnchor';

const jumpTo = useJumpTo();
// onClick:
jumpTo('facilities', 'anchor-hotwater');
```

目標 tab 元件要呼叫 `useJumpAnchor()`（會讀 location.state.anchor 並 scrollIntoView）。
目標 Accordion 要設 `id="anchor-hotwater"`。

---

## 圖片管理

`public/pic/` 是 NTFS junction 連結到根目錄的 `pic/`（87MB）：
- 開發時 Vite 直接讀 `public/pic/*` URL（會穿透到 `pic/*`）
- Build 時 Vite 會把實際內容複製到 `dist/pic/*`
- 不需要寫 import，直接用絕對路徑 `/pic/arrival/IMG_3354.jpg`

新增圖片：丟到 `pic/arrival/` 或 `pic/facilities/`，重啟 dev server。

---

## 住宿基本資訊

- **地址：** 〒111-0051 東京都台東区蔵前 4丁目23−7
- **建物：** 日神デュオステージ蔵前ＮＥＸＴ
- **房號：** 204（二樓，出電梯左轉第一間）
- **Wi-Fi：** SSID `chen204` / 密碼 `12345678`
- **住宿座標（admin 行事曆地圖用）：** `[35.7073, 139.7876]`
- **Preview 頁地圖中心：** Kuramae 站 `[35.7064, 139.7912]`（不顯示實際房屋座標）
