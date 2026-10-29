import { getCurrentLocation } from '@amap/location';
import type { GetCurrentLocationResult } from '@amap/location';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));

test('没有预选时用实际初始定位坐标完成，地址仅用于展示，不采用候选第一项', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({
    status: 'success',
    location: {
      ...origin,
      coordinateSystem: 'GCJ02',
      address: { formattedAddress: '定位地址' },
    },
  });
  const changed = jest.fn();
  const { session, map, onResult } = open({
    initialLocationRequest: { includeAddress: true },
    initialCameraPosition: { target: other },
    initialQueryCenter: other,
    onSelectionChange: changed,
  });
  await session.controls.loadCandidates(async () => ({
    status: 'success',
    data: { items: [{ id: 'nearest', location: other }] },
  }));
  await flush();

  const selection = {
    coordinates: { latitude: 0, longitude: 0, coordinateSystem: 'GCJ02' },
  };
  expect(session.store.getState().selection).toEqual(selection);
  expect(session.store.getState().selectionPresentation).toEqual({
    address: '定位地址',
    source: 'location',
  });
  expect(session.store.getState().queryCenter).toEqual(other);
  expect(map.setCenter).not.toHaveBeenCalled();
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledWith(selection);
  await session.complete();
  expect(onResult).toHaveBeenCalledWith({ status: 'success', selection });
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
});

test('显式预选优先于实际初始定位', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({
    status: 'success',
    location: origin,
  });
  const selection = { coordinates: other, place: { id: 'chosen' } };
  const { session } = open({
    initialLocationRequest: { includeAddress: false },
    initialSelection: selection,
  });
  await flush();
  expect(session.store.getState().selection).toEqual(selection);
  expect(session.store.getState().selectionPresentation).toEqual({
    source: 'original',
  });
  session.cancel();
});

test('先交付实际初始定位观测，再发布默认待选项', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({
    status: 'success',
    location: origin,
  });
  const events: string[] = [];
  const { session } = open({
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: () => {
      events.push('observed');
    },
    onSelectionChange: () => {
      events.push('selected');
    },
  });
  await flush();
  expect(events).toEqual(['observed', 'selected']);
  session.cancel();
});

test.each(['改选', '清空', '关闭'])(
  '定位观测回调内%s优先于本次默认待选项',
  async (action) => {
    jest.mocked(getCurrentLocation).mockResolvedValue({
      status: 'success',
      location: origin,
    });
    const { session, onResult } = open({
      initialLocationRequest: { includeAddress: false },
      onInitialLocationResult(_result, controls) {
        if (action === '改选') controls.setSelection({ coordinates: other });
        else if (action === '清空') controls.setSelection(null);
        else session.cancel();
      },
    });
    await flush();
    expect(session.store.getState().selection).toEqual(
      action === '改选' ? { coordinates: other } : null,
    );
    if (action === '关闭')
      expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
    else session.cancel();
  },
);

test('关闭初始默认选择仍按原请求定位并独立交付观测和中心', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({
    status: 'success',
    location: origin,
  });
  const observed = jest.fn();
  const { session, map } = open({
    initialLocationRequest: { includeAddress: false },
    selectInitialLocation: false,
    onInitialLocationResult: observed,
  });
  await flush();
  expect(session.store.getState().selection).toBeNull();
  expect(session.store.getState().queryCenter).toEqual(origin);
  expect(map.setCenter).toHaveBeenCalledWith(origin);
  expect(observed).toHaveBeenCalledTimes(1);
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
  session.cancel();
});

test('非法初始选择开关在定位前返回输入错误', () => {
  const { session, onResult } = open({
    initialLocationRequest: { includeAddress: false },
    selectInitialLocation: 'false' as never,
  });
  expect(session.validInput).toBe(false);
  expect(onResult).toHaveBeenCalledWith({
    status: 'failed',
    error: expect.objectContaining({ reason: 'invalid_input' }),
  });
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test.each(['拖动', '候选选点', '外部选择', '显式清空', '重新定位'])(
  '%s 后迟到的初始定位不覆盖当前选择意图',
  async (action) => {
    const pending = deferred<GetCurrentLocationResult>();
    jest.mocked(getCurrentLocation).mockReturnValue(pending.promise);
    const { session } = open({
      initialLocationRequest: { includeAddress: false },
      onRequestRelocate: async () => {},
    });
    if (action === '拖动')
      session.events.onUserDragStart!({ nativeEvent: other } as never);
    else if (action === '候选选点')
      session.selectCandidate({ id: 'chosen', location: other });
    else if (action === '外部选择')
      session.controls.setSelection({ coordinates: other });
    else if (action === '显式清空') session.controls.setSelection(null);
    else await session.requestRelocate();
    const selection = session.store.getState().selection;
    pending.resolve({ status: 'success', location: origin });
    await flush();
    expect(session.store.getState().selection).toEqual(selection);
    expect(getCurrentLocation).toHaveBeenCalledTimes(1);
    session.cancel();
  },
);

test('纯地图未请求初始定位时不额外定位或把显示中心当选择', async () => {
  const { session } = open({ initialCameraPosition: { target: origin } });
  await flush();
  expect(session.store.getState().selection).toBeNull();
  expect(getCurrentLocation).not.toHaveBeenCalled();
  session.cancel();
});

test.each<GetCurrentLocationResult>([
  { status: 'cancelled' },
  {
    status: 'failed',
    error: { reason: 'permission_denied', message: '定位权限已拒绝' },
  },
])('初始定位 $status 不生成默认坐标', async (result) => {
  jest.mocked(getCurrentLocation).mockResolvedValue(result);
  const { session } = open({
    initialLocationRequest: { includeAddress: false },
    initialCameraPosition: { target: other },
  });
  await flush();
  expect(session.store.getState().selection).toBeNull();
  session.cancel();
});
