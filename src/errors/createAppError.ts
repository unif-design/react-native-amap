import type { CodedError } from './types';

export function createAppError(
  code: string,
  message: string,
  cause?: unknown,
): CodedError {
  return Object.assign(new Error(message), {
    code,
    ...(cause === undefined ? {} : { cause }),
  });
}

export function getErrorCode(error: unknown): string | undefined {
  try {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    )
      return error.code;
  } catch {
    /* 外部抛出对象的 getter 不应改变错误分类路径。 */
  }
  return undefined;
}
