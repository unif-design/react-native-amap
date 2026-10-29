export const EXTERNAL_URL_CODES = {
  invalid: 'system.invalid_url',
  checkFailed: 'system.url_check_failed',
  openFailed: 'system.url_open_failed',
  unsupported: 'system.unsupported',
} as const;
export const EXTERNAL_URL_MESSAGES = {
  invalid: '外部链接地址无效',
  checkFailed: '无法查询此链接的打开能力',
  openFailed: '打开外部链接失败',
  unsupported: '当前环境不支持打开此类外部链接',
} as const;
export const EXTERNAL_URL_AUTHORITY = /^[a-z][a-z\d+.-]*:\/\/[^/?#\s]+/i;
export const EXTERNAL_URL_INVALID_CHARACTERS = /[\s\\]/;
export const URL_CONTROL_END = 31;
export const URL_DELETE_CHARACTER = 127;
export const WEB_PROTOCOLS: readonly string[] = ['http:', 'https:'];
