# KURACHEN Stay 系統架構

本文件提供人類可讀的系統導覽；開發規則與最新架構真相以根目錄及各子目錄 `AGENTS.md` 為準。

## 圖解

### 整體系統

![整體系統架構](architecture/system-overview.png)

### 登入與權限

![登入與權限流程](architecture/auth-access-flow.png)

### 通知與營運事件

![通知與營運事件流程](architecture/notification-flow.png)

## 執行層

| 層 | 技術 | 責任 |
|---|---|---|
| Web / PWA | React、TypeScript、Vite、React Router | Preview、Guest、Admin UI |
| Client services | Firebase Web SDK | Auth、Firestore listeners、Callable、FCM |
| Data | Firestore `default` | 營運資料、權限、通知歷史、留言、天氣快取 |
| Backend | Cloud Functions v2 / Node 24 | 事件、排程、Email、push、Maps、Weather |
| Delivery | Firebase Hosting / FCM / Gmail SMTP | 網站、手機通知、Email |

## 使用者與存取

```text
公開訪客
  └─ Preview

Google 使用者
  ├─ pending → 等待 Admin 核准
  ├─ active guest → Guest Guide
  └─ admin → Admin + Guest preview

訪客碼使用者
  └─ Callable 驗證有效碼 → Sanitized booking + private Guest Guide
```

Google 使用者的權限由 `users/{uid}` 與 `emailAccess/{email}` 決定。已啟用且綁定
預約的 Google guest 可由 Rules 讀取 `guestGuideContent/private`。訪客碼不再允許
client 直接讀取 `guestAccessCodes` 或 `bookings`；`getGuestPortalData` 驗證
`active`、`startsAt`、`expiresAt` 後，只回傳私密指南與經過清理的住宿摘要。

## 核心營運流程

### 預約

1. Admin 建立 booking。
2. batch 同步建立訪客碼與必要授權。
3. Function 寄送預約完成 Email。
4. Function 推播新預約並檢查日期／鑰匙衝突。
5. 入住與退房排程依台北時區執行。

### 訪客登入

1. Google guest 由 Auth／Rules 驗證；訪客碼由 `getGuestPortalData` 驗證。
2. Guest Layout 在授權後載入 `guestGuideContent/private` 並寫入 `guestPageViews`。
3. 訪客碼每日首次 `code_login` 由 Function 以
   `guestCodeDailyLogins/{code_date}` 去重。
4. Admin 收到 push，事件同時寫入 `adminNotifications`。
5. Guest Layout 集中載入當次預約姓名，供首次網站介紹、所有分頁頂部與首頁
   顯示 `Hi, {guestName}`；只有預約姓名尚未載入時才退回 Google 顯示名稱。

### Admin 房客視角預覽

1. Admin 點擊「查看房客頁面」後，系統即時讀取 booking，列出住宿中與尚未入住的
   住客，並依入住日期排序及標示目前住宿階段。
2. 選擇住客後，booking ID 僅儲存在 Admin 該分頁的 sessionStorage；Guest portal
   仍以 Admin 權限讀取 booking，不建立或冒用住客登入狀態。
3. Guest 首頁、姓名問候、入住倒數、住宿第幾天與退房狀態都使用選定 booking。
   頁面頂端會持續標示目前預覽的住客，並提供返回管理後台的入口。
4. 若沒有住宿中或未來預約，選擇器改為提供「無住客狀態」，呈現未綁定預約時的
   通用房客指南畫面。
5. 預覽列可將「今天」切換為入住前、入住日、住宿第 2 天、退房日或退房後。
   模擬日期只放在 Admin 分頁的 sessionStorage，不修改 booking，也不影響真正房客。

### Email 管理中心

1. `/admin/emails` 依 booking 計算預約完成、入住前一天 09:00 與退房日 12:00
   的預計寄送時間，並使用目前範本呈現個人化預覽。
2. 自動、排程、手動與測試寄送都由 Functions 寫入 `emailDeliveries`；client
   只能讀取，不能偽造成功狀態。
3. Admin 可將範本測試寄到自己的登入信箱，或確認後立即寄給房客。每次手動重寄
   會建立獨立紀錄；排程寄送使用固定 ID 避免 Function retry 重複寄信。
4. 今日待辦會整合最新失敗紀錄，以及已到排程時間但尚無成功紀錄的入住／退房信。

### 預約異動通知

