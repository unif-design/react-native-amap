import { getCurrentLocation } from '@amap/location';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import type { MapPickerConfig, MapSelection } from '@amap/MapPicker/types';
import type { GetCurrentLocationResult } from '@amap/location';
import type { MapViewRef } from 'expo-gaode-map';

jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
const location = jest.mocked(getCurrentLocation);
const a = { latitude: 0, longitude: 0 };
const b = { latitude: 20, longitude: 30 };
const c = { latitude: 40, longitude: 50 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mapRef() {
  return {
    setCenter: jest.fn().mockResolvedValue(undefined),
    moveCamera: jest.fn().mockResolvedValue(undefined),
    setZoom: jest.fn().mockResolvedValue(undefined),
    getCameraPosition: jest.fn().mockResolvedValue({ target: a }),
  } as unknown as MapViewRef;
}
function open(config: MapPickerConfig = {}) {
  const onResult = jest.fn();
  const session = createMapPickerSession(config, onResult);
  const map = mapRef();
  session.attachMap(map);
  session.activate();
  session.events.onLoad!({ nativeEvent: {} } as never);
  return { session, map, onResult };
}
async function flush() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

afterEach(() => {
  jest.useRealTimers();
});

test('construction is pure; committed activation starts exactly one location across effect replay', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const ready = jest.fn();
  const observed = jest.fn();
  const session = createMapPickerSession(
    {
      initialLocationRequest: { includeAddress: false },
      onReady: ready,
      onInitialLocationResult: observed,
    },
    jest.fn(),
  );
  expect(location).not.toHaveBeenCalled();
  session.activate();
  session.deactivate();
  session.activate();
  expect(location).toHaveBeenCalledTimes(1);
  pending.resolve({ status: 'success', location: a });
  await flush();
  expect(observed).not.toHaveBeenCalled();
  const map = mapRef();
  session.attachMap(map);
  session.events.onLoad!({ nativeEvent: {} } as never);
  expect(ready).toHaveBeenCalledTimes(1);
  expect(observed).toHaveBeenCalledTimes(1);
  expect(session.store.getState().queryCenter).toEqual(a);
  expect(map.setCenter).toHaveBeenCalledWith(a);
  expect(session.store.getState().selection).toEqual({ coordinates: a });
});

test.each([
  [undefined, undefined, a, a],
  [b, undefined, b, a],
  [undefined, c, a, c],
  [b, c, b, c],
])(
  'initial centers remain independent: %j / %j',
  async (display, query, expectedDisplay, expectedQuery) => {
    location.mockResolvedValue({ status: 'success', location: a });
    const { session, map } = open({
      initialCameraPosition: display
        ? { target: display, zoom: 12 }
        : undefined,
      initialQueryCenter: query,
      initialLocationRequest: { includeAddress: true },
    });
    await flush();
    expect(session.config.initialCameraPosition).toEqual(
      display ? { target: display, zoom: 12 } : { zoom: 16 },
    );
    expect(session.store.getState().queryCenter).toEqual(expectedQuery);
    if (display) {
      expect(map.setCenter).not.toHaveBeenCalled();
    } else {
      expect(map.setCenter).toHaveBeenCalledWith(expectedDisplay);
    }
  },
);

test('late initial location cannot overwrite explicit display/query updates; readiness never waits', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const ready = jest.fn();
  const observed = jest.fn();
  const { session, map } = open({
    initialLocationRequest: { includeAddress: false },
    onReady: ready,
    onInitialLocationResult: observed,
  });
  expect(ready).toHaveBeenCalledTimes(1);
  await session.controls.moveCamera({ target: b });
  session.controls.setQueryCenter(c);
  pending.resolve({ status: 'success', location: a });
  await flush();
  expect(map.setCenter).not.toHaveBeenCalled();
  expect(session.store.getState().queryCenter).toEqual(c);
  expect(observed).toHaveBeenCalledTimes(1);
});

test('仅更新查询中心不隐藏仍有效的初始定位权限错误', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const { session } = open({
    initialLocationRequest: { includeAddress: false },
  });

  session.controls.setQueryCenter(b);
  pending.resolve({
    status: 'failed',
    error: { reason: 'permission_denied', message: '定位权限失败' },
  });
  await flush();

  expect(session.store.getState()).toMatchObject({
    queryCenter: b,
    locationPermissionDenied: true,
    localError: '定位权限已拒绝，请到系统设置开启',
  });
});

