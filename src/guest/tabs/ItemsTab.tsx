export function ItemsTab() {
  return (
    <div className="section active">
      <div className="page-header">
        <div className="page-header-icon">📦</div>
        <h2>備品清單</h2>
      </div>

      <div className="callout info" style={{ marginBottom: 16 }}>
        <span className="callout-icon">ℹ️</span>
        <div>如有消耗式物品使用完畢，請告知我們。</div>
      </div>

      <div className="items-grid">
        <ItemCard title="🛏️ 臥室" items={[
          '日式標準雙人床',
          '沙發床（等同雙人床）',
          '衣櫃',
          '枕頭 ×5',
          '厚雙人被 ×3',
          '薄單人被 ×2',
          '拋棄式床單',
          '衣架 ×35',
          '冷暖氣',
        ]} />

        <div className="item-card">
          <div className="item-card-title">🚪 玄關</div>
          <ul className="bullet-list">
            <li>拋棄式拖鞋</li>
            <li>透明大雨傘 ×2</li>
          </ul>
          <div style={{ height: 14 }}></div>
          <div className="item-card-title">🛋️ 客廳</div>
          <ul className="bullet-list">
            <li>移動式 43 吋電視</li>
            <li>餐桌＆椅子 ×4</li>
            <li>沙發</li>
            <li>翻轉茶几</li>
            <li>冷暖氣</li>
            <li>延長線</li>
            <li>無線離子夾</li>
            <li>剪刀、美工刀</li>
            <li>牙線、棉花棒</li>
          </ul>
        </div>

        <ItemCard title="🍽️ 廚房" items={[
          '冰箱＆製冰器',
          'IH 爐',
          'Brita 淨水器',
          '微波爐',
          '吸塵器',
          '碗盤、餐具、馬克杯',
          '鍋具組、菜刀、削皮器',
          '熱水壺',
          '油、鹽、白黑胡椒、醬油',
          '洗碗精、菜瓜布',
          '垃圾袋、食物保存袋',
          '一次性餐具',
        ]} />

        <ItemCard title="🚿 衛浴" items={[
          '洗衣機、洗衣精、洗衣袋',
          '洗髮精、沐浴乳（BOTANIST）',
          '潤髮乳（潘婷膠囊髮膜）',
          '卸妝油（IPSA）',
          '酵素洗顏',
          '吹風機（Panasonic）',
          '洗手乳',
          '拋棄式牙刷＆浴帽',
          '梳子',
          '拋棄式擦澡巾',
          '毛巾（用後請補充）',
          '捲筒衛生紙',
        ]} />
      </div>
    </div>
  );
}

function ItemCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="item-card">
      <div className="item-card-title">{title}</div>
      <ul className="bullet-list">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