1. booking 的入住或退房時間改變時，`sendBookingUpdatedPush` 寫入通知紀錄並推播
   給已啟用的管理員裝置。
2. 通知只列出實際變動的欄位，格式為「入住：原日期 → 新日期」或
   「退房：原日期 → 新日期」；兩者同時修改時會一起顯示。
3. 既有通知紀錄不會回溯修改，新的日期異動才會使用前後日期格式。

### Admin 今日待辦

1. 今日營運頁依目前 booking、Email delivery、付款、訪客碼與鑰匙狀態即時計算。
2. 付款完成、鑰匙交付與鑰匙歸還可在待辦中直接完成；缺 Email、缺訪客碼與寄信
   問題則 deep-link 到對應管理頁。
3. 待辦為資料狀態的投影，不另外建立可過期的 checklist collection。

### 訪客使用分析

1. Guest Layout 繼續記錄已驗證訪客的分頁瀏覽，並新增 Email 進站、PWA 教學／安裝、
   推薦地點點擊與退房清單進度等固定事件。
2. 新增事件只允許長度受限的 `targetId`、`targetLabel` 與 0–100 數值；不收集搜尋字詞、
   留言內容、門鎖、Wi-Fi 或其他住宿敏感內容。
3. `/admin/analytics` 讀取最近 2,000 筆 `guestPageViews`，提供 7／30／90 天摘要、
   使用旅程、每日趨勢、熱門頁面／地點與每位房客的完成訊號。
4. `admin_preview` 一律排除，訪客碼只作既有事件驗證與內部去重，不在儀表板顯示。
5. Functions 寄出的房客網站連結帶非個資的 Email 類型 attribution；訪客完成 Gmail
   或訪客碼驗證後才寫入 `email_entry`。

### Admin 付款資訊

1. Admin 在 `/admin/payment-information` 管理共用收款帳戶與房客訊息範本，
   資料儲存在 `settings/paymentInformation`，只允許 Admin 讀寫。
2. 頁面可選擇 booking，將房客姓名、預約金額與入住／退房日期套入訊息變數；
   未選預約時可產生不含特定住客資料的通用訊息。
3. 訊息在瀏覽器端即時預覽，一鍵複製後由管理員貼到既有通訊工具；系統不會
   自動對外傳送銀行帳戶或房客資料。

### 訪客 PWA 安裝

1. Guest Layout 載入後切換到 `guest-manifest.webmanifest`，並監聽瀏覽器的
   `beforeinstallprompt` 與 `appinstalled` 事件。
2. 每日歡迎視窗提供安裝介紹；「使用說明」頁在開場介紹後立即顯示 Quick Access，
   讓第一次使用的房客先看到加入主畫面的方式。
3. iPhone／iPad 顯示 Safari「分享 → 加入主畫面」步驟；Android 優先呼叫
   瀏覽器原生安裝提示，無提示時顯示 Chrome 手動步驟。
4. 已在 standalone 模式開啟時顯示較精簡的完成狀態。這個階段只改善安裝引導，
   不快取 Firestore 私密指南，也不承諾離線瀏覽。

### 訪客推薦牆

1. 訪客頁的「推薦牆」讀取 `guestCommunityMessages`，所有訪客看到相同內容。
2. 訪客送出推薦時呼叫 `createGuestCommunityMessage`；Function 驗證登入帳號或有效訪客碼。
3. Function 僅保存顯示名稱、內容、作者類型與時間，不保存訪客碼或 Email；訪客發文時發送 Admin push。
4. Admin 從同一面推薦牆公開回覆，也能刪除不適當內容；系統不再提供私人客服留言。

### 首頁天氣

1. Guest 首頁只在入住日與住宿期間呼叫 `getGuestWeather`；Function 驗證
   Google 帳號或有效訪客碼。
2. 一小時內優先回傳 `systemCache/kuramaeWeather`，避免每位房客重複呼叫外部服務。
3. 快取到期後由 Function 讀取日本氣象廳的東京觀測資料與預報，再更新共用快取；畫面標示資料來源與本站整理。
4. 氣象廳暫時無法回應時可顯示十二小時內的最近資料，並在畫面標示為較早資料；完全沒有可用資料時只隱藏天氣內容，不影響其他房客指南。

### 三階段房客首頁

1. `getStayStatus` 以 `Asia/Tokyo` 日曆日判斷首頁階段；入住日為第 1 天，
   退房日不再計入住天數。
