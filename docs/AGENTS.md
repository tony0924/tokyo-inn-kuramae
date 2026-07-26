# 架構文件規範

適用於 `docs/`。

- `ARCHITECTURE.md` 是人類可讀的架構與流程入口。
- `CODE_REVIEW.md` 記錄具體、可排序、可驗證的改善項目。
- `architecture/` 保存架構圖原始輸出；使用描述性英文檔名與 PNG。
- 圖片不得含 secret、完整地址、Wi-Fi、門鎖資訊、有效訪客碼或真實住客資料。
- 程式新增 route、collection、Function、通知流程或部署 surface 時，同步更新文字與受影響圖表。
- ImageGen 圖中的文字若有誤，以 `AGENTS.md`／`ARCHITECTURE.md` 為準；交付前必須目視檢查。
- 純文件變更至少執行 `git diff --check`；圖片必須用影像檢視工具確認可讀性。
