export const MAP_PLACE_CATEGORIES = {
  gas: { prefixes: ['0101'], label: '加油站', color: 'foregroundMuted' },
  cafe: { prefixes: ['0505'], label: '咖啡', color: 'primary' },
  food: { prefixes: ['05'], label: '餐饮', color: 'error' },
  store: { prefixes: ['0602'], label: '便利店', color: 'primary' },
  shop: { prefixes: ['06'], label: '商超', color: 'info' },
  pharmacy: { prefixes: ['0906'], label: '药店', color: 'success' },
  hotel: { prefixes: ['10'], label: '酒店', color: 'success' },
  bank: { prefixes: ['16'], label: '银行', color: 'info' },
} as const;
export const MAP_SELECTION_SOURCE_LABELS = {
  map: '地图选点',
  search: 'POI选点',
  original: '原选位置',
  location: '默认选点',
  poi: 'POI选点',
} as const;
