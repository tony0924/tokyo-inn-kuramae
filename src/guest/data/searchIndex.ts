export type GuestTabId =
  | 'home'
  | 'checkin'
  | 'arrival'
  | 'facilities'
  | 'items'
  | 'services'
  | 'restaurant'
  | 'cityguide'
  | 'emergency';

export interface SearchEntry {
  section: string;
  tab: GuestTabId;
  title: string;
  content: string;
}

export const searchIndex: SearchEntry[] = [
  { section: '首頁', tab: 'home', title: 'Wi-Fi 密碼', content: 'wifi chen204 12345678 網路 密碼 wireless' },
  { section: '首頁', tab: 'home', title: '住宿地址', content: '台東区 蔵前 4丁目23 Room 204 地址 address 房間號碼' },
  { section: '入退房', tab: 'checkin', title: 'Check-In 注意事項', content: '入住 冰箱 床單 禁菸 熱水機 checkin 入房' },
  { section: '入退房', tab: 'checkin', title: 'Check-Out 注意事項', content: '退房 遙控器 吸塵器 清潔 冰箱 垃圾 關燈 checkout' },
  { section: '抵達', tab: 'arrival', title: '附近車站', content: '大江戶線 淺草線 銀座線 藏前站 田原町站 電梯 車站 地鐵 捷運' },
  { section: '抵達', tab: 'arrival', title: '成田機場交通', content: '成田機場 sky access 淺草線 機場 交通 narita airport' },
  { section: '抵達', tab: 'arrival', title: '羽田機場交通', content: '羽田機場 京急 淺草線 機場 交通 haneda airport' },
  { section: '抵達', tab: 'arrival', title: '建築進入方式', content: '玻璃門 磁扣 鑰匙 感應 電梯 204室 門鎖 入口 building entrance' },
  { section: '抵達', tab: 'arrival', title: '垃圾分類', content: '垃圾 一般垃圾 廚餘 寶特瓶 塑膠 紙板 資源回收 trash garbage' },
  { section: '設施', tab: 'facilities', title: '門鎖使用', content: '門鎖 開門 鎖門 順時針 逆時針 open lock door' },
  { section: '設施', tab: 'facilities', title: '燈具遙控器', content: '燈 遙控器 全室燈光 一鍵 關燈 開燈 light remote' },
  { section: '設施', tab: 'facilities', title: '沙發床', content: '沙發床 展開 攤開 收起 折疊 sofa bed sleep' },
  { section: '設施', tab: 'facilities', title: 'IH 爐使用', content: 'IH爐 煮飯 電源 火爐 弱火 中火 強火 廚房 怎麼用 induction cooktop' },
  { section: '設施', tab: 'facilities', title: '抽油煙機', content: '抽油煙機 扣環 廚房 range hood 油煙' },
  { section: '設施', tab: 'facilities', title: '熱水機', content: '熱水機 熱水 浴缸 洗澡 開關 water heater 熱水器' },
  { section: '設施', tab: 'facilities', title: '浴室抽風機', content: '抽風 換氣 衣類乾燥 洗衣 晾衣 浴室 bathroom fan' },
  { section: '備品', tab: 'items', title: '廚房備品', content: '冰箱 IH爐 微波爐 碗盤 餐具 鍋具 熱水壺 洗碗精 廚房' },
  { section: '備品', tab: 'items', title: '臥室備品', content: '床 被子 枕頭 床單 衣架 衣櫃 冷氣 bedroom' },
  { section: '備品', tab: 'items', title: '衛浴備品', content: '洗髮精 沐浴乳 潤髮 卸妝 吹風機 洗手乳 牙刷 毛巾 洗衣機 衛生紙' },
  { section: '備品', tab: 'items', title: '客廳備品', content: '電視 沙發 茶几 餐桌 椅子 延長線 離子夾 剪刀' },
  { section: '超市', tab: 'services', title: 'LAWSON', content: 'LAWSON 便利商店 convenience store 超商' },
  { section: '超市', tab: 'services', title: '7-Eleven', content: '7-11 7eleven 便利商店 超商 convenience store' },
  { section: '超市', tab: 'services', title: '全家 FamilyMart', content: '全家 familymart 便利商店 超商' },
  { section: '超市', tab: 'services', title: 'Life 超市', content: 'life 超市 生鮮 grocery market 買菜 supermarket' },
  { section: '超市', tab: 'services', title: '24H 生鮮超市', content: '24小時 生鮮超市 超市 買菜 24H open' },
  { section: '景點推薦', tab: 'cityguide', title: '淺草寺 雷門', content: '淺草寺 雷門 景點 temple asakusa 免費 senso-ji' },
  { section: '景點推薦', tab: 'cityguide', title: '合羽橋道具街', content: '合羽橋 道具街 廚房用品 景點 kappabashi shopping' },
  { section: '景點推薦', tab: 'cityguide', title: '東京國立博物館', content: '博物館 上野 museum tokyo national' },
  { section: '景點推薦', tab: 'cityguide', title: '上野之森美術館', content: '上野 美術館 museum ueno art' },
  { section: '餐廳推薦', tab: 'restaurant', title: '淺草炸肉餅', content: '淺草炸肉餅 炸肉餅 menchi katsu 淺草 asakusa 餐廳' },
  { section: '餐廳推薦', tab: 'restaurant', title: 'Tonkatsu Yutaka', content: '豬排 tonkatsu 餐廳 restaurant' },
  { section: '餐廳推薦', tab: 'restaurant', title: '融化漢堡排福吉', content: '融化漢堡排 福吉 漢堡排 hamburger steak 淺草 餐廳' },
  { section: '餐廳推薦', tab: 'restaurant', title: '拉麵 改', content: '拉麵 改 ramen 麵 restaurant 餐廳' },
  { section: '餐廳推薦', tab: 'restaurant', title: '拉麵元樂 總本店', content: '拉麵元樂 ramen 麵 餐廳' },
  { section: '餐廳推薦', tab: 'restaurant', title: '麺 みつヰ', content: 'みつヰ 拉麵 ramen 麵 餐廳' },
  { section: '餐廳推薦', tab: 'restaurant', title: 'HATCOFFEE', content: 'hatcoffee 咖啡 cafe coffee 蔵前 kuramae' },
  { section: '餐廳推薦', tab: 'restaurant', title: 'KURAMAE CANNELE', content: 'kuramae cannele canelé 咖啡 甜點 dessert 蔵前' },
  { section: '餐廳推薦', tab: 'restaurant', title: 'Dandelion Chocolate', content: '蒲公英 dandelion chocolate 巧克力 甜點 cafe' },
  { section: '緊急聯絡', tab: 'emergency', title: '警察 110', content: '警察 110 police emergency 緊急 報警' },
  { section: '緊急聯絡', tab: 'emergency', title: '消防／救護 119', content: '消防 119 救護車 ambulance fire 緊急' },
  { section: '緊急聯絡', tab: 'emergency', title: '最近醫院', content: '醫院 hospital 就醫 看病 台東区 診所' },
];
