import type { PermissionId } from './types';

export const PERMISSION_LABELS: Record<PermissionId, string> = {
  camera: '相机',
  location: '定位',
  bluetooth: '蓝牙',
  notifications: '通知',
  microphone: '麦克风',
};

export const PERMISSION_IDS: readonly PermissionId[] = [
  'camera',
  'location',
  'bluetooth',
  'notifications',
  'microphone',
];

export const NOTIFICATION_OPTIONS = ['alert', 'badge', 'sound'] as const;
export const PERMISSION_ERROR_CODES = {
  invalidInput: 'permissions.invalid_input',
  unsupported: 'permissions.unsupported',
  readFailed: 'permissions.read_failed',
  requestFailed: 'permissions.request_failed',
  settingsFailed: 'permissions.open_settings_failed',
} as const;
