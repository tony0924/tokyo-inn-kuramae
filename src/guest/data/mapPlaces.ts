export const HOME: [number, number] = [35.7073, 139.7876];
export const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const TILE_ATTR =
  '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

export interface Place {
  name: string;
  lat: number;
  lng: number;
  color: string;
  url: string;
}

export type MapKey = 'services' | 'restaurant' | 'cityguide';

export const mapPlaces: Record<MapKey, Place[]> = {
  services: [
    { name: 'LAWSON',          lat: 35.7070, lng: 139.7897, color: '#4a9eff', url: 'https://maps.app.goo.gl/1qyxZVsHN8fjJJJb8' },
    { name: '7-Eleven',        lat: 35.7067, lng: 139.7905, color: '#4a9eff', url: 'https://maps.app.goo.gl/rkChJxLzP3TXZwS37' },
    { name: '全家 FamilyMart',  lat: 35.7079, lng: 139.7881, color: '#4a9eff', url: 'https://maps.app.goo.gl/CRD1vhzZ4pLTK4Ae6' },
    { name: 'Life スーパー',    lat: 35.7084, lng: 139.7858, color: '#56d4b0', url: 'https://maps.app.goo.gl/hMA7DQ3HvzoVufwk7' },
    { name: '24H 生鮮超市',     lat: 35.7062, lng: 139.7913, color: '#56d4b0', url: 'https://maps.app.goo.gl/3yYTJEdMT1aM7gFAA' },
  ],
  restaurant: [
    { name: '淺草炸肉餅',              lat: 35.7131, lng: 139.7964, color: '#e88ba0', url: 'https://maps.app.goo.gl/HZgQinzc4uosJ811A' },
    { name: 'Tonkatsu Yutaka',         lat: 35.7101, lng: 139.7952, color: '#e88ba0', url: 'https://maps.app.goo.gl/x4rxxq62xu4hp8pE7' },
    { name: '融化漢堡排福吉',           lat: 35.7078, lng: 139.7933, color: '#e88ba0', url: 'https://maps.app.goo.gl/WZkreq6NqbJp1h5S8' },
    { name: '拉麵 改',                 lat: 35.7076, lng: 139.7920, color: '#e88ba0', url: 'https://maps.app.goo.gl/DrsdxorzpLxPoap56' },
    { name: '拉麵元樂 總本店',          lat: 35.7065, lng: 139.7910, color: '#e88ba0', url: 'https://maps.app.goo.gl/eSCs8YCrwFfX1qLA9' },
    { name: '麺 みつヰ',               lat: 35.7071, lng: 139.7896, color: '#e88ba0', url: 'https://maps.app.goo.gl/77MX6NtLyx6AYXKk9' },
    { name: 'HATCOFFEE',               lat: 35.7057, lng: 139.7882, color: '#b08fe8', url: 'https://maps.app.goo.gl/9a37J2WRaW7TPrDx8' },
    { name: 'KURAMAE CANNELE',         lat: 35.7055, lng: 139.7876, color: '#b08fe8', url: 'https://maps.app.goo.gl/NREE8yXrPA25R9F58' },
    { name: 'Confectionery Lemon Pie', lat: 35.7062, lng: 139.7868, color: '#b08fe8', url: 'https://maps.app.goo.gl/TYu9BfZPq8gGEywo9' },
    { name: 'Shinonome Seipansho',     lat: 35.7048, lng: 139.7871, color: '#b08fe8', url: 'https://maps.app.goo.gl/qbCnfMA6DrvJQZ9C8' },
    { name: '淺草花月堂',               lat: 35.7125, lng: 139.7966, color: '#b08fe8', url: 'https://maps.app.goo.gl/qVjSRJ1GNGNU5CpG8' },
    { name: 'Dandelion Chocolate',     lat: 35.7060, lng: 139.7879, color: '#b08fe8', url: 'https://maps.app.goo.gl/6W2HiebuinWijLPE9' },
  ],
  cityguide: [
    { name: '淺草寺 雷門',    lat: 35.7147, lng: 139.7966, color: '#ff7b7b', url: 'https://maps.app.goo.gl/fyTC7p2m1Y5xuSiJ8' },
    { name: '合羽橋道具街',   lat: 35.7166, lng: 139.7927, color: '#ff7b7b', url: 'https://maps.app.goo.gl/m6hZEB2JAdfLJAPt6' },
    { name: '東京國立博物館', lat: 35.7188, lng: 139.7766, color: '#ff7b7b', url: 'https://maps.app.goo.gl/WJAeSJR8MFNKQx9g8' },
    { name: '上野之森美術館', lat: 35.7135, lng: 139.7744, color: '#ff7b7b', url: 'https://maps.app.goo.gl/K7pb2C99ocwrM4uEA' },
  ],
};
