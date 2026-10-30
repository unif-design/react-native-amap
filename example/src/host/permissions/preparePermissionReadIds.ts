import { createAppError } from '../errors';
import { PERMISSION_ERROR_CODES, PERMISSION_IDS } from './constants';
import type { PermissionId } from './types';

export function preparePermissionReadIds(
  ids: readonly PermissionId[] | undefined,
): readonly PermissionId[] {
  if (ids === undefined) return [...PERMISSION_IDS];

  try {
    if (!Array.isArray(ids)) throw new TypeError('invalid collection');
    const result: PermissionId[] = [];
    const seen = new Set<PermissionId>();
    for (const id of ids) {
      if (!PERMISSION_IDS.includes(id)) throw new TypeError('invalid id');
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  } catch (cause) {
    throw createAppError(
      PERMISSION_ERROR_CODES.invalidInput,
      '权限读取范围无效，请检查后重试。',
      cause,
    );
  }
}
