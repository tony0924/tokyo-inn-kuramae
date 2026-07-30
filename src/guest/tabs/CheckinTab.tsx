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

      <Accordion id="anchor-checkin" icon="✅" title="Check-In 注意事項" defaultOpen>
        <ul className="checklist">
          <li>冰箱插電（如有需要使用）</li>
        </ul>

        <ul className="checklist">
          <li>
            <div className="instruction-card">
              <div className="instruction-card-header">
                <div className="instruction-card-title">床單與枕頭套：請選一種方式</div>
                <span className="instruction-choice-badge">選一種即可</span>
              </div>
              <div className="instruction-table" role="table" aria-label="床單枕頭套使用說明">
                <div className="instruction-row" role="row">
                  <div className="instruction-label" role="cell">方式 A｜拋棄式</div>
                  <div className="instruction-content" role="cell">
                    <p className="instruction-summary">
                      套上櫃內的拋棄式床單與枕頭套，使用完畢後直接丟棄即可。
                    </p>
                    <ol className="instruction-steps">
                      <li>從客廳壁櫃右側取出拋棄式床單組。</li>
                      <li>將床單套在床上、枕頭套套在枕頭上。</li>
                    </ol>
                  </div>
                </div>
                <div className="instruction-row" role="row">
                  <div className="instruction-label" role="cell">方式 B｜布製</div>
                  <div className="instruction-content" role="cell">
                    <p className="instruction-summary">
                      換上櫃內乾淨的床單與枕頭套，並將床上原有的床單與枕頭套洗淨。
                    </p>
                    <ol className="instruction-steps">
                      <li>取下床上原有的床單與枕頭套，放入洗衣機清洗。</li>
                      <li>從櫃子取出乾淨的床單與枕頭套，換到床和枕頭上。</li>
                      <li>洗好的床單與枕頭套晾乾後，摺好放回櫃子。</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <ul className="checklist">
          <li>
            客廳的壁櫃內為主人個人物品，<strong>請勿翻動</strong>
          </li>
          <li>
            全室（含陽台）<strong>禁菸</strong>
          </li>
          <li>
            <span>
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
            </span>
          </li>
          <li>若有必需品不足，請通知我們後自行購入並回傳收據，金額會退回</li>
        </ul>
      </Accordion>

      <Accordion id="anchor-checkout" icon="🏁" title="Check-Out 注意事項" defaultOpen>
        <ul className="checklist">
          <li>冷氣＆電視遙控器擺回客廳餐桌上</li>
          <li>全室地板用吸塵器清潔</li>
          <li>移除拋棄式床單</li>
          <li>清空冰箱</li>
          <li>
            <span>
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
            </span>
          </li>
          <li>關燈、關浴室抽風機、關熱水機</li>
          <li>拍照或錄影並回傳：臥室、客廳、冰箱、廚房、浴室</li>
        </ul>
      </Accordion>
    </div>
  );
}
