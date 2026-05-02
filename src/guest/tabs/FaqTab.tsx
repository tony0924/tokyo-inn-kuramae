import { Accordion } from '@/guest/shared/Accordion';
import { useJumpTo } from '@/guest/shared/useJumpAnchor';

export function FaqTab() {
  const jumpTo = useJumpTo();

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">❓</div>
        <h2>常見問題</h2>
      </div>

      <Accordion icon="📶" title="Wi-Fi 怎麼連？" defaultOpen>
        <p className="faq-answer">Wi-Fi 名稱是 chen204，密碼是 12345678。首頁也可以一鍵複製密碼。</p>
      </Accordion>

      <Accordion icon="🚿" title="沒有熱水怎麼辦？" defaultOpen>
        <p className="faq-answer">
          使用廚房或浴室熱水前，請先開啟熱水機。
          <button type="button" className="inline-button-link" onClick={() => jumpTo('facilities', 'anchor-hotwater')}>
            查看熱水機位置 →
          </button>
        </p>
      </Accordion>

      <Accordion icon="🛏️" title="床單和枕頭套怎麼處理？">
        <p className="faq-answer">
          可二選一：使用拋棄式床單組，或清洗現有床單枕頭套後，換上櫃內乾淨的床單與枕頭套。
          <button type="button" className="inline-button-link" onClick={() => jumpTo('checkin', 'anchor-checkin')}>
            查看 Check-In 說明 →
          </button>
        </p>
      </Accordion>

      <Accordion icon="🗑️" title="垃圾要丟哪裡？">
        <p className="faq-answer">
          垃圾區在一樓，面對電梯右手邊。一般垃圾裝袋後放右側檯面，資源回收依現場分類放置。
          <button type="button" className="inline-button-link" onClick={() => jumpTo('arrival', 'anchor-garbage')}>
            查看垃圾分類 →
          </button>
        </p>
      </Accordion>

      <Accordion icon="🔑" title="鑰匙和門鎖怎麼用？">
        <p className="faq-answer">
          第二扇玻璃門需用鑰匙上的磁扣感應，房門可使用電子鎖密碼或鑰匙開門。
          <button type="button" className="inline-button-link" onClick={() => jumpTo('arrival', 'anchor-building')}>
            查看進房流程 →
          </button>
        </p>
      </Accordion>

      <Accordion icon="🏁" title="退房前要做什麼？">
        <p className="faq-answer">
          請清空冰箱、移除拋棄式床單、丟棄垃圾、關燈與熱水機，並拍照或錄影回傳房內狀態。
          <button type="button" className="inline-button-link" onClick={() => jumpTo('checkin', 'anchor-checkout')}>
            查看 Check-Out 清單 →
          </button>
        </p>
      </Accordion>
    </div>
  );
}
