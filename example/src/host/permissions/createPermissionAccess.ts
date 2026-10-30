import { Platform } from 'react-native';
import {
  checkMultiple,
  checkNotifications,
  openSettings,
  PERMISSIONS,
  request,
  requestMultiple,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';
import type { Permission, PermissionStatus } from 'react-native-permissions';
import { NOTIFICATION_OPTIONS, PERMISSION_LABELS } from './constants';
import { preparePermissionReadIds } from './preparePermissionReadIds';
import type {
  PermissionAccess,
  PermissionId,
  PermissionObservation,
  PermissionState,
} from './types';

export function createPermissionAccess(): PermissionAccess {
  const android = Platform.OS === 'android';
  const ios = Platform.OS === 'ios';
  const version = Number(Platform.Version);
  const blocked = new Set<string>();
  // 同一实例顺序交接检查和申请，旧检查无法覆盖后续申请确证的结果。
  let queue: Promise<void> = Promise.resolve();

  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  function observe(
    key: string,
    result: PermissionStatus,
    requested = false,
  ): PermissionState {
    if (requested && result === RESULTS.BLOCKED) blocked.add(key);
    if (result === RESULTS.GRANTED || result === RESULTS.LIMITED)
      blocked.delete(key);
    if (android && result === RESULTS.DENIED && blocked.has(key))
      return 'blocked';
    return result === RESULTS.DENIED ? 'requestable' : result;
  }

  function nativePermission(
    id: Exclude<PermissionId, 'notifications'>,
  ): Permission {
    switch (id) {
      case 'camera':
        return ios ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
      case 'microphone':
        return ios
          ? PERMISSIONS.IOS.MICROPHONE
          : PERMISSIONS.ANDROID.RECORD_AUDIO;
      case 'location':
        return ios
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      case 'bluetooth':
        return ios
          ? PERMISSIONS.IOS.BLUETOOTH
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
    }
  }

  function nativePermissions(id: PermissionId): Permission[] {
    if ((!ios && !android) || id === 'notifications') return [];
    if (id === 'location') {
      if (ios)
        return [
          PERMISSIONS.IOS.LOCATION_ALWAYS,
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
      if (version >= 31)
        return [
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
          PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        ];
    }
    if (id === 'bluetooth' && android && version >= 31) {
      return [
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      ];
    }
    return [nativePermission(id)];
  }

  async function readStates(ids: readonly PermissionId[]) {
    const states = new Map<Permission | 'notifications', PermissionState>();
    const ordinary = [...new Set(ids.flatMap(nativePermissions))];
    const checks: Promise<void>[] = [];
    if (ordinary.length) {
      checks.push(
        checkMultiple(ordinary).then((results) => {
          for (const permission of ordinary)
            states.set(permission, observe(permission, results[permission]));
        }),
      );
    }
    if ((ios || android) && ids.includes('notifications')) {
      checks.push(
        checkNotifications().then(({ status }) => {
          // Android 12 及以下没有通知运行时申请，关闭后只能在系统设置开启。
          states.set(
            'notifications',
            android && version < 33 && status === RESULTS.DENIED
              ? 'blocked'
              : observe('notifications', status),
          );
        }),
      );
    }
    const results = await Promise.allSettled(checks);
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason;
    }
    return states;
  }

  function readEntry(
    id: PermissionId,
    states: Awaited<ReturnType<typeof readStates>>,
  ): PermissionObservation {
    if (!ios && !android) return { status: 'unavailable' };
    if (id === 'notifications') return { status: states.get('notifications')! };
    if (id === 'location' && ios) {
      if (states.get(PERMISSIONS.IOS.LOCATION_ALWAYS) === 'granted') {
        return { status: 'granted', detail: '始终允许' };
      }
      const status = states.get(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)!;
      return status === 'granted'
        ? { status, detail: '使用时允许' }
        : { status };
    }
    if (id === 'location' && android && version >= 31) {
      const status = states.get(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)!;
      if (status === 'granted') return { status, detail: '精确位置' };
      if (
        states.get(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION) === 'granted'
      ) {
        return { status: 'limited', detail: '大致位置' };
      }
      return { status };
    }
    if (id === 'bluetooth' && android && version >= 31) {
      const statuses = nativePermissions(id).map((permission) =>
        states.get(permission)!,
      );
      const status = (
        ['unavailable', 'blocked', 'requestable', 'limited', 'granted'] as const
      ).find((candidate) => statuses.includes(candidate))!;
      return { status };
    }
    const status = states.get(nativePermission(id))!;
    return id === 'bluetooth' && android
      ? { status, detail: '此系统版本的蓝牙扫描依赖定位权限' }
      : { status };
  }

  async function requestPermissions(permissions: Permission[]) {
    const results = await requestMultiple(permissions);
    for (const permission of permissions)
      observe(permission, results[permission], true);
  }

  return {
    read: (ids) => {
      let selectedIds: readonly PermissionId[];
      try {
        selectedIds = preparePermissionReadIds(ids);
      } catch (error) {
        return Promise.reject(error);
      }
      return run(async () => {
        const states = await readStates(selectedIds);
        return selectedIds.map((id) => ({
          id,
          label: PERMISSION_LABELS[id],
          ...readEntry(id, states),
        }));
      });
    },
    request: (id) =>
      run(async () => {
        const states = await readStates([id]);
        if (readEntry(id, states).status !== 'requestable') return;
        if (id === 'notifications') {
          const { status } = await requestNotifications([
            ...NOTIFICATION_OPTIONS,
          ]);
          observe('notifications', status, true);
        } else if (id === 'bluetooth' && android && version >= 31) {
          const missing = nativePermissions(id).filter(
            (permission) => states.get(permission) === 'requestable',
          );
          if (missing.length) await requestPermissions(missing);
        } else if (id === 'location' && android && version >= 31) {
          await requestPermissions([
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
            PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
          ]);
        } else {
          const permission = nativePermission(id);
          observe(permission, await request(permission), true);
        }
      }),
    openSettings: () => openSettings('application'),
  };
}
