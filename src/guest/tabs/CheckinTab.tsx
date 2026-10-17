import { Accordion } from '@/guest/shared/Accordion';
import { useOutletContext } from 'react-router-dom';
import type { GuestOutletContext } from '@/guest/GuestLayout';
import { CheckoutChecklist } from '@/guest/shared/CheckoutChecklist';
import { useJumpAnchor, useJumpTo } from '@/guest/shared/useJumpAnchor';

export function CheckinTab() {
  useJumpAnchor();
  const jumpTo = useJumpTo();
  const { booking } = useOutletContext<GuestOutletContext>();

  return (
    <div className="section active checkin-page">
      <header className="stay-guide-intro">
        <span className="arrival-eyebrow">YOUR STAY, STEP BY STEP</span>
        <h2>住得自在，離開也從容。</h2>
        <p>入住前確認鑰匙，住下來熟悉設備，離開前照著清單整理。</p>
        <nav className="arrival-shortcuts" aria-label="入退房指南段落">
          <a href="#anchor-before-checkin">入住前</a>
          <a href="#anchor-checkin">入住準備</a>
          <a href="#anchor-during-stay">住宿中</a>
          <a href="#anchor-checkout">退房前</a>
        </nav>
      </header>
      <section className="stay-guide-before" id="anchor-before-checkin" aria-labelledby="stay-before-title">
        <h3 id="stay-before-title">入住前，先確認這兩件事。</h3>
        <div className="stay-guide-times"><div><span>CHECK-IN · 入住</span><strong>15:00 後</strong></div><div><span>CHECK-OUT · 退房</span><strong>11:00 前</strong></div></div>
        <div className="callout warn">
          <span className="callout-icon">🔑</span>
          <div>
            <strong>取得鑰匙：</strong>
            請聯絡我們拿鑰匙，並轉帳住宿費用。同時取得電子鎖數位密碼。
          </div>
        </div>

        <button type="button" className="checkout-detail-link" onClick={() => jumpTo('arrival', 'anchor-building')}>查看抵達與進房指引 →</button>
      </section>

      <Accordion id="anchor-checkin" icon="✅" title="入住準備｜床單與設備" defaultOpen>
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

      </Accordion>

      <Accordion id="anchor-during-stay" icon="🏠" title="住宿中｜室內規則與使用提醒" defaultOpen>
        <ul className="checklist">
          <li>
            <span>客廳的壁櫃內為主人個人物品，<strong>請勿翻動</strong></span>
          </li>
          <li>
            <span>全室（含陽台）<strong>禁菸</strong></span>
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

      <div id="anchor-checkout">
        <CheckoutChecklist bookingId={booking?.id} details />
      </div>
    </div>
  );
}
