import { Accordion } from '@/guest/shared/Accordion';
import { useJumpTo } from '@/guest/shared/useJumpAnchor';

export function CheckinTab() {
  const jumpTo = useJumpTo();

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">📋</div>
        <h2>入退房</h2>
      </div>

      <div className="callout warn">
        <span className="callout-icon">🔑</span>
        <div>
          <strong>取得鑰匙：</strong>
          請聯絡我們拿鑰匙，並轉帳住宿費用。同時取得電子鎖數位密碼。
        </div>
      </div>

      <Accordion icon="✅" title="Check-In 注意事項" defaultOpen>
        <ul className="checklist">
          <li>冰箱插電（如有需要使用）</li>
        </ul>

        <div className="instruction-card">
          <div className="instruction-card-title">床單／枕頭套使用說明（二擇一）</div>
          <div className="instruction-option">
            <strong>不用洗：</strong>
            <span>取出客廳壁櫃右側的拋棄式床單組，並套在床與枕頭上。</span>
          </div>
          <div className="instruction-option">
            <strong>需要洗：</strong>
            <span>
              將現有的床單和枕頭套放入洗衣機清洗，從櫃子中拿出乾淨的床單和枕頭套使用。
              洗完的床單與枕頭套晾乾後，請整理好放回櫃子。
            </span>
          </div>
        </div>

        <ul className="checklist">
          <li>
            客廳的壁櫃內為主人個人物品，<strong>請勿翻動</strong>
          </li>
          <li>
            全室（含陽台）<strong>禁菸</strong>
          </li>
          <li>
            使用廚房／浴室熱水前，請先開啟熱水機（
            <a
              href="#"
              className="inline-link"
              onClick={(e) => {
                e.preventDefault();
                jumpTo('facilities', 'anchor-hotwater');
              }}
            >
              詳見設施說明 →
            </a>
            ）
          </li>
          <li>若有必需品不足，請通知我們後自行購入並回傳收據，金額會退回</li>
        </ul>
      </Accordion>

      <Accordion icon="🏁" title="Check-Out 注意事項" defaultOpen>
        <ul className="checklist">
          <li>冷氣＆電視遙控器擺回客廳餐桌上</li>
          <li>全室地板用吸塵器清潔</li>
          <li>移除拋棄式床單</li>
          <li>清空冰箱</li>
          <li>
            丟棄所有垃圾（
            <a
              href="#"
              className="inline-link"
              onClick={(e) => {
                e.preventDefault();
                jumpTo('arrival', 'anchor-garbage');
              }}
            >
              請見「抵達」頁垃圾分類說明 →
            </a>
            ）
          </li>
          <li>關燈、關浴室抽風機、關熱水機</li>
          <li>拍照或錄影並回傳：臥室、客廳、冰箱、廚房、浴室</li>
        </ul>
      </Accordion>
    </div>
  );
}