test('snapshots, zero coordinates and display atomicity preserve data ownership', () => {
  const selection = {
    coordinates: { ...a },
    place: { name: '真实地点', photos: [{ title: '原图' }] },
  };
  const { session } = open({
    initialSelection: selection,
    initialDisplay: { circle: { center: [0, 0], radius: 10, strokeWidth: 3 } },
  });
  selection.coordinates.latitude = 88;
  selection.place.photos[0].title = '修改';
  expect(session.store.getState().selection?.coordinates).toEqual(a);
  expect(session.store.getState().selection?.place?.photos?.[0].title).toBe(
    '原图',
  );
  session.controls.updateDisplay({ circle: { center: b, radius: 20 } });
  expect(session.store.getState().display.circle).toEqual({
    center: b,
    radius: 20,
  });
  const before = session.store.getState();
  expect(() =>
    session.controls.updateDisplay({
      scrollGesturesEnabled: false,
      circle: { center: a, radius: 0 },
    }),
  ).toThrow();
  expect(session.store.getState()).toBe(before);
  expect(() =>
    session.controls.setQueryCenter({ ...a, latitude: NaN }),
  ).toThrow();
  session.controls.updateDisplay({ circle: undefined });
  expect(session.store.getState()).toBe(before);
  session.controls.updateDisplay({ circle: null });
  expect(session.store.getState().display.circle).toBeNull();
});

test('old controls never dispatch; already dispatched map result/rejection stays original', async () => {
  const { session, map, onResult } = open();
  const pending = deferred<{ target: typeof a }>();
  jest.mocked(map.getCameraPosition).mockReturnValue(pending.promise);
  const read = session.controls.getCameraPosition();
  session.cancel();
  pending.resolve({ target: a });
  expect(await read).toEqual({ target: a });
  await expect(session.controls.getCameraPosition()).rejects.toThrow();
  await expect(session.controls.setCenter(b)).rejects.toThrow();
  expect(map.getCameraPosition).toHaveBeenCalledTimes(1);
  const query = jest.fn();
  expect(await session.controls.loadCandidates(query)).toEqual({
    status: 'cancelled',
  });
  expect(query).not.toHaveBeenCalled();
  session.controls.setSelection({ coordinates: b });
  session.cancel();
  expect(onResult).toHaveBeenCalledTimes(1);
});

test('selection observer receives frozen snapshot and reentrant controls preserve newest selection', () => {
  const changed = jest.fn((value) => {
    if (value?.coordinates.latitude === 0) {
      session.controls.setSelection({ coordinates: b });
    }
  });
  const { session } = open({ onSelectionChange: changed });
  session.controls.setSelection({ coordinates: a });
  expect(changed).toHaveBeenCalledTimes(2);
  expect(Object.isFrozen(changed.mock.calls[0][0].coordinates)).toBe(true);
  expect(session.store.getState().selection).toEqual({ coordinates: b });
});

test('candidate projection retains partial fields and duplicate rows; no location means no selection', async () => {
  const { session, map } = open();
  const page = {
    items: [
      { id: 'same', name: '甲', location: a },
      { id: 'same', name: '乙', location: b },
      { name: '缺坐标' },
    ],
  };
  const result = { status: 'success' as const, data: page };
  expect(await session.controls.loadCandidates(async () => result)).toBe(
    result,
  );
  expect(session.store.getState().scenario.result).toEqual(result);
  session.selectCandidate(page.items[1]);
  expect(session.store.getState().selection).toEqual({
    coordinates: b,
    place: { id: 'same', name: '乙' },
  });
  session.selectCandidate(page.items[2]);
  expect(session.store.getState().selection?.coordinates).toEqual(b);
  expect(map.setCenter).not.toHaveBeenCalled();
});

