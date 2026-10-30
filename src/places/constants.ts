export const PLACE_QUERY_LIMITS = {
  page: 100,
  pageSize: 25,
  aroundRadiusMeters: 50000,
  reverseRadiusMeters: 3000,
} as const;
export const PLACE_QUERY_ERROR_MESSAGES = {
  invalid_input: '地点查询参数不正确',
  unsupported: '当前环境不支持地点查询',
  unavailable: '暂时无法查询地点',
} as const;
export const SAFE_ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'AbortError',
]);
