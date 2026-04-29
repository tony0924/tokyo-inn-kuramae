# Deployment Guide

改完 code 後，可以照這份流程把網站更新到線上。

## 1. 進入專案資料夾

```bash
cd /Users/chenweian/Documents/git/tokyo-inn-kurama/tokyo_inn
```

## 2. 確認可以成功 build

```bash
npm run build
```

如果成功，會產生 `dist/`。Firebase Hosting 會部署這個資料夾。

如果只改 Cloud Functions，也建議檢查語法：

```bash
/opt/homebrew/bin/node --check functions/index.js
```

## 3. 依照改動類型選擇部署指令

### 只改前端畫面

例如改 `src/`、圖片、CSS、管理後台畫面、guest 頁面。

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project tokyo-inn-kuramae
```

線上網址：

```text
https://tokyo-inn-kuramae.web.app
```

### 只改 Firestore Rules 或 Indexes

例如改 `firestore.rules` 或 `firestore.indexes.json`。

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules,firestore:indexes --project tokyo-inn-kuramae
```

### 只改 Email 排程或 Cloud Functions

例如改 `functions/index.js`、入住通知、退房通知、Gmail SMTP、排程時間。

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project tokyo-inn-kuramae
```

部署後確認 functions 狀態：

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js functions:list --project tokyo-inn-kuramae
```

應該看到：

- `sendUpcomingCheckInReminders`
- `sendCheckoutAdminReminders`

兩個都在 `asia-east1`，Trigger 是 `scheduled`。

### 前端、Firestore、Functions 都有改

可以分開部署，較好判斷哪一步出問題：

```bash
npm run build
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only hosting --project tokyo-inn-kuramae
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore:rules,firestore:indexes --project tokyo-inn-kuramae
```

```bash
/opt/homebrew/bin/node /Users/chenweian/.npm-global/lib/node_modules/firebase-tools/lib/bin/firebase.js deploy --only functions --project tokyo-inn-kuramae
```

## 4. 注意 Cloud Functions 的已知警告

部署 functions 時，最後可能看到類似：

```text
Functions successfully deployed but could not set up cleanup policy in location asia-east1
```

如果同時看到：

```text
3 Functions Deployed
0 Functions Errored
0 Function Deployments Aborted
```

代表 functions 已經成功上線。這個錯誤是 Artifact Registry 清理政策沒有設定，不是程式部署失敗。

## 5. 上線後檢查

前端頁面：

```text
https://tokyo-inn-kuramae.web.app
```

管理後台：

```text
https://tokyo-inn-kuramae.web.app/admin
```

訪客碼登入：

```text
https://tokyo-inn-kuramae.web.app/code-login
```

## 6. 常見測試

### 測試前端

1. 打開首頁。
2. 登入 admin。
3. 進入管理後台。
4. 新增一筆測試預約。
5. 確認會自動建立訪客碼。
6. 確認訪客碼建立後立即可用，且效期到退房隔日。
7. 用訪客碼到 `/code-login` 登入。

### 測試 Email

Email 排程目前是：

- 入住前一天早上 9:00 寄入住提醒給房客，並 CC admin。
- 退房當天中午 12:00 寄退房提醒給 admin。

Cloud Functions 使用：

- Gmail SMTP
- Firebase Secret：`GMAIL_APP_PASSWORD`
- Firestore database：`default`
- Region：`asia-east1`
- Timezone：`Asia/Taipei`

不要把 Gmail app password 寫進 code 或文件。

## 7. 清理本機 build 產物

如果只是測試 build，不想保留產物，可以清掉：

```bash
rm -rf dist tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo
```

下次部署 hosting 前，記得重新跑：

```bash
npm run build
```
