import { Accordion } from '@/guest/shared/Accordion';
import { facilityPhotos } from '@/guest/assets/photos';
import { ZoomableImg } from '@/guest/shared/Lightbox';
import { useJumpAnchor } from '@/guest/shared/useJumpAnchor';

export function FacilitiesTab() {
  useJumpAnchor();

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🔧</div>
        <h2>設施說明</h2>
      </div>

      <Accordion icon="🚪" title="玄關 — 門鎖" defaultOpen>
        <ul className="bullet-list">
          <li>
            Open：往<strong>逆時針</strong>轉 → 鎖起
          </li>
          <li>
            Lock：往<strong>順時針</strong>轉 → 打開
          </li>
        </ul>
        <div className="img-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <ZoomableImg
            src={facilityPhotos.doorOpen}
            alt="Open"
            style={{ width: '100%', borderRadius: 8 }}
          />
          <ZoomableImg
            src={facilityPhotos.doorLock}
            alt="Lock"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </div>
      </Accordion>

      <Accordion icon="💡" title="燈具遙控器">
        <ul className="bullet-list">
          <li>當吸頂燈已開啟，可用遙控器統一控制全室燈光。</li>
          <li>出門前在門口一鍵關閉全室；回家時一鍵開啟。</li>
        </ul>
        <div className="img-single">
          <ZoomableImg
            src={facilityPhotos.lightRemote}
            alt="燈具遙控器"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="🛋️" title="沙發床">
        <ul className="bullet-list">
          <li>攤開：將沙發拉起 90 度，用力折疊後攤平</li>
          <li>收起：反之</li>
        </ul>
        <div className="img-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <ZoomableImg
            src={facilityPhotos.sofaOpen}
            alt="展開"
            style={{ width: '100%', borderRadius: 8 }}
          />
          <ZoomableImg
            src={facilityPhotos.sofaClosed}
            alt="收起"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </div>
      </Accordion>

      <Accordion icon="🪑" title="翻轉茶几">
        <ul className="bullet-list">
          <li>桌板可拆，根據需求選擇高度後再安裝桌板。</li>
        </ul>
        <div className="img-single">
          <ZoomableImg
            src={facilityPhotos.table}
            alt="翻轉茶几"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="📺" title="電視">
        <div className="callout success">
          <span className="callout-icon">✅</span>
          <div>
            電視可以<strong>自由移動</strong>，不要懷疑！
          </div>
        </div>
      </Accordion>

      <Accordion icon="🍳" title="廚房 — IH 爐" defaultOpen>
        <ol className="step-list">
          <li>先開啟最右側「電源」</li>
          <li>選取對應火爐的開關「切 / start」</li>
          <li>選擇火力（弱火、中火、強火）</li>
        </ol>
        <div className="img-single">
          <ZoomableImg
            src={facilityPhotos.ihStove}
            alt="IH爐"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="💨" title="抽油煙機">
        <ul className="bullet-list">
          <li>使用 IH 爐前，請先將上方抽油煙機板子放下。</li>
          <li>同時按下左右兩側的扣環即可拉下。</li>
        </ul>
        <div
          className="img-grid"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          <ZoomableImg
            src={facilityPhotos.rangeHoodLatch}
            style={{ width: '100%', borderRadius: 8 }}
          />
          <ZoomableImg
            src={facilityPhotos.rangeHoodOpen}
            style={{ width: '100%', borderRadius: 8 }}
          />
          <ZoomableImg
            src={facilityPhotos.rangeHoodUsage}
            style={{ width: '100%', borderRadius: 8 }}
          />
        </div>
      </Accordion>

      <Accordion id="anchor-hotwater" icon="🚿" title="浴室 — 熱水機" defaultOpen>
        <div className="callout warn">
          <span className="callout-icon">⚠️</span>
          <div>
            使用熱水前，<strong>請務必先打開熱水機</strong>
            （廚房和浴室皆適用）。
          </div>
        </div>
        <ul className="bullet-list">
          <li>
            熱水器開關在 <strong>廚房洗手槽旁</strong> 及{' '}
            <strong>浴缸旁</strong>
          </li>
          <li>先將浴缸堵好，再按下最右邊的自動放水按鈕</li>
        </ul>
        <div className="img-single">
          <ZoomableImg
            src={facilityPhotos.waterHeater}
            alt="熱水機"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="🌬️" title="浴室 — 抽風機">
        <ul className="bullet-list">
          <li>
            <strong>換氣</strong>：洗澡時建議開啟
          </li>
          <li>
            <strong>衣類乾燥</strong>：衣服掛在浴室內，使用衣類乾燥模式約 4
            小時即可
          </li>
        </ul>
        <div className="img-single">
          <ZoomableImg
            src={facilityPhotos.bathroomFan}
            alt="抽風機"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="🗑️" title="垃圾處理">
        <div className="callout info">
          <span className="callout-icon">📍</span>
          <div>
            <strong>位置：</strong>面對一樓電梯右手邊
          </div>
        </div>
        <ul className="bullet-list">
          <li>
            <strong>一般垃圾</strong>：裝袋後，放在右手邊的檯面上
          </li>
          <li>
            <strong>廚餘</strong>：視同一般垃圾，一起裝袋放置
          </li>
          <li>
            <strong>寶特瓶</strong>：撕掉瓶身標籤，放入左側下方的籃子
          </li>
          <li>
            <strong>其他塑膠類</strong>：走到底，丟入大型網袋
          </li>
          <li>
            <strong>紙板</strong>：走到底左轉，放在檯面上
          </li>
          <li>其餘未標明者，請參考其他日本人放置方式</li>
        </ul>
      </Accordion>
    </div>
  );
}
