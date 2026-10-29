export const MAX_INTERVAL_MS = 2147483647;
export const LOCATION_ERROR_MESSAGES = {
  invalid_input: '定位参数不正确',
  permission_denied: '未获得位置权限',
  unsupported: '当前环境不支持定位',
  unavailable: '暂时无法取得位置',
  invalid_coordinates: '定位结果不可用',
} as const;
export const ADDRESS_FIELDS = [
  'country',
  'province',
  'city',
  'district',
  'cityCode',
  'adCode',
  'street',
  'streetNumber',
  'poiName',
  'aoiName',
  'description',
  'buildingId',
] as const;

export const SDK_ERROR_TYPES = new Set([
  'SDK_NOT_INITIALIZED',
  'PRIVACY_NOT_AGREED',
  'INVALID_API_KEY',
  'PERMISSION_DENIED',
  'LOCATION_FAILED',
  'NATIVE_MODULE_UNAVAILABLE',
  'MAP_VIEW_NOT_INITIALIZED',
  'INVALID_PARAMETER',
  'NETWORK_ERROR',
]);
export const SAFE_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'GaodeMapError',
]);
