import { useEffect, useRef, useState } from 'react';
import { Accordion } from '@/guest/shared/Accordion';
import { arrivalPhotos } from '@/guest/assets/photos';
import { ZoomableImg, type GalleryImage } from '@/guest/shared/Lightbox';
import { useJumpAnchor } from '@/guest/shared/useJumpAnchor';
import { useGuestGuide } from '@/guest/GuestGuideProvider';

const roomGroups = [
  { label: '廚房', hint: 'IH 爐、冰箱與備品位置', srcs: arrivalPhotos.kitchen },
  { label: '客廳', hint: '沙發床、壁櫃與餐桌位置', srcs: arrivalPhotos.livingRoom },
  { label: '臥室', hint: '床、枕頭、棉被與冷氣位置', srcs: arrivalPhotos.bedroom },
  { label: '浴室', hint: '洗衣機、熱水機與浴室設備', srcs: arrivalPhotos.bathroom },
];
const detailGroups = [
  { label: '廚房備品', hint: '餐具、鍋具與調味料位置', srcs: arrivalPhotos.kitchenDetails },
  { label: '客廳壁櫃', hint: '棉被、枕頭與拋棄式床單', srcs: arrivalPhotos.cabinetDetails },
  { label: '玄關鞋櫃', hint: '拋棄式拖鞋與玄關備品', srcs: arrivalPhotos.shoeCabinet },
];
const gallery: GalleryImage[] = [...roomGroups, ...detailGroups].flatMap(({ label, srcs }) =>
  srcs.map((src, index) => ({ src, alt: `${label} · ${index + 1}` }))
);

export function ArrivalTab() {
  useJumpAnchor();
  const { guide } = useGuestGuide();

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  async function copyAddress() {
    if (!guide) return;
    try {
      await navigator.clipboard.writeText(`${guide.accommodation.address}\n${guide.accommodation.buildingName}`);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), 3000);
  }

  return (
    <div className="section active arrival-page">
      <header className="arrival-intro">
        <span className="arrival-eyebrow">WELCOME TO KURAMAE</span>
        <h2>從抵達，到安心入住。</h2>
        <p>先找到住宿，再跟著指引進房。需要找備品時，往下看照片就好。</p>
        <nav className="arrival-shortcuts" aria-label="抵達指南段落">
          <a href="#anchor-arrival-flow">01 導航</a>
          <a href="#anchor-arrival-steps">02 抵達流程</a>
          <a href="#anchor-building">03 進入建築</a>
          <a href="#anchor-room-photos">屋內照片</a>
        </nav>
      </header>

      <section className="arrival-destination" id="anchor-arrival-flow" aria-labelledby="arrival-address-title">
        <div className="arrival-step-heading">
          <span className="arrival-step-number">01</span>
          <div><span className="arrival-eyebrow">YOUR DESTINATION</span><h3 id="arrival-address-title">前往住宿</h3></div>
        </div>
        <div className="arrival-address">
          <p>{guide?.accommodation.address}</p>
          <span>{guide?.accommodation.buildingName}</span>
        </div>
        <div className="arrival-actions">
          {guide?.accommodation.mapUrl && <a href={guide.accommodation.mapUrl} target="_blank" rel="noreferrer" className="arrival-primary-action">開啟 Google Maps <span aria-hidden="true">↗</span></a>}
          <button type="button" className="arrival-copy-action" onClick={copyAddress} disabled={!guide}>複製地址</button>
        </div>
        <p className="arrival-copy-status" role="status">{copyStatus === 'copied' ? '已複製地址，可貼到地圖或傳給同行旅伴。' : copyStatus === 'error' ? '無法自動複製，請長按上方地址選取文字。' : '可先開啟導航，抵達後再看下面的進房指引。'}</p>
      </section>

      <section className="arrival-flow" id="anchor-arrival-steps" aria-labelledby="arrival-flow-title">
        <div className="arrival-step-heading">
          <span className="arrival-step-number">02</span>
          <div><span className="arrival-eyebrow">ON ARRIVAL</span><h3 id="arrival-flow-title">抵達當天流程</h3></div>
        </div>
        <ol className="arrival-timeline">
          {guide?.arrival.steps.map((step, index) => <li key={step}><span className="arrival-timeline-dot" aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}
        </ol>
      </section>

      <section className="arrival-building" id="anchor-building" aria-labelledby="arrival-building-title">
        <div className="arrival-step-heading">
          <span className="arrival-step-number">03</span>
          <div><span className="arrival-eyebrow">WELCOME INSIDE</span><h3 id="arrival-building-title">進入建築與進房指引</h3></div>
        </div>
        <ul className="bullet-list">
          {guide?.arrival.buildingAccess.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="arrival-settle" aria-labelledby="arrival-settle-title">
        <header className="arrival-settle-heading"><span className="arrival-eyebrow">MAKE YOURSELF AT HOME</span><h3 id="arrival-settle-title">放下行李，慢慢熟悉這裡。</h3><p>點照片放大，可左右切換查看屋內空間與備品位置。</p></header>
        <Accordion id="anchor-room-photos" icon="🛋️" title="屋內空間" defaultOpen>
          {roomGroups.map((group) => <PhotoGroup key={group.label} {...group} />)}
        </Accordion>
        <Accordion icon="📷" title="備品與收納位置">
          {detailGroups.map((group) => <PhotoGroup key={group.label} {...group} />)}
        </Accordion>
      </section>

      <Accordion id="anchor-garbage" icon="🗑️" title="垃圾分類">
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
    <div className="arrival-photo-group">
      <div className="arrival-photo-heading"><h4>{label}</h4><span>{srcs.length} 張照片</span></div>
      {hint && <p className="arrival-photo-hint">{hint}</p>}
      <div className="img-grid">
        {srcs.map((src) => (
          <ZoomableImg
            key={src}
            src={src}
            alt={gallery.find((image) => image.src === src)?.alt ?? label}
            gallery={gallery}
          />
        ))}
      </div>
    </div>
  );
}
