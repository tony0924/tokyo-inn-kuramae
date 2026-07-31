import { Accordion } from '@/guest/shared/Accordion';
import { arrivalPhotos } from '@/guest/assets/photos';
import { ZoomableImg } from '@/guest/shared/Lightbox';
import { useJumpAnchor } from '@/guest/shared/useJumpAnchor';
import { useGuestGuide } from '@/guest/GuestGuideProvider';

export function ArrivalTab() {
  useJumpAnchor();
  const { guide } = useGuestGuide();

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🚃</div>
        <h2>抵達指南</h2>
      </div>

      <div className="glass-card" id="anchor-arrival-flow">
        <div className="card-header">
          <div className="card-icon">📍</div>
          <div className="card-title">住宿地址</div>
        </div>
        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-mid)',
            lineHeight: 1.7,
            marginBottom: 14,
          }}
        >
          {guide?.accommodation.address}
          <br />
          {guide?.accommodation.buildingName}
        </p>
        <a
          href={guide?.accommodation.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="map-btn"
        >
          📍 在 Google Maps 開啟
        </a>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon">🧭</div>
          <div className="card-title">抵達當天流程</div>
        </div>
        <ol className="step-list compact">
          {guide?.arrival.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>

      <Accordion id="anchor-building" icon="🏢" title="建築進入方式" defaultOpen>
        <ul className="bullet-list">
          {guide?.arrival.buildingAccess.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Accordion>

      <Accordion icon="🛋️" title="屋內照片">
        <PhotoGroup label="廚房" hint="找 IH 爐、冰箱與備品位置" srcs={arrivalPhotos.kitchen} />
        <PhotoGroup label="客廳" hint="找沙發床、壁櫃與餐桌位置" srcs={arrivalPhotos.livingRoom} />
        <PhotoGroup label="臥室" hint="確認床、枕頭、棉被與冷氣位置" srcs={arrivalPhotos.bedroom} />
        <PhotoGroup label="浴室" hint="找洗衣機、熱水機與浴室設備" srcs={arrivalPhotos.bathroom} />
      </Accordion>

      <Accordion icon="📷" title="細節物品擺放">
        <PhotoGroup label="廚房" hint="餐具、鍋具與調味料位置" srcs={arrivalPhotos.kitchenDetails} />
        <PhotoGroup
          label="客廳壁櫃（棉被、枕頭、拋棄式床單）"
          hint="找床單、枕頭、棉被請看這裡"
          srcs={arrivalPhotos.cabinetDetails}
        />
        <PhotoGroup label="玄關鞋櫃（拋棄式拖鞋）" hint="找拖鞋與玄關備品" srcs={arrivalPhotos.shoeCabinet} />
      </Accordion>

      <Accordion id="anchor-garbage" icon="🗑️" title="垃圾分類" defaultOpen>
        <div className="callout info">
          <span className="callout-icon">📍</span>
          <div>
            <strong>位置：</strong>{guide?.garbageLocation}
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

function PhotoGroup({ label, hint, srcs }: { label: string; hint?: string; srcs: string[] }) {
  return (
    <>
      <div className="sub-label">{label}</div>
      {hint && <div className="photo-hint">{hint}</div>}
      <div className="img-grid">
        {srcs.map((src) => (
          <ZoomableImg
            key={src}
            src={src}
            alt={label}
            style={{ width: '100%', borderRadius: 8 }}
          />
        ))}
      </div>
    </>
  );
}