2. 入住前顯示入住倒數，以及機場交通、抵達進房與入住須知入口。
3. 入住日到住宿期間顯示「入住第 N 天」、藏前天氣，並從 Firestore
   `recommendations`／預設地點按住宿日輪替餐廳、咖啡與景點。
4. 退房日隱藏一般準備與每日旅遊內容，改為顯示「今天退房」及儲存在瀏覽器
   localStorage 的可勾選退房清單。

### 推薦地點管理

1. Admin 在 `/admin/recommendations` 依分類搜尋、篩選與管理 Firestore
   `recommendations`；房客頁只讀取啟用且未封存的內容。
2. 一般編輯使用側邊抽屜與星星選擇器，Google Maps 查詢會自動填入名稱、地址、
   Place ID 與座標；技術欄位預設收在進階設定。
3. 顯示中的項目依分類獨立排序。拖曳、方向操作、停用、封存、恢復或刪除後，
   client 會以 Firestore batch 重新編成連續 `sortOrder`。
4. 批次操作支援顯示、停用、封存與恢復；封存以 `archivedAt` 軟刪除，永久刪除
   必須另外確認。`updatedAt` 與 `updatedBy` 顯示最近修改資訊。
5. 編輯器提供房客卡片預覽與顯示位置提示；管理清單即時提示缺少介紹、星等偏低、
   Maps 連結格式異常或 Place ID／連結疑似重複。
6. 手機版餐廳、購物與景點頁不使用固定高度的內層清單捲動；選取地點後會將整頁
   帶到地圖，地圖上的返回按鈕則回到剛才選取的地點卡片。

### 內容與系統健康檢查

1. Admin `/admin/system-health` 以唯讀方式彙整私密房客指南、推薦地點、近期預約、
   訪客碼、Email 寄送與管理員通知。
2. 內容檢查涵蓋指南必要欄位、推薦分類覆蓋、介紹、Maps 連結、座標、星等與重複
   地點；推薦地址為選填，不會在地圖連結與座標完整時誤報。問題會連回既有管理頁，
   不會自動修改 Firestore。
3. 穩定性檢查涵蓋近期預約聯絡資料與日期、預約和訪客碼文件的一致性、訪客碼到期
   時間，以及最近十四天失敗或超過一小時未完成的 Email／推播。
4. `npm run check` 依序執行正式前端建置、健康規則單元測試與 Functions 測試，
   作為發布前的統一檢查入口。

## 部署單位

| 改動 | Firebase surface |
|---|---|
| React、CSS、PWA、圖片 | Hosting |
| Firestore 欄位權限、query | Rules / indexes |
| trigger、排程、Email、push、Weather | Functions |

跨層改動依 Rules → Functions → Hosting 順序部署，避免新版 client 先遇到舊權限或舊後端。

## 安全邊界

- Preview 是唯一真正公開的內容面。
- Admin data 由 Firebase Auth + Firestore role rules 保護。
- Functions 系統 collection 只允許 Admin 讀或完全禁止 client。
- Secrets 使用 Firebase Secret Manager，不進 Git 或 client bundle。
- 地址、房號、Wi-Fi、入口與門鎖文字只存在 `guestGuideContent/private`，不編譯進公開 bundle。
- 訪客碼 client 只能透過 Callable 取得經過清理的資料，不能直接讀訪客碼或 booking 文件。
- 含入口、門鎖與平面圖的敏感圖片不進 Hosting bundle；未來若重新提供，必須使用受保護媒體端點。

## 支出管理與財務總覽（2026-09-12）

- `/admin/expenses` 分為「已付款明細」與「每月固定支出」，管理者可依年度、月份、分類及來源篩選。`?year=2025&month=09` 可連結明細，`?scope=all` 查看全部期間。桌面導覽及手機「更多」保留入口。
- `/admin/revenue` 顯示年度與期間支出，JPY／TWD 各自以原幣加總，只顯示期間內實際存在的幣別，日圓不折算成新臺幣，也不與 TWD 收入相減。既有換算金額保留在文件，但不列入支出統計。
- `expenses/{id}` 保存名稱、分類、原幣整數金額、付款日 Timestamp、費用月份、方式、備註與操作者／時間。固定 JPY 支出 `amountTwd: null`，手動支出不再填寫或寫入換算欄位；amountTwd 僅容忍舊資料存在，不參與驗證原幣或加總。付款日期採 `Asia/Taipei`；曆年依付款日歸屬。
- 固定支出具有不可更改的 `recurringBillId`，可編輯付款資料，不可直接刪除或改幣別。手動支出可新增、編輯、複製、刪除。client 不可偽造固定來源。所有資料僅管理者可讀寫。
- `useExpenses` → `lib/expenses.ts` → Firestore 以 paidAt 範圍與排序查詢，無需複合索引。每次最多 10,001 筆，超過 10,000 顯示錯誤而不呈現不完整總額。

