import { Accordion } from '@/guest/shared/Accordion';

const mapSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const STAY_ADDRESS = '東京都台東区蔵前4丁目23-7 日神デュオステージ蔵前NEXT';
const KOTOBUKI_SANCHO_BUS_STOP = '35.704533,139.787918';

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
            <div>
              <strong>都營淺草線・藏前站（A17）・步行約 5 分鐘</strong>
              <br />
              <span style={{ color: 'var(--text)', fontSize: '0.82rem' }}>
                距離住宿最近，可前往淺草、押上（晴空塔）、新橋，以及羽田／成田機場方向。
              </span>
              <ul className="station-directions">
                <li><strong>往押上／成田機場方向：</strong>淺草、押上（晴空塔）；部分直通班次可往成田機場。</li>
                <li><strong>往西馬込／羽田機場方向：</strong>新橋、三田、泉岳寺、品川；部分直通班次可往羽田機場。</li>
              </ul>
              <a href={mapWalkingUrl('都営浅草線 蔵前駅')} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                📍 住宿 → 淺草線・藏前站
              </a>
            </div>
          </li>
          <li>
            <div>
              <strong>都營大江戶線・藏前站（E11）・步行約 5 分鐘</strong>
              <br />
              <span style={{ color: 'var(--text)', fontSize: '0.82rem' }}>
                可前往兩國、築地市場、新宿、東京巨蛋與清澄白河。
              </span>
              <ul className="station-directions">
                <li><strong>往新宿／都廳方向：</strong>新御徒町、上野御徒町、飯田橋、代代木、新宿。</li>
                <li><strong>往兩國／築地市場方向：</strong>兩國、清澄白河、門前仲町、月島、築地市場、六本木。</li>
              </ul>
              <a href={mapWalkingUrl('都営大江戸線 蔵前駅')} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                📍 住宿 → 大江戶線・藏前站
              </a>
            </div>
          </li>
          <li>
            <div>
              <strong>東京 Metro 銀座線・田原町站（G18）・步行約 12 分鐘</strong>
              <br />
              <span style={{ color: 'var(--text)', fontSize: '0.82rem' }}>
                可前往上野、銀座、澀谷。
              </span>
              <ul className="station-directions">
                <li><strong>往淺草方向：</strong>淺草、雷門、淺草寺；可轉往晴空塔。</li>
                <li><strong>往澀谷方向：</strong>上野、銀座、新橋、表參道、澀谷。</li>
              </ul>
              <a href={mapWalkingUrl('東京メトロ 田原町駅')} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                📍 住宿 → 田原町站
              </a>
            </div>
          </li>
        </ul>
      </Accordion>

      <Accordion icon="🚌" title="藏前站前都營公車" defaultOpen>
        <ul className="bullet-list">
          <li>
            <div>
              <strong>最近：壽三丁目公車站・步行約 2 分鐘</strong>
              <br />
              <strong>都 02｜上車點：壽三丁目</strong>
              <ul className="station-directions">
                <li><strong>往錦糸町站方向：</strong>錦糸町。</li>
                <li><strong>往大塚站前方向：</strong>上野、御徒町、巢鴨、大塚。</li>
              </ul>
              <a href={mapWalkingUrl(KOTOBUKI_SANCHO_BUS_STOP)} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                🚌 住宿 → 都 02 上車點：壽三丁目
              </a>

              <strong className="bus-stop-heading">ぐるーりめぐりん｜上車點：壽三丁目</strong>
              <ul className="station-directions">
                <li><strong>單向循環：</strong>大江戶線藏前站、新御徒町、台東區役所、上野站入谷口、淺草、三之輪方向。</li>
              </ul>
              <a href={mapWalkingUrl(KOTOBUKI_SANCHO_BUS_STOP)} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                🚌 住宿 → めぐりん上車點：壽三丁目
              </a>

              <strong className="bus-stop-heading">更多路線：藏前站前公車站・步行約 5 分鐘</strong>
              <ul className="station-directions">
                <li><strong>東 42｜上車點：藏前站前：</strong>往南千住方向可到淺草、南千住。</li>
                <li><strong>東 42-1｜上車點：藏前站前：</strong>往東京站八重洲口方向可到日本橋、東京站。</li>
              </ul>
              <a href={mapWalkingUrl('蔵前駅前 バス停')} target="_blank" rel="noreferrer" className="map-btn station-walking-link">
                🚌 住宿 → 藏前站前公車站
              </a>
              <div className="bus-route-links" aria-label="公車路線地圖連結">
                <a href={mapSearchUrl('都営バス 都02 蔵前駅前')} target="_blank" rel="noreferrer" className="map-btn">
                  🚌 查看 都 02 路線
                </a>
                <a href={mapSearchUrl('都営バス 東42 蔵前駅前')} target="_blank" rel="noreferrer" className="map-btn">
                  🚌 查看 東 42 路線
                </a>
                <a href={mapSearchUrl('都営バス 東42-1 蔵前駅前')} target="_blank" rel="noreferrer" className="map-btn">
                  🚌 查看 東 42-1 路線
                </a>
                <a href={mapSearchUrl('ぐるーりめぐりん 寿三丁目')} target="_blank" rel="noreferrer" className="map-btn">
                  🚌 查看 ぐるーりめぐりん 路線
                </a>
              </div>
            </div>
          </li>
        </ul>
      </Accordion>
    </div>
  );
}
