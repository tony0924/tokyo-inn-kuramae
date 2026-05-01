import { Accordion } from '@/guest/shared/Accordion';
import { arrivalPhotos } from '@/guest/assets/photos';
import { ZoomableImg } from '@/guest/shared/Lightbox';
import { useJumpAnchor } from '@/guest/shared/useJumpAnchor';

export function ArrivalTab() {
  useJumpAnchor();

  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🚃</div>
        <h2>抵達指南</h2>
      </div>

      <div className="glass-card">
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
          〒111-0051 東京都台東区蔵前 4丁目23−7
          <br />
          日神デュオステージ蔵前ＮＥＸＴ
        </p>
        <a
          href="https://maps.app.goo.gl/fdn49QNQ2yPVje9F7"
          target="_blank"
          rel="noreferrer"
          className="map-btn"
        >
          📍 在 Google Maps 開啟
        </a>
      </div>

      <Accordion icon="🚇" title="交通方式" defaultOpen>
        <div className="sub-label">附近車站</div>
        <ul className="bullet-list">
          <li>
            <strong>都營大江戶線：藏前站</strong>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
              往羽田機場 → A2（手扶梯）/ A1b（電梯）　往成田機場 → A0（電梯）
            </span>
          </li>
          <li>
            <strong>都營淺草線：藏前站</strong>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
              不分方向 → A5（電梯）
            </span>
          </li>
          <li>
            <strong>東京 Metro 銀座線：田原町站</strong>
          </li>
        </ul>

        <div className="divider"></div>
        <div className="sub-label">🚇 交通便利地點</div>
        <ul className="bullet-list">
          <li>
            <strong>淺草線</strong>：東京車站、銀座、築地、晴空塔、橫濱、成田／羽田機場
          </li>
          <li>
            <strong>大江戶線</strong>：新宿、市政廳、東京巨蛋、清澄白河
          </li>
          <li>
            <strong>銀座線</strong>：澀谷
          </li>
          <li>
            <strong>公車「都 02」</strong>：上野、Skyliner 接駁
          </li>
        </ul>
      </Accordion>

      <Accordion icon="🏢" title="建築進入方式" defaultOpen>
        <ul className="bullet-list">
          <li>第一扇玻璃門 — 直接進入</li>
          <li>
            第二扇玻璃門 —{' '}
            <strong>需用鑰匙上的磁扣，感應右側牆上黑色感應區</strong>
          </li>
          <li>右側樓梯跟後門皆可使用鑰匙開門</li>
          <li>進入後搭電梯到二樓</li>
          <li>
            出電梯左轉，第一間房即為 <strong>204 室</strong>（門上有數字電子鎖）
          </li>
          <li>
            可使用數字密碼或用鑰匙轉動「上方」門鎖進入（下方門鎖請保留開啟狀態）
          </li>
        </ul>
        <div className="img-single">
          <ZoomableImg src={arrivalPhotos.building} alt="建築外觀" />
        </div>
        <div className="img-single">
          <ZoomableImg
            src={arrivalPhotos.doorLock}
            alt="門鎖說明"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </Accordion>

      <Accordion icon="🛋️" title="屋內照片">
        <div style={{ marginBottom: 14 }}>
          <ZoomableImg
            src={arrivalPhotos.floorPlan}
            alt="室內平面圖"
            style={{ maxWidth: '100%', borderRadius: 10 }}
          />
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-soft)',
              textAlign: 'center',
              marginTop: 5,
            }}
          >
            室內平面圖
          </div>
        </div>

        <PhotoGroup label="廚房" srcs={arrivalPhotos.kitchen} />
        <PhotoGroup label="客廳" srcs={arrivalPhotos.livingRoom} />
        <PhotoGroup label="臥室" srcs={arrivalPhotos.bedroom} />
        <PhotoGroup label="浴室" srcs={arrivalPhotos.bathroom} />
      </Accordion>

      <Accordion icon="📷" title="細節物品擺放">
        <PhotoGroup label="廚房" srcs={arrivalPhotos.kitchenDetails} />
        <PhotoGroup
          label="客廳壁櫃（棉被、枕頭、拋棄式床單）"
          srcs={arrivalPhotos.cabinetDetails}
        />
        <PhotoGroup label="玄關鞋櫃（拋棄式拖鞋）" srcs={arrivalPhotos.shoeCabinet} />
      </Accordion>

      <Accordion id="anchor-garbage" icon="🗑️" title="垃圾分類" defaultOpen>
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

function PhotoGroup({ label, srcs }: { label: string; srcs: string[] }) {
  return (
    <>
      <div className="sub-label">{label}</div>
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