## 每月固定日圓支出

- `recurringExpenses/{id}`：固定名稱、分類、JPY 整數金額、扣款日（1–31）、起始月份、付款方式、備註、active 與 nextMonth 游標。起始月份允許 2000-01 至 2100-12；既有項目可往前延伸。新補月份採本次設定金額，已入帳月份不改寫、不重複產生。起始月份不能往後縮以免暗中刪帳。
- `manageRecurringExpenses` callable：驗證 Firebase Auth 與 Admin 角色，支援 saveTemplate、setActive、sync。設定儲存即補齊已到扣款日的歷史月份；開啟固定支出分頁也呼叫 sync。舊 confirmBill／skipBill API 已停用，UI 不再要求逐月確認或換匯。單次 timeout 為 540 秒。
- `generateMonthlyExpenseBills`：asia-east1，每日 00:15，Asia/Taipei，重試 3 次、timeout 540 秒。自動記錄到期扣款，未到期當月保留到扣款日再入帳，短月份以月底為扣款日；未開啟 UI 仍會執行。
- 每 24 個月份為一個 transaction，讀取各月帳單及支出後，原子寫入 `recurringExpenseBills/{templateId}_{YYYY-MM}`、`expenses/recurring_{billId}` 與游標；連續處理直到完整補齊，不再限制只補 12 個月。每日掃描設定每頁 100 筆，確保所有項目都有處理。
- 回溯延伸使用 backfillEndMonth／backfillResumeMonth 保留原游標，延伸完成後刪除臨時欄位，避免補進原本暫停的空白月份。暫停保留歷史，恢復從當月或未來起始月份繼續；暫停時提出的回溯延伸會在恢復後處理。
- 新固定帳單直接為 paid；支出 paidAt 為設定扣款日、currency 為 JPY、amountTwd 為 null，系統操作者為 system:recurring。既有 pending JPY 依原帳單快照與扣款日自動入帳，已 paid／skipped 保留；舊 TWD 固定資料不自行改幣別。
- 兩個固定支出 collections 均禁止 client 寫入，只能透過 callable 或排程操作。交易及固定文件 ID 防止並行同步或重試重複入帳。模板與月份清單超過 1,000 筆顯示錯誤。
- 驗證：Functions 測試、Firestore Emulator 的 Rules 與 recurringExpenses.integration.test.mjs（13 個月／超過 24 個月完整回溯、月末、到期、暫停恢復、延伸起始月份、legacy 遷移、防重複）、expenseFinance.test.mjs（幣別分開及跨年）、390px 與桌面 UI、npm run build。部署 Rules → manageRecurringExpenses／generateMonthlyExpenseBills → Hosting。

## App 重開後的支出讀取恢復

- `lib/expenseSubscription.ts` 管理即時監聽與備援生命週期。Firestore 首次 12 秒沒有伺服器回應或監聽報錯時，改由 `loadExpenseOverview` 讀取；每 30 秒重試／更新，較慢的備援回應不得覆蓋已恢復的即時資料。離開頁面清除 timer 與 listener。
- 備援首次讀取刷新既有 Firebase 登入憑證。App 回到前景、恢復網路、支出修改後會重新讀取；UI 提供「重新載入」，並區分登入／權限、資料量上限及連線錯誤。只記錄錯誤代碼，不記錄支出內容或憑證。
- `loadExpenseOverview`（asia-east1，60 秒）再次驗證登入及 users Admin 角色後，以相同付款年度、排序及 10,001 筆上限查詢 expenses，僅回傳原幣資料與時間數值。不得放寬 Firestore Rules 或對房客開放備援讀取。
- 已以正式資料的相同查詢確認可讀取、確認已部署 Rules 與本機一致；未取得回報裝置的錯誤碼，因此不斷言其具體斷線原因。測試涵蓋串流失敗／逾時、自動重試、競態回應、清理、備援管理者授權與原幣手動新增。
- 部署 Rules → loadExpenseOverview → Hosting。既有固定支出排程不變。
