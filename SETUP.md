# 藏前NEXT 民宿管理系統 — 設置指南

從 0 到能在本機跑起來、跟到部署上線需要的步驟。

---

## 前置需求

- Node.js（已透過 winget 安裝在 `C:\Program Files\nodejs`，版本 24 LTS）
- 一個 Google 帳號（用於 Firebase Console + 登入測試）
- 瀏覽器（Chrome / Edge / Firefox 都行）

---

## Step 1 — 安裝專案 dependencies

```powershell
cd D:\personal\tokyo_inn
npm install
```

> 若 PowerShell 找不到 `npm`，把 `C:\Program Files\nodejs` 加到 PATH，或重啟 PowerShell。

---

## Step 2 — 建立 Firebase Project

1. 開啟 https://console.firebase.google.com/
2. 點 **Add project**
   - 名稱建議：`tokyo-inn-kuramae`
   - Google Analytics 可關閉（可有可無）
3. 進入 project 後，先「**Authentication → Get Started → Sign-in method → Google → Enable**」
   - Project support email 填你的 Gmail
4. 「**Firestore Database → Create database → Production mode → Region: asia-northeast1 (東京)**」
5. 「**Project Settings ⚙ → General → Your apps**」最下面點 `</>` 圖示新增 Web App
   - App nickname：`tokyo-inn-web`
   - 不需要 Firebase Hosting 勾選（CLI 設定即可）
   - **複製顯示出來的 firebaseConfig 物件**，待會要貼到 `.env.local`

---

## Step 3 — 把 Firebase config 貼到 `.env.local`

打開 `d:\personal\tokyo_inn\.env.local`，把六個 `PLACEHOLDER_REPLACE_ME` 換掉：

```env
VITE_FIREBASE_API_KEY=AIzaSy...（從 firebaseConfig.apiKey）
VITE_FIREBASE_AUTH_DOMAIN=tokyo-inn-kuramae.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tokyo-inn-kuramae
VITE_FIREBASE_STORAGE_BUCKET=tokyo-inn-kuramae.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

> `.env.local` 已被 `.gitignore` 排除，不會被 commit。

---

## Step 4 — 安裝 Firebase CLI 並連結 project

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
# 選剛剛建立的 project，alias 隨便取例如 default
```

---

## Step 5 — 部署 Firestore security rules

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

這會把 `firestore.rules` 和 `firestore.indexes.json` 推到雲端。

---

## Step 5.5 — 安裝 Cloud Functions dependencies（Email 提醒功能）

```powershell
cd D:\personal\tokyo_inn\functions
npm install
```

目前 Email 提醒是透過 Firebase Functions 排程寄信，並使用 Resend API 發送。

你需要準備：

- 一個 Resend 帳號
- 一組 `RESEND_API_KEY`
- 一個可寄件的 Email（之後可在 admin 的「通知設定」頁編輯）

設定 secret：

```powershell
firebase functions:secrets:set RESEND_API_KEY
```

部署 functions：

```powershell
cd D:\personal\tokyo_inn
firebase deploy --only functions
```

### 排程內容

- 每天上午 9:00（台北時間）寄出「明天入住提醒」給房客，並 CC admin
- 每天中午 12:00（台北時間）寄出「今日退房提醒」給 admin

### 通知模板編輯位置

- 後台 `/admin/notifications`

可編輯：

- 寄件名稱
- 寄件 Email
- 入住前一天提醒的主旨與內文
- 退房後提醒 admin 的主旨與內文

---

## Step 6 — 啟動本機開發伺服器

```powershell
npm run dev
```

瀏覽器會自動開 http://localhost:5173

### 預期看到：

- `/` → Preview 頁（東京下町、徒步距離、簡易地圖、無實際地址）
- 點「我已預訂・登入查看」→ Google 登入彈窗
- 第一次登入會自動建立 `users/{uid}` 文件，`role='pending'`，導向 `/pending` 等待審核

---

## Step 7 — 把自己變成 admin（一次性）

第一次登入後，到 Firebase Console：

1. **Firestore Database → Data → users → {uid}**
2. 編輯該文件：
   - `role` 改成 `'admin'`
   - `active` 改成 `true`
3. 回網站重新整理 → 自動進入 `/admin/calendar`

之後其他 admin 都可以從網頁直接管理（`/admin/users` 升級降級）。

---

## Step 8 — 完整端到端流程測試

### 8.1 建立預約
1. 登入 admin 帳號
2. `/admin/calendar` 任點一格 → 跳出建立預約表單
3. 填入：姓名、自己的另一個 Gmail（之後拿來測試房客視角）、入退房日期、金額
4. 儲存 → 行事曆出現該事件

### 8.2 房客視角
1. 登出 → 用「另一個 Gmail」（剛剛填到預約 email 的那個）登入
2. 第一次登入 → 進 `/pending`
3. 切回 admin → `/admin/users`
4. 在 pending 區段找到該帳號 → 點「審核通過」
   - 系統會自動把 role=guest, active=true，並把 user.bookingId 連到該預約
5. 切回房客帳號 → 重新整理 → 進 `/guest/home`
6. 確認 9 個 tab 都正常顯示，地圖、搜尋、燈箱、accordion 都能用

### 8.3 停用測試
1. admin 在 `/admin/users` 把該 guest active 改成 false
2. 房客那邊重新整理 → 自動踢回 `/pending`

---

## Step 9 — 部署到 Firebase Hosting（正式上線）

```powershell
npm run build
firebase deploy --only hosting
```

部署完會給一個 `https://<project-id>.web.app` 網址。

> 第一次部署可能會問是否設定為 SPA — 答 **Yes**（已在 `firebase.json` 設定 rewrites）。

### 注意事項
- 建議在 Firebase Console → Authentication → Settings → **Authorized domains** 加入正式域名（如果要用 custom domain）
- 部署後測試一遍 Step 8 全流程，確認 Production 也正常

---

## 常見問題

### Q: `npm run dev` 報「Firebase: Error (auth/invalid-api-key)」
A: `.env.local` 的值還是 PLACEHOLDER。回去 Step 3 確認貼對。

### Q: Google 登入彈窗被擋
A: 瀏覽器的彈窗封鎖。允許 localhost / 你的 hosting domain 彈窗即可。

### Q: 房客審核通過了但還是跳到 /pending
A: 先確認 Firestore 的 user doc 真的改了。再重新整理瀏覽器 (Ctrl+R) — onSnapshot 應該會即時更新，但 race condition 偶爾需要手動 refresh。

### Q: 圖片載不出來
A: `public/pic` 是 junction（連結到 `pic/`），開發時 OK；build 時 Vite 會把 junction 內容真實複製到 `dist/pic/`，部署後也會正常。

### Q: Firestore 規則部署失敗
A: 確認 `firebase use --add` 已選對 project。執行 `firebase projects:list` 檢查。

---

## 還沒做（未來工作）

- iCal 整合（Airbnb / Booking.com 預約自動匯入）
- Email 通知（審核通過 / 退房提醒）
- 多語系（日文 / 英文版本）
- 圖片上傳介面（目前圖片都是預先放在 `public/pic/`）
- Bundle code splitting（目前 main bundle 1MB，gzip 305KB；可用 `build.rollupOptions.output.manualChunks` 拆出 firebase / fullcalendar）
