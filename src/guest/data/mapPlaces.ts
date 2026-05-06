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
    { name: 'LAWSON',          lat: 35.7070, lng: 139.7897, color: '#4a9eff', url: 'https://maps.app.goo.gl/1qyxZVsHN8fjJJJb8', category: 'convenience', rating: 2, source: 'default' },
    { name: '7-Eleven',        lat: 35.7067, lng: 139.7905, color: '#4a9eff', url: 'https://maps.app.goo.gl/rkChJxLzP3TXZwS37', category: 'convenience', rating: 2, source: 'default' },
    { name: '全家 FamilyMart',  lat: 35.7079, lng: 139.7881, color: '#4a9eff', url: 'https://maps.app.goo.gl/CRD1vhzZ4pLTK4Ae6', category: 'convenience', rating: 1, source: 'default' },
    { name: 'Life スーパー',    lat: 35.7084, lng: 139.7858, color: '#56d4b0', url: 'https://maps.app.goo.gl/hMA7DQ3HvzoVufwk7', category: 'supermarket', rating: 3, source: 'default' },
    { name: '24H 生鮮超市',     lat: 35.7062, lng: 139.7913, color: '#56d4b0', url: 'https://maps.app.goo.gl/3yYTJEdMT1aM7gFAA', category: 'supermarket', rating: 2, source: 'default' },
  ],
  restaurant: [
    { name: '淺草炸肉餅',              lat: 35.7131, lng: 139.7964, color: '#e88ba0', url: 'https://maps.app.goo.gl/HZgQinzc4uosJ811A', category: 'restaurant', rating: 1, source: 'default' },
    { name: 'Tonkatsu Yutaka',         lat: 35.7101, lng: 139.7952, color: '#e88ba0', url: 'https://maps.app.goo.gl/x4rxxq62xu4hp8pE7', category: 'restaurant', rating: 2, source: 'default' },
    { name: '融化漢堡排福吉',           lat: 35.7078, lng: 139.7933, color: '#e88ba0', url: 'https://maps.app.goo.gl/WZkreq6NqbJp1h5S8', category: 'restaurant', rating: 2, source: 'default' },
    { name: '拉麵 改',                 lat: 35.7076, lng: 139.7920, color: '#e88ba0', url: 'https://maps.app.goo.gl/DrsdxorzpLxPoap56', category: 'restaurant', rating: 1, source: 'default' },
    { name: '拉麵元樂 總本店',          lat: 35.7065, lng: 139.7910, color: '#e88ba0', url: 'https://maps.app.goo.gl/eSCs8YCrwFfX1qLA9', category: 'restaurant', rating: 1, source: 'default' },
    { name: '麺 みつヰ',               lat: 35.7071, lng: 139.7896, color: '#e88ba0', url: 'https://maps.app.goo.gl/77MX6NtLyx6AYXKk9', category: 'restaurant', rating: 1, source: 'default' },
    { name: 'HATCOFFEE',               lat: 35.7057, lng: 139.7882, color: '#b08fe8', url: 'https://maps.app.goo.gl/9a37J2WRaW7TPrDx8', category: 'cafe', rating: 2, source: 'default' },
    { name: 'KURAMAE CANNELE',         lat: 35.7055, lng: 139.7876, color: '#b08fe8', url: 'https://maps.app.goo.gl/NREE8yXrPA25R9F58', category: 'cafe', rating: 1, source: 'default' },
    { name: 'Confectionery Lemon Pie', lat: 35.7062, lng: 139.7868, color: '#b08fe8', url: 'https://maps.app.goo.gl/TYu9BfZPq8gGEywo9', category: 'cafe', rating: 2, source: 'default' },
    { name: 'Shinonome Seipansho',     lat: 35.7048, lng: 139.7871, color: '#b08fe8', url: 'https://maps.app.goo.gl/qbCnfMA6DrvJQZ9C8', category: 'cafe', rating: 1, source: 'default' },
    { name: '淺草花月堂',               lat: 35.7125, lng: 139.7966, color: '#b08fe8', url: 'https://maps.app.goo.gl/qVjSRJ1GNGNU5CpG8', category: 'cafe', rating: 1, source: 'default' },
    { name: 'Dandelion Chocolate',     lat: 35.7060, lng: 139.7879, color: '#b08fe8', url: 'https://maps.app.goo.gl/6W2HiebuinWijLPE9', category: 'cafe', rating: 2, source: 'default' },
  ],
  cityguide: [
    { name: '淺草寺 雷門',    lat: 35.7147, lng: 139.7966, color: '#ff7b7b', url: 'https://maps.app.goo.gl/fyTC7p2m1Y5xuSiJ8', category: 'sight', rating: 2, source: 'default' },
    { name: '合羽橋道具街',   lat: 35.7166, lng: 139.7927, color: '#ff7b7b', url: 'https://maps.app.goo.gl/m6hZEB2JAdfLJAPt6', category: 'sight', rating: 1, source: 'default' },
    { name: '東京國立博物館', lat: 35.7188, lng: 139.7766, color: '#ff7b7b', url: 'https://maps.app.goo.gl/WJAeSJR8MFNKQx9g8', category: 'sight', rating: 1, source: 'default' },
    { name: '上野之森美術館', lat: 35.7135, lng: 139.7744, color: '#ff7b7b', url: 'https://maps.app.goo.gl/K7pb2C99ocwrM4uEA', category: 'sight', rating: 2, source: 'default' },
  ],
};
