export function EmergencyTab() {
  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">🆘</div>
        <h2>緊急聯絡</h2>
      </div>

      <div className="callout warn" style={{ marginBottom: 20 }}>
        <span className="callout-icon">⚠️</span>
        <div>
          如遇緊急情況，請先撥打以下號碼。如語言不通，可先說「English
          please」或「中文」。
        </div>
      </div>

      <div className="section-label">緊急號碼</div>
      <div className="emergency-grid">
        <a href="tel:110" className="emg-card urgent">
          <div className="emg-icon">👮</div>
          <div className="emg-name">警察</div>
          <div className="emg-num">110</div>
        </a>
        <a href="tel:119" className="emg-card urgent">
          <div className="emg-icon">🚒</div>
          <div className="emg-name">消防／救護</div>
          <div className="emg-num">119</div>
        </a>
        <a href="tel:189" className="emg-card urgent">
          <div className="emg-icon">👶</div>
          <div className="emg-name">兒童保護</div>
          <div className="emg-num">189</div>
        </a>
      </div>

      <div className="section-label">公共事業</div>
      <div className="emergency-grid">
        <div className="emg-card">
          <div className="emg-icon">⚡</div>
          <div className="emg-name">電力</div>
          <div className="emg-sub">東京電力</div>
        </div>
        <div className="emg-card">
          <div className="emg-icon">🔥</div>
          <div className="emg-name">瓦斯</div>
          <div className="emg-sub">東京瓦斯</div>
        </div>
        <div className="emg-card">
          <div className="emg-icon">💧</div>
          <div className="emg-name">自來水</div>
          <div className="emg-sub">東京都水道局</div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 8 }}>
        <div className="card-header">
          <div className="card-icon">🏥</div>
          <div className="card-title">最近醫院</div>
        </div>
        <div className="callout info">
          <span className="callout-icon">💡</span>
          <div>
            如需就醫，請搜尋「台東区 病院」或向我們詢問最近的醫療機構。
            <br />
            <a
              href="https://maps.app.goo.gl/oK5pP3odKRNFN2oi7"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#4285f4' }}
            >
              → 從住宿附近搜尋醫院
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
