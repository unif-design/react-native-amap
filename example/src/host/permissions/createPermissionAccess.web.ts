import {
  createLogger,
  createOperationContext,
} from '@unif/react-native-logger';
import { createAppError } from '../errors';
import { PERMISSION_LABELS, PERMISSION_ERROR_CODES } from './constants';
import { preparePermissionReadIds } from './preparePermissionReadIds';
import type { PermissionAccess } from './types';

export function createPermissionAccess(): PermissionAccess {
  const logger = createLogger('permissions');
  return {
    async read(ids) {
      return preparePermissionReadIds(ids).map((id) => ({
        id,
        label: PERMISSION_LABELS[id],
        status: 'unavailable',
        detail: 'Web 预览不支持原生系统权限',
      }));
    },
    async request(id) {
      logger.warn('permissions.operation.unsupported', {
        context: createOperationContext('system'),
        phase: 'request',
        outcome: 'unsupported',
        code: PERMISSION_ERROR_CODES.unsupported,
        fields: { permissionId: id, operation: 'request' },
      });
      throw createAppError(
        PERMISSION_ERROR_CODES.unsupported,
        'Web 预览不支持原生系统权限申请',
      );
    },
    async openSettings() {
      logger.warn('permissions.operation.unsupported', {
        context: createOperationContext('system'),
        phase: 'openSettings',
        outcome: 'unsupported',
        code: PERMISSION_ERROR_CODES.unsupported,
        fields: { operation: 'openSettings' },
      });
      throw createAppError(
        PERMISSION_ERROR_CODES.unsupported,
        'Web 预览无法打开原生系统设置',
      );
    },
  };
}
