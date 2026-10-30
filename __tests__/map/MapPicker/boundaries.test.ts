import type { NativeSyntheticEvent } from 'react-native';
import { toast } from '@unif/react-native-design';
import { getCurrentLocation } from '@amap/location';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import type { MapPickerSession } from '@amap/MapPicker/types';
import type { GetCurrentLocationResult } from '@amap/location';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

function nativeEvent<T>(value: T): NativeSyntheticEvent<T> {
  return { nativeEvent: value } as NativeSyntheticEvent<T>;
}

const mockOpenSettings = jest.fn();
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
jest.mock('@amap/host/permissions', () => ({
  getPermissionAccess: () => ({
    openSettings: (...args: unknown[]) => mockOpenSettings(...args),
  }),
}));
jest.mock('@unif/react-native-design', () => ({
  ...jest.requireActual('@unif/react-native-design'),
  toast: jest.fn(),
}));

test.each(['setCenter', 'moveCamera', 'setZoom', 'getCameraPosition'] as const)(
  '原生地图未就绪的 %s 返回不可用，不虚构成功',
  async (operation) => {
    const session = createMapPickerSession({}, jest.fn());
    session.activate();
    const controls = session.controls;
    const result =
      operation === 'setCenter'
        ? controls.setCenter(origin)
        : operation === 'moveCamera'
          ? controls.moveCamera({ target: origin })
          : operation === 'setZoom'
            ? controls.setZoom(10)
            : controls.getCameraPosition();
    await expect(result).rejects.toThrow('地图暂时不可用，请稍后重试');
    expect(session.store.getState().localError).toBeNull();
    session.cancel();
  },
);

test.each(['moveCamera', 'setZoom'] as const)(
  '已结束会话的 %s 不调用原生句柄',
  async (operation) => {
    const { session, map } = open();
    session.cancel();
    const state = session.store.getState();
    await expect(
      operation === 'moveCamera'
        ? session.controls.moveCamera({ target: origin })
        : session.controls.setZoom(10),
    ).rejects.toThrow();
    session.controls.restoreCandidates();
    expect(map[operation]).not.toHaveBeenCalled();
    expect(session.store.getState()).toBe(state);
  },
);

test.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
  '不合法相机时长 %s 被拒绝，原生相机不移动',
  async (duration) => {
    const { session, map } = open();
    await expect(
      session.controls.moveCamera({ target: origin }, duration),
    ).rejects.toThrow();
    expect(map.moveCamera).not.toHaveBeenCalled();
    session.cancel();
  },
);

test.each([Number.NaN, Number.POSITIVE_INFINITY])(
  '非有限 zoom %s 不传给原生 SDK',
  async (zoom) => {
    const { session, map } = open();
    await expect(session.controls.setZoom(zoom)).rejects.toThrow();
    expect(map.setZoom).not.toHaveBeenCalled();
    session.cancel();
  },
);

test('原相机回调同步结束并抛异常时，不将错误投递到已结束会话', () => {
  const onMove = jest.fn(() => {
    session.cancel();
    throw new Error('consumer closed');
  });
  const onMapPress = jest.fn();
  const { session, onResult } = open({ onCameraMove: onMove, onMapPress });
  const event = nativeEvent({
    cameraPosition: { target: origin },
    latLngBounds: { southwest: origin, northeast: other },
  });
  session.events.onCameraMove!(event);
  expect(onMove).toHaveBeenCalledWith(event);
  const state = session.store.getState();
  session.events.onCameraMove!(event);
  session.events.onMapPress!(nativeEvent(origin));
  session.events.onUserDragStart!(nativeEvent(origin));
  session.events.onUserDragEnd!(nativeEvent(origin));
  expect(onMove).toHaveBeenCalledTimes(1);
  expect(onMapPress).not.toHaveBeenCalled();
  expect(session.store.getState()).toBe(state);
  expect(state.localError).toBeNull();
  expect(onResult).toHaveBeenCalledTimes(1);
});

test('未提供拖动处理时不改查询或选点；损坏的原生坐标只显示安全提示', () => {
  const simple = open();
  simple.session.events.onUserDragEnd!(nativeEvent(origin));
  simple.session.events.onUserDragStart!(nativeEvent(origin));
  simple.session.events.onUserDragEnd!(nativeEvent(origin));
  expect(simple.session.store.getState().selection).toBeNull();
  simple.session.cancel();
  const onEnd = jest.fn();
  const { session } = open({ onUserDragEnd: onEnd });
  session.events.onUserDragStart!(nativeEvent(origin));
  session.events.onUserDragEnd!(
    nativeEvent({ latitude: Number.NaN, longitude: 0 }),
  );
  expect(onEnd).not.toHaveBeenCalled();
  expect(session.store.getState().localError).toBe('操作失败，请重试');
  session.cancel();
});

