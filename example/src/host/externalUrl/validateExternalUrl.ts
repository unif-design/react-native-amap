import { Platform } from 'react-native';
import { URL } from 'react-native-url-polyfill';
import { createAppError } from '../errors';
import {
  EXTERNAL_URL_AUTHORITY,
  EXTERNAL_URL_INVALID_CHARACTERS,
  EXTERNAL_URL_CODES,
  EXTERNAL_URL_MESSAGES,
  WEB_PROTOCOLS,
  URL_CONTROL_END,
  URL_DELETE_CHARACTER,
} from './constants';

export function validateExternalUrl(value: string): void {
  let url: URL;
  try {
    if (
      typeof value !== 'string' ||
      !EXTERNAL_URL_AUTHORITY.test(value) ||
      EXTERNAL_URL_INVALID_CHARACTERS.test(value) ||
      Array.from(value).some((character) => {
        const code = character.charCodeAt(0);
        return code <= URL_CONTROL_END || code === URL_DELETE_CHARACTER;
      })
    ) {
      throw new Error(EXTERNAL_URL_MESSAGES.invalid);
    }
    url = new URL(value);
    if (!url.hostname) throw new Error(EXTERNAL_URL_MESSAGES.invalid);
  } catch {
    // 不把可能含凭证、文件地址或业务参数的原 URL 放入错误。
    throw createAppError(
      EXTERNAL_URL_CODES.invalid,
      EXTERNAL_URL_MESSAGES.invalid,
    );
  }
  if (
    (Platform.OS !== 'ios' &&
      Platform.OS !== 'android' &&
      Platform.OS !== 'web') ||
    (Platform.OS === 'web' && !WEB_PROTOCOLS.includes(url.protocol))
  ) {
    throw createAppError(
      EXTERNAL_URL_CODES.unsupported,
      EXTERNAL_URL_MESSAGES.unsupported,
    );
  }
}
