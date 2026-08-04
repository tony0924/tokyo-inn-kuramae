export const HOME: [number, number] = [35.7073, 139.7876];
export const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTR =
  '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

export interface Place {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  url: string;
  category?: PlaceCategory;
  note?: string;
  rating?: number;
  source?: 'default' | 'admin';
}

export type MapKey = 'services' | 'restaurant' | 'cityguide';
export type PlaceCategory = 'convenience' | 'supermarket' | 'restaurant' | 'cafe' | 'sight';

export const mapPlaces: Record<MapKey, Place[]> = {
  services: [
    { name: 'LAWSON',          lat: 35.7070, lng: 139.7897, color: '#4a9eff', url: 'https://maps.app.goo.gl/1qyxZVsHN8fjJJJb8', category: 'convenience', note: '適合快速補充早餐、飲料、宵夜與旅行日用品，也能找現磨咖啡及熟食。臨時需要提款、影印或寄送服務時很方便。', rating: 2, source: 'default' },
    { name: '7-Eleven',        lat: 35.7067, lng: 139.7905, color: '#4a9eff', url: 'https://maps.app.goo.gl/rkChJxLzP3TXZwS37', category: 'convenience', note: '距離住宿不遠，適合買早餐、飯糰、便當、飲料與日用品；也有 ATM 和多功能事務機，旅途中臨時補給很方便。', rating: 2, source: 'default' },
    { name: '全家 FamilyMart',  lat: 35.7079, lng: 139.7881, color: '#4a9eff', url: 'https://maps.app.goo.gl/CRD1vhzZ4pLTK4Ae6', category: 'convenience', note: '適合回住宿前順路補充飲料、甜點、早餐或宵夜。24 小時營業，需要 ATM、影印或簡單旅行用品時也很實用。', rating: 1, source: 'default' },
    { name: 'Life スーパー',    lat: 35.7084, lng: 139.7858, color: '#56d4b0', url: 'https://maps.app.goo.gl/hMA7DQ3HvzoVufwk7', category: 'supermarket', note: '品項較完整的大型超市，生鮮、熟食、便當、飲料與生活用品都容易一次買齊。適合住多天、想準備早餐或簡單料理的旅客。', rating: 3, source: 'default' },
    { name: '24H 生鮮超市',     lat: 35.7062, lng: 139.7913, color: '#56d4b0', url: 'https://maps.app.goo.gl/3yYTJEdMT1aM7gFAA', category: 'supermarket', note: '24 小時營業的 Super Yamazaki 三筋店，任何時間都能購買生鮮、熟食、飲料與日用品，麵包品項也很齊全，價格屬中等。', rating: 2, source: 'default' },
  ],
  restaurant: [
    { name: '淺草炸肉餅',              lat: 35.7131, lng: 139.7964, color: '#e88ba0', url: 'https://maps.app.goo.gl/HZgQinzc4uosJ811A', category: 'restaurant', note: '淺草散步時很適合順手品嚐的現炸小吃，以豬肉混合和牛，外皮酥脆、內餡多汁帶甜味。熱門時段可能排隊，售完會提早結束。', rating: 1, source: 'default' },
    { name: 'Tonkatsu Yutaka',         lat: 35.7101, lng: 139.7952, color: '#e88ba0', url: 'https://maps.app.goo.gl/x4rxxq62xu4hp8pE7', category: 'restaurant', note: '1945 年創業的淺草老字號，使用大和豬、自製麵包粉與棉籽油，炸衣輕盈不油膩。適合想在安靜日式空間慢慢吃頓飯；週三、週四公休。', rating: 2, source: 'default' },
    { name: '融化漢堡排福吉',           lat: 35.7078, lng: 139.7933, color: '#e88ba0', url: 'https://maps.app.goo.gl/WZkreq6NqbJp1h5S8', category: 'restaurant', note: '招牌是國產牛與黑毛和牛製成的柔嫩漢堡排，自己在鐵板上切開加熱，最後可用肉汁拌蒜香飯。份量扎實，適合想吃豐盛午餐或晚餐。', rating: 2, source: 'default' },
    { name: '拉麵 改',                 lat: 35.7076, lng: 139.7920, color: '#e88ba0', url: 'https://maps.app.goo.gl/DrsdxorzpLxPoap56', category: 'restaurant', note: '以貝類高湯的鹽味拉麵聞名，湯頭鮮味明確卻不厚重，搭配有口感的捲曲粗麵。人氣時段常排隊，建議避開正中午與晚餐尖峰。', rating: 1, source: 'default' },
    { name: '拉麵元樂 總本店',          lat: 35.7065, lng: 139.7910, color: '#e88ba0', url: 'https://maps.app.goo.gl/eSCs8YCrwFfX1qLA9', category: 'restaurant', note: '1995 年創業的藏前拉麵店，特色是背脂豚骨醬油湯與厚實叉燒，香氣濃郁、份量有滿足感。推薦給喜歡重口味或想體驗東京老派拉麵的人。', rating: 1, source: 'default' },
    { name: '麺 みつヰ',               lat: 35.7071, lng: 139.7896, color: '#e88ba0', url: 'https://maps.app.goo.gl/77MX6NtLyx6AYXKk9', category: 'restaurant', note: '主打自家製麵與不使用化學調味料的清爽湯頭，醬油、鹽味都能感受麵香與細緻高湯。座位不多且常排隊，時間充裕時再前往較合適。', rating: 1, source: 'default' },
    { name: 'HATCOFFEE',               lat: 35.7057, lng: 139.7882, color: '#b08fe8', url: 'https://maps.app.goo.gl/9a37J2WRaW7TPrDx8', category: 'cafe', note: '以客製化 2D、3D 拉花聞名，可把寵物、人物或喜歡的圖案做進飲品，是很有記憶點的咖啡體驗。製作需要時間，行程不要排得太趕。', rating: 2, source: 'default' },
    { name: 'KURAMAE CANNELE',         lat: 35.7055, lng: 139.7876, color: '#b08fe8', url: 'https://maps.app.goo.gl/NREE8yXrPA25R9F58', category: 'cafe', note: '店內工房每天現烤可麗露，外層酥脆、內裡像卡士達般柔滑。可在一樓外帶，也能到樓上搭配紅茶與甜點盤，推薦趁出爐時品嚐。', rating: 1, source: 'default' },
    { name: 'Confectionery Lemon Pie', lat: 35.7062, lng: 139.7868, color: '#b08fe8', url: 'https://maps.app.goo.gl/TYu9BfZPq8gGEywo9', category: 'cafe', note: '田原町的小型老派洋菓子店，招牌檸檬派每天只製作當日份，酸甜清爽、口感輕盈。以外帶為主，熱門品項可能售完，建議早一點前往。', rating: 2, source: 'default' },
    { name: 'Shinonome Seipansho',     lat: 35.7048, lng: 139.7871, color: '#b08fe8', url: 'https://maps.app.goo.gl/qbCnfMA6DrvJQZ9C8', category: 'cafe', note: '藏前巷弄裡的人氣麵包店，風格樸實、適合日常品嚐，甜鹹麵包都很適合帶回住宿當早餐。店面不大，熱門品項下午可能提早售完。', rating: 1, source: 'default' },
    { name: '淺草花月堂',               lat: 35.7125, lng: 139.7966, color: '#b08fe8', url: 'https://maps.app.goo.gl/qVjSRJ1GNGNU5CpG8', category: 'cafe', note: '淺草名物「巨無霸菠蘿麵包」使用長時間低溫發酵，外層香甜酥脆、裡面非常蓬鬆。適合逛淺草時分食，熱門時段需排隊。', rating: 1, source: 'default' },
    { name: 'Dandelion Chocolate',     lat: 35.7060, lng: 139.7879, color: '#b08fe8', url: 'https://maps.app.goo.gl/6W2HiebuinWijLPE9', category: 'cafe', note: '日本第一間 Dandelion Chocolate，能近距離看到 Bean to Bar 製作並品嚐巧克力飲與甜點。適合喜歡可可風味、想悠閒休息的旅客。', rating: 2, source: 'default' },
  ],
  cityguide: [
    { name: '淺草寺 雷門',    lat: 35.7147, lng: 139.7966, color: '#ff7b7b', url: 'https://maps.app.goo.gl/fyTC7p2m1Y5xuSiJ8', category: 'sight', note: '第一次到東京很值得從雷門、仲見世一路走到淺草寺；若已來過，推薦晚上再訪，人潮較少、燈光也漂亮。雷門對面的觀光中心頂樓可免費看夜景。', rating: 2, source: 'default' },
    { name: '合羽橋道具街',   lat: 35.7166, lng: 139.7927, color: '#ff7b7b', url: 'https://maps.app.goo.gl/m6hZEB2JAdfLJAPt6', category: 'sight', note: '集中了餐具、刀具、烘焙用品與食品模型店，喜歡料理或尋找特別伴手禮的人可以逛很久。多數店家傍晚較早關門，週日營業店較少。', rating: 1, source: 'default' },
    { name: '東京國立博物館', lat: 35.7188, lng: 139.7766, color: '#ff7b7b', url: 'https://maps.app.goo.gl/WJAeSJR8MFNKQx9g8', category: 'sight', note: '想系統認識日本藝術與歷史，推薦從本館「日本美術的流動」開始，能一路看到繩文至江戶時代。館區很大，建議至少預留半天。', rating: 1, source: 'default' },
    { name: '上野之森美術館', lat: 35.7135, lng: 139.7744, color: '#ff7b7b', url: 'https://maps.app.goo.gl/K7pb2C99ocwrM4uEA', category: 'sight', note: '位於上野公園內，以期間限定展覽為主，從現代藝術到漫畫主題都有可能。沒有固定常設展，出發前先查看當期展覽是否符合興趣。', rating: 2, source: 'default' },
  ],
};