test('初始定位坐标系原样传入原生，effect 重放不再次采用或通知同一位置', async () => {
  const position = { ...origin, coordinateSystem: 'GCJ02' as const };
  jest
    .mocked(getCurrentLocation)
    .mockResolvedValue({ status: 'success', location: position });
  const observed = jest.fn();
  const { session, map } = open({
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: observed,
  });
  await flush();
  session.deactivate();
  session.activate();
  await flush();
  expect(map.setCenter).toHaveBeenCalledTimes(1);
  expect(map.setCenter).toHaveBeenCalledWith(position);
  expect(observed).toHaveBeenCalledTimes(1);
  expect(session.store.getState().selection).toEqual({ coordinates: position });
  session.cancel();
});

test.each(['sync', 'async'] as const)(
  '重新定位已接管时，初始定位 %s 异常不覆盖新操作结果',
  async (mode) => {
    const pending = deferred<GetCurrentLocationResult>();
    let session!: MapPickerSession;
    jest.mocked(getCurrentLocation).mockImplementation(() => {
      if (mode === 'sync') {
        session.requestRelocate();
        throw new Error('initial failed');
      }
      return pending.promise;
    });
    session = createMapPickerSession(
      {
        initialLocationRequest: { includeAddress: false },
        onRequestRelocate: (controls) => {
          controls.setSelection({ coordinates: other });
        },
      },
      jest.fn(),
    );
    session.activate();
    if (mode === 'async') {
      await session.requestRelocate();
      pending.reject(new Error('initial failed'));
    }
    await flush();
    expect(session.store.getState()).toMatchObject({
      selection: { coordinates: other },
      localError: null,
      initialLocationPending: false,
      relocateBusy: false,
    });
    session.cancel();
  },
);

test('定位权限拒绝可打开设置，忙碌或结束后不重复打开也不恢复旧状态', async () => {
  const pending = deferred<void>();
  mockOpenSettings.mockReturnValue(pending.promise);
  const { session } = open({
    onRequestRelocate: async () => {
      throw Object.assign(new Error('permission denied'), {
        reason: 'permission_denied',
      });
    },
  });
  await session.openLocationSettings();
  expect(mockOpenSettings).not.toHaveBeenCalled();
  await session.requestRelocate();
  expect(session.store.getState()).toMatchObject({
    locationPermissionDenied: true,
    localError: '定位权限已拒绝，请到系统设置开启',
  });
  const settings = session.openLocationSettings();
  await session.openLocationSettings();
  expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  session.cancel();
  const ended = session.store.getState();
  pending.resolve();
  await settings;
  await session.openLocationSettings();
  expect(session.store.getState()).toBe(ended);
  expect(mockOpenSettings).toHaveBeenCalledTimes(1);
});

test.each(['publishing', 'options'] as const)(
  '确认在 %s 阶段结束会话，不发成功结果或挂载确认框',
  async (stage) => {
    const options = jest.fn(() => {
      session.cancel();
      return { title: '确认' };
    });
    const { session, onResult } = open({
      initialSelection: { coordinates: origin },
      ...(stage === 'options' ? { getConfirmationOptions: options } : {}),
    });
    const unsubscribe = session.store.subscribe((state) => {
      if (stage === 'publishing' && state.completing) session.cancel();
    });
    await session.complete();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(session.store.getState()).toMatchObject({
      confirmation: null,
      completing: false,
    });
    expect(toast).not.toHaveBeenCalled();
    unsubscribe();
  },
);

test.each([undefined, { canConfirm: false, message: 123 }])(
  '外部确认检查返回不合法内容 %j，使用安全提示并保留原选点',
  async (result) => {
    const { session, onResult } = open({
      initialSelection: { coordinates: origin },
      beforeConfirm: jest.fn().mockResolvedValue(result),
    });
    await session.complete();
    expect(toast).toHaveBeenCalledWith({
      position: 'top',
      message: '位置确认失败，请重试',
    });
    expect(onResult).not.toHaveBeenCalled();
    expect(session.store.getState().selection).toEqual({ coordinates: origin });
    session.cancel();
  },
);

test('已释放确认宿主的迟到失败不再弹出错误提示或完成旧选择', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const pending = deferred<boolean>();
  const completion = session.complete();
  session.bindConfirmation(
    session.store.getState().confirmation!,
    () => pending.promise,
    jest.fn(),
  );
  await flush();
  session.cancel();
  await completion;
  pending.reject(new Error('host disposed'));
  await flush();
  expect(toast).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledTimes(1);
});
