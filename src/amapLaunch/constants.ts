export const AMAP_CODES = {
  invalidInput: 'amap_launch.invalid_input',
  unsupported: 'amap_launch.unsupported',
} as const;
export const AMAP_MESSAGES = {
  invalidInput: '高德唤起参数无效',
  unsupported: '当前平台不支持此高德操作',
} as const;
export const AMAP_URIS = {
  ios: {
    home: 'iosamap://rootmap',
    current_location: 'iosamap://myLocation',
    marker: 'iosamap://viewMap',
    navigate: 'iosamap://navi',
    ride: 'amapuri://openFeature',
    route: 'iosamap://path',
  },
  android: {
    home: 'androidamap://rootmap',
    current_location: 'androidamap://myLocation',
    marker: 'androidamap://viewMap',
    navigate: 'androidamap://navi',
    ride: 'amapuri://openFeature',
    route: 'amapuri://route/plan/',
  },
} as const;
export const AMAP_VIA_SEPARATOR = '|';
export const AMAP_COORDINATE_SYSTEM = 'GCJ02';
export const AMAP_DEV = 0;
export const AMAP_RIDE_FEATURE = 'OnRideNavi';
export const AMAP_RIDE_TYPES: readonly string[] = ['bike', 'elebike'];
export const AMAP_MAX_ROUTE_MODE = 5;
export const AMAP_IOS_MAX_ROUTE_MODE = 3;
export const AMAP_MAX_LATITUDE = 90;
export const AMAP_MAX_LONGITUDE = 180;
