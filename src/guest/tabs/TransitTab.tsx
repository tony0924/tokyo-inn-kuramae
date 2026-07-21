import { Accordion } from '@/guest/shared/Accordion';

const mapSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const STAY_ADDRESS = '東京都台東区蔵前4丁目23-7 日神デュオステージ蔵前NEXT';

const mapWalkingUrl = (destination: string) => {
  const params = new URLSearchParams({
    api: '1',
    origin: STAY_ADDRESS,
    destination,
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const transitPlaces = [
  { icon: '🚇', label: '住宿 → 淺草線・藏前站', query: '都営浅草線 蔵前駅' },
  { icon: '🚇', label: '住宿 → 大江戶線・藏前站', query: '都営大江戸線 蔵前駅' },
  { icon: '🚇', label: '住宿 → 田原町站', query: '東京メトロ 田原町駅' },
  { icon: '🚌', label: '住宿 → 藏前站前公車站', query: '蔵前駅前 バス停' },
];

export function TransitTab() {
  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🚇</div>
        <h2>地鐵／公車</h2>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon">📍</div>
          <div className="card-title">Google Maps 步行路線</div>
        </div>
        <p className="airport-lead">點選後會從住宿直接開啟前往車站或公車站的步行路線。</p>
        <div className="airport-map-actions">
          {transitPlaces.map((place) => (
            <a
              key={place.label}
              href={mapWalkingUrl(place.query)}
              target="_blank"
              rel="noreferrer"
              className="map-btn"
            >
              {place.icon} {place.label}
            </a>
          ))}
        </div>
        <div className="map-location-links">
          <span>只想查看位置：</span>
          <a href={mapSearchUrl(STAY_ADDRESS)} target="_blank" rel="noreferrer">住宿</a>
          <a href={mapSearchUrl('都営浅草線 蔵前駅')} target="_blank" rel="noreferrer">淺草線藏前站</a>
          <a href={mapSearchUrl('都営大江戸線 蔵前駅')} target="_blank" rel="noreferrer">大江戶線藏前站</a>
          <a href={mapSearchUrl('東京メトロ 田原町駅')} target="_blank" rel="noreferrer">田原町站</a>
          <a href={mapSearchUrl('蔵前駅前 バス停')} target="_blank" rel="noreferrer">公車站</a>
        </div>
      </div>

      <Accordion icon="🚇" title="附近地鐵站" defaultOpen>
        <ul className="bullet-list">
          <li>
            <strong>都營淺草線・藏前站（A17）</strong>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
              距離住宿最近，可前往淺草、押上（晴空塔）、新橋，以及羽田／成田機場方向。
            </span>
          </li>
          <li>
            <strong>都營大江戶線・藏前站（E11）</strong>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
              可前往兩國、築地市場、新宿、東京巨蛋與清澄白河。
            </span>
          </li>
          <li>
            <strong>東京 Metro 銀座線・田原町站（G18）</strong>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.82rem' }}>
              步行約 10 分鐘，可前往上野、銀座、澀谷。
            </span>
          </li>
        </ul>
      </Accordion>

      <Accordion icon="🚌" title="藏前站前都營公車" defaultOpen>
        <ul className="bullet-list">
          <li><strong>都 02</strong>：可往錦糸町／上野、御徒町方向。</li>
          <li><strong>東 42</strong>：可往南千住方向。</li>
          <li><strong>東 42-1</strong>：可往東京站八重洲口方向。</li>
        </ul>
        <a href={mapWalkingUrl('蔵前駅前 バス停')} target="_blank" rel="noreferrer" className="map-btn">
          🚌 從住宿步行至藏前站前公車站
        </a>
      </Accordion>
    </div>
  );
}
