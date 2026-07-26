# Firebase Data Layer 規範

適用於 `src/lib/`。

## 責任

- 每個 domain 一個 module：auth、users、bookings、keys、guest access、analytics、messages、recommendations、notifications。
- 對 UI 暴露具 domain 意義的 function／watcher，不暴露 collection ref 讓 UI 自行組 query。
- 所有 Firestore 文件 shape 使用 `src/types/index.ts`。
- module 不得 import `src/admin`、`src/guest` 或 route component。

## 即時監聽

- `watchXxx` 回傳 Firestore `Unsubscribe`。
- callback 產生完整 typed domain objects，document id 要明確加入。
- query 必須有穩定排序；無限成長 collection 要使用 limit 或分頁。
- 多個元件需要同一 query 時由上層共用 subscription。

## 寫入

- 多文件一致性使用 batch／transaction。
- 使用 `serverTimestamp()`；不從 client 偽造系統完成時間。
- Email、訪客碼、鑰匙碼先 normalize。
- client 不得寫 Functions-only collection。
- 新增 query 同步確認 Firestore Rules 與 indexes。

## 錯誤與安全

- data layer 可拋出可處理的 Error；UI 決定顯示文字。
- 不在錯誤訊息或 log 暴露 token、secret、完整訪客碼或住客個資。
- Callable 固定使用 `src/lib/firebase.ts` 的 `asia-east1` Functions instance。

## 驗證

- `npm run build`
- 複雜純函式（normalize、日期範圍、衝突判斷）應抽出並加單元測試。
