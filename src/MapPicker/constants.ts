export const MAP_PICKER_INITIAL_ZOOM = 16;
export const MAP_PICKER_UNSELECTED_TITLE = '选择位置';
export const MAP_PICKER_MESSAGES = {
  invalidInput: '选点参数无效，请检查后重试',
  inactive: '本次选点已结束',
  unavailable: '地图暂时不可用，请稍后重试',
  query: '地点查询失败，请重试',
  location: '获取位置失败，请重试',
  locationPermission: '定位权限已拒绝，请到系统设置开启',
  locationSettings: '无法打开系统设置，请稍后重试',
  operation: '操作失败，请重试',
  selection: '请选择有效位置',
  confirmation: '位置确认失败，请重试',
} as const;

export const MAP_PICKER_COLOR_MIN = -2147483648;
export const MAP_PICKER_COLOR_MAX = 4294967295;

export const MAP_PICKER_MAP_FRACTION = 0.55;
export const MAP_PICKER_SEARCH_MAP_FRACTION = 0.35;
export const MAP_PICKER_SPLIT_DURATION = 280;
export const MAP_PICKER_MIN_ZOOM = 3;
export const MAP_PICKER_MAX_ZOOM = 20;