test('confirmation is single, same snapshot, revised selection invalidates even A-B-A', async () => {
  const check = deferred<{ canConfirm: true }>();
  const beforeConfirm = jest.fn(
    (_selection: Readonly<MapSelection>) => check.promise,
  );
  const options = jest.fn((_selection: Readonly<MapSelection>) => ({
    title: '确认',
  }));
  const { session, onResult } = open({
    initialSelection: { coordinates: a },
    beforeConfirm,
    getConfirmationOptions: options,
  });
  const first = session.complete();
  session.complete();
  expect(beforeConfirm).toHaveBeenCalledTimes(1);
  session.controls.setSelection({ coordinates: b });
  session.controls.setSelection({ coordinates: a });
  check.resolve({ canConfirm: true });
  await first;
  expect(options).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
  const next = session.complete();
  await flush();
  const request = session.store.getState().confirmation!;
  const release = jest.fn();
  const confirm = jest.fn().mockResolvedValue(true);
  session.bindConfirmation(request, confirm, release);
  await next;
  expect(options.mock.calls[0][0]).toBe(beforeConfirm.mock.calls[1][0]);
  expect(confirm).toHaveBeenCalledWith(request.options);
  expect(onResult).toHaveBeenCalledWith({
    status: 'success',
    selection: { coordinates: a },
  });
  expect(release).toHaveBeenCalledTimes(1);
});

test('confirmation cancellation before host effect binds settles completion; late bind cannot confirm', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: a },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = session.complete();
  await flush();
  const request = session.store.getState().confirmation!;
  session.cancel();
  await completion;
  const confirm = jest.fn();
  const release = jest.fn();
  session.bindConfirmation(request, confirm, release);
  await flush();
  expect(confirm).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});

test('drag callback controls expire on next drag start and explicit selection; base controls remain valid', async () => {
  const pending = deferred<void>();
  const { session } = open({
    onUserDragEnd: async (_center, controls) => {
      await pending.promise;
      controls.setSelection({ coordinates: a });
    },
  });
  session.events.onUserDragStart!({ nativeEvent: a } as never);
  session.events.onUserDragEnd!({ nativeEvent: a } as never);
  session.events.onUserDragStart!({ nativeEvent: b } as never);
  pending.resolve();
  await flush();
  expect(session.store.getState().selection).toBeNull();
  session.controls.setSelection({ coordinates: c });
  expect(session.store.getState().selection?.coordinates).toEqual(c);
});

test('zoom update while initial location waits does not block missing display center or reset zoom', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const { session, map } = open({
    initialLocationRequest: { includeAddress: false },
    initialQueryCenter: c,
  });
  await session.controls.moveCamera({ zoom: 10 });
  pending.resolve({ status: 'success', location: a });
  await flush();
  expect(map.setCenter).toHaveBeenCalledWith(a);
  expect(map.moveCamera).toHaveBeenCalledTimes(1);
  expect(session.store.getState().queryCenter).toEqual(c);
});

test('user drag before location completion prevents automatic display move without changing query default', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const { session, map } = open({
    initialLocationRequest: { includeAddress: false },
  });
  session.events.onUserDragStart!({ nativeEvent: b } as never);
  pending.resolve({ status: 'success', location: a });
  await flush();
  expect(map.setCenter).not.toHaveBeenCalled();
  expect(session.store.getState().queryCenter).toEqual(a);
});

test('round ending before initial location suppresses observation and never updates another round', async () => {
  const pending = deferred<GetCurrentLocationResult>();
  location.mockReturnValue(pending.promise);
  const observed = jest.fn();
  const old = open({
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: observed,
  });
  old.session.cancel();
  const next = open({ initialSelection: { coordinates: b } });
  pending.resolve({ status: 'success', location: a });
  await flush();
  expect(observed).not.toHaveBeenCalled();
  expect(next.session.store.getState().queryCenter).toBeUndefined();
  expect(next.session.store.getState().selection?.coordinates).toEqual(b);
  expect(old.map.setCenter).not.toHaveBeenCalled();
});

test('absent explicit location request has zero location/query calls even with configured search and existing selection', () => {
  const query = jest.fn().mockResolvedValue({ status: 'cancelled' });
  const { session } = open({
    initialSelection: { coordinates: a },
    search: { debounceMs: 0, query },
    panel: { visible: false },
  });
  expect(location).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  expect(session.store.getState().queryCenter).toBeUndefined();
  session.changeSearchText('合法搜索');
  expect(query).toHaveBeenCalledTimes(1);
});
