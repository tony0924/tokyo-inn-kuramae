const STAY_ADDRESS = '東京都台東区蔵前4丁目23-7 日神デュオステージ蔵前NEXT';

const googleMapsTransitUrl = (origin: string) => {
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination: STAY_ADDRESS,
    travelmode: 'transit',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export function AirportTransitTab() {
  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">✈️</div>
        <h2>機場交通</h2>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <div className="card-icon">🗺️</div>
          <div className="card-title">Google Maps 路線</div>
        </div>
        <p className="airport-lead">
          下方按鈕會直接帶入「機場 → 住宿」的起點與目的地，打開後建議再確認出發時間與當天班次。
        </p>
        <div className="airport-map-actions">
          <a
            href={googleMapsTransitUrl('Narita International Airport')}
            target="_blank"
            rel="noreferrer"
            className="map-btn"
          >
            🛫 成田機場 → 住宿
          </a>
          <a
            href={googleMapsTransitUrl('Haneda Airport')}
            target="_blank"
            rel="noreferrer"
            className="map-btn"
          >
            🛫 羽田機場 → 住宿
          </a>
        </div>
      </div>

      <div className="airport-route-grid">
        <section className="glass-card airport-route-card">
          <div className="card-header">
            <div className="card-icon">🛬</div>
            <div className="card-title">成田機場 → 住宿</div>
          </div>
          <div className="route-meta">
            <span className="tag tag-gold">推薦 Sky Access</span>
            <span className="tag tag-green">約 1 小時</span>
            <span className="tag tag-red">不推薦 Skyliner</span>
          </div>

          <div className="sub-label">推薦路線</div>
          <ul className="bullet-list">
            <li>
              推薦搭乘 <strong>Sky Access 特急</strong> 或{' '}
              <strong>Sky Access 機場特快</strong>，接都營淺草線方向前往藏前。
            </li>
            <li>
              如果是 <strong>Sky Access 特急</strong>，通常可以直達藏前站。
            </li>
            <li>
              如果是 <strong>Sky Access 機場特快</strong>，列車不會停藏前站，請在藏前前一站
              <strong> 淺草站</strong> 下車，於同月台等下一班往藏前方向的車再上車。
            </li>
          </ul>

          <div className="sub-label">不推薦 Skyliner 的原因</div>
          <ul className="bullet-list">
            <li>票價較高。</li>
            <li>到住宿還需要再轉車，整體不一定比較省事。</li>
          </ul>

          <a
            href={googleMapsTransitUrl('Narita International Airport')}
            target="_blank"
            rel="noreferrer"
            className="map-btn"
          >
            📍 用 Google Maps 查看成田路線
          </a>
        </section>

        <section className="glass-card airport-route-card">
          <div className="card-header">
            <div className="card-icon">🛫</div>
            <div className="card-title">羽田機場 → 住宿</div>
          </div>
          <div className="route-meta">
            <span className="tag tag-gold">推薦京急機場線</span>
            <span className="tag tag-green">多數直通淺草線</span>
          </div>

          <div className="sub-label">推薦路線</div>
          <ul className="bullet-list">
            <li>
              推薦搭乘 <strong>京急機場線</strong>，接都營淺草線方向前往藏前。
            </li>
            <li>多數列車可直通淺草線，路線相對簡單。</li>
            <li>
              如果 Google Maps 顯示需要換車，通常會在 <strong>東日本橋</strong> 或沿線車站換乘，
              請以當天 App 顯示的月台與班次為準。
            </li>
          </ul>

          <div className="sub-label">小提醒</div>
          <ul className="bullet-list">
            <li>羽田比成田離市區近，通常行李多或抵達時間晚時會更輕鬆。</li>
            <li>藏前站下車後，建議優先找有電梯的出口，拖行李比較省力。</li>
          </ul>

          <a
            href={googleMapsTransitUrl('Haneda Airport')}
            target="_blank"
            rel="noreferrer"
            className="map-btn"
          >
            📍 用 Google Maps 查看羽田路線
          </a>
        </section>
      </div>
    </div>
  );
}
