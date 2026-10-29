import { checkMultiple, RESULTS } from 'react-native-permissions';
import * as location from '@amap/location';

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);
const mockSdk = {
  isSDKInitialized: jest.fn(() => true),
  getPrivacyStatus: jest.fn(() => ({ isReady: true })),
  getCurrentLocation: jest.fn(async (_input: unknown) => ({
    latitude: 0,
    longitude: 0,
  })),
  addLocationListener: jest.fn(),
  setLocatingWithReGeocode: jest.fn(),
  setInterval: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};
jest.mock('expo-gaode-map', () => ({ ExpoGaodeMapModule: mockSdk }));

beforeEach(() => {
  jest
    .mocked(checkMultiple)
    .mockImplementation(
      async (permissions) =>
        Object.fromEntries(
          permissions.map((p) => [p, RESULTS.GRANTED]),
        ) as Awaited<ReturnType<typeof checkMultiple>>,
    );
});

test('公开按次定位使用明确地址参数并保留零坐标与缺失元数据', async () => {
  expect(location).toHaveProperty('getCurrentLocation');
  await expect(
    location.getCurrentLocation({ includeAddress: false }),
  ).resolves.toEqual({
    status: 'success',
    location: { latitude: 0, longitude: 0 },
  });
  expect(mockSdk.getCurrentLocation).toHaveBeenCalledWith({
    includeAddress: false,
  });
  expect(mockSdk.setLocatingWithReGeocode).not.toHaveBeenCalled();
  expect(mockSdk.stop).not.toHaveBeenCalled();
});

test('观察替换先释放旧资源再通知，旧句柄失效且持续地址关闭', async () => {
  expect(location).toHaveProperty('startLocationUpdates');
  const remove = jest.fn();
  mockSdk.addLocationListener.mockReturnValue({ remove });
  const stopped = jest.fn(() => {
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mockSdk.stop).toHaveBeenCalledTimes(1);
  });
  const a = await location.startLocationUpdates(
    { intervalMs: 100 },
    { onLocation: jest.fn(), onStopped: stopped },
  );
  const b = await location.startLocationUpdates(
    { intervalMs: 0 },
    { onLocation: jest.fn() },
  );
  expect(stopped).toHaveBeenCalledWith('replaced');
  expect(a.status).toBe('subscribed');
  expect(b.status).toBe('subscribed');
  if (a.status !== 'subscribed' || b.status !== 'subscribed')
    throw Error('expected subscribed');
  expect(a.updates.setInterval(100)).toEqual({ status: 'inactive' });
  a.updates.stop();
  expect(mockSdk.stop).toHaveBeenCalledTimes(1);
  expect(mockSdk.setLocatingWithReGeocode).toHaveBeenCalledWith(false);
  b.updates.stop();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function subscribed(result: location.StartLocationUpdatesResult) {
  if (result.status !== 'subscribed') throw Error(JSON.stringify(result));
  return result.updates;
}

test.each([NaN, Infinity, -1, 0.1, 2147483648])(
  '无效间隔 %s 不动旧观察或权限',
  async (intervalMs) => {
    const stopped = jest.fn();
    const active = subscribed(
      await location.startLocationUpdates(
        { intervalMs: 100 },
        { onLocation() {}, onStopped: stopped },
      ),
    );
    jest.mocked(checkMultiple).mockClear();
    await expect(
      location.startLocationUpdates({ intervalMs }, { onLocation() {} }),
    ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
    expect(active.setInterval(intervalMs)).toMatchObject({
      error: { reason: 'invalid_input' },
    });
    expect(stopped).not.toHaveBeenCalled();
    expect(checkMultiple).not.toHaveBeenCalled();
    active.stop();
  },
);

test('位置共同转换过滤非法可选值、保留空地址和真实来源，非法事件后继续', async () => {
  const raw = {
    latitude: 0,
    longitude: -180,
    timestamp: 0,
    altitude: -3,
    accuracy: 0,
    speed: -1,
    heading: 360,
    coordType: 'GCJ02',
    address: '',
    city: '',
    isMock: false,
    trustedLevel: 2,
    isSimulatedBySoftware: true,
  };
  mockSdk.getCurrentLocation.mockResolvedValueOnce(raw);
  const single = await location.getCurrentLocation({ includeAddress: true });
  expect(single).toEqual({
    status: 'success',
    location: {
      latitude: 0,
      longitude: -180,
      timestampMs: 0,
      altitudeMeters: -3,
      accuracyMeters: 0,
      coordinateSystem: 'GCJ02',
      address: { formattedAddress: '', city: '' },
      isMock: false,
      trustedLevel: 2,
      isSimulatedBySoftware: true,
    },
  });
  const onLocation = jest.fn();
  const updates = subscribed(
    await location.startLocationUpdates({ intervalMs: 0 }, { onLocation }),
  );
  const deliver = mockSdk.addLocationListener.mock.calls.at(-1)![0];
  deliver({ latitude: 91, longitude: 0 });
  deliver(raw);
  expect(onLocation).toHaveBeenCalledTimes(1);
  expect(onLocation).toHaveBeenCalledWith(
    single.status === 'success' ? single.location : null,
  );
  updates.stop();
  deliver(raw);
  expect(onLocation).toHaveBeenCalledTimes(1);
});

test.each([
  undefined,
  null,
  { latitude: NaN, longitude: 1 },
  { latitude: 0, longitude: 181 },
])('单次非法位置 %j 不交付成功', async (raw) => {
  mockSdk.getCurrentLocation.mockResolvedValueOnce(raw as never);
  await expect(
    location.getCurrentLocation({ includeAddress: false }),
  ).resolves.toMatchObject({ error: { reason: 'invalid_coordinates' } });
});

test('单次并行、取消和迟到各属原调用，不全局停止；已成功不会被撤销', async () => {
  const a = deferred<{ latitude: number; longitude: number }>();
  const b = deferred<{ latitude: number; longitude: number }>();
  const invoked = deferred<void>();
  mockSdk.getCurrentLocation
    .mockImplementationOnce(() => a.promise)
    .mockImplementationOnce(() => {
      invoked.resolve();
      return b.promise;
    });
  const controller = new AbortController();
  const first = location.getCurrentLocation(
    { includeAddress: true },
    { signal: controller.signal },
  );
  const second = location.getCurrentLocation({ includeAddress: false });
  await invoked.promise;
  controller.abort();
  await expect(first).resolves.toEqual({ status: 'cancelled' });
  b.resolve({ latitude: 2, longitude: 3 });
  await expect(second).resolves.toMatchObject({
    status: 'success',
    location: { latitude: 2 },
  });
  a.reject(Error('late'));
  await a.promise.catch(() => {});
  expect(mockSdk.stop).not.toHaveBeenCalled();
  const completed = new AbortController();
  const result = await location.getCurrentLocation(
    { includeAddress: false },
    { signal: completed.signal },
  );
  completed.abort();
  expect(result.status).toBe('success');
});

test('单次权限等待取消和预取消不启动 SDK', async () => {
  const gate = deferred<Awaited<ReturnType<typeof checkMultiple>>>();
  const entered = deferred<void>();
  jest.mocked(checkMultiple).mockImplementationOnce(() => {
    entered.resolve();
    return gate.promise;
  });
  const controller = new AbortController();
  const pending = location.getCurrentLocation(
    { includeAddress: false },
    { signal: controller.signal },
  );
  await entered.promise;
  controller.abort();
  await expect(pending).resolves.toEqual({ status: 'cancelled' });
  gate.resolve({} as Awaited<ReturnType<typeof checkMultiple>>);
  await expect(
    location.getCurrentLocation(
      { includeAddress: false },
      { signal: controller.signal },
    ),
  ).resolves.toEqual({ status: 'cancelled' });
  expect(mockSdk.getCurrentLocation).not.toHaveBeenCalled();
});

test('权限等待 A 被 B 永久取代，B 取消不复活 A；有效 C 才替换现有观察', async () => {
  const stopped = jest.fn();
  const old = subscribed(
    await location.startLocationUpdates(
      { intervalMs: 100 },
      { onLocation() {}, onStopped: stopped },
    ),
  );
  const gate = deferred<Awaited<ReturnType<typeof checkMultiple>>>();
  const entered = deferred<void>();
  jest.mocked(checkMultiple).mockImplementationOnce(() => {
    entered.resolve();
    return gate.promise;
  });
  const a = location.startLocationUpdates(
    { intervalMs: 1 },
    { onLocation() {} },
  );
  await entered.promise;
  const controller = new AbortController();
  const b = location.startLocationUpdates(
    { intervalMs: 2 },
    { onLocation() {} },
    { signal: controller.signal },
  );
  controller.abort();
  await expect(a).resolves.toEqual({ status: 'cancelled' });
  await expect(b).resolves.toEqual({ status: 'cancelled' });
  expect(stopped).not.toHaveBeenCalled();
  gate.resolve({} as Awaited<ReturnType<typeof checkMultiple>>);
  const c = subscribed(
    await location.startLocationUpdates({ intervalMs: 3 }, { onLocation() {} }),
  );
  expect(stopped).toHaveBeenCalledWith('replaced');
  expect(old.setInterval(0)).toEqual({ status: 'inactive' });
  c.stop();
});

test('onStopped 内开始的新请求接管，外层候选 cancelled，旧清理不停止新观察', async () => {
  let nested!: Promise<location.StartLocationUpdatesResult>;
  const old = subscribed(
    await location.startLocationUpdates(
      { intervalMs: 10 },
      {
        onLocation() {},
        onStopped() {
          nested = location.startLocationUpdates(
            { intervalMs: 30 },
            { onLocation() {} },
          );
        },
      },
    ),
  );
  const outer = await location.startLocationUpdates(
    { intervalMs: 20 },
    { onLocation() {} },
  );
  expect(outer).toEqual({ status: 'cancelled' });
  const current = subscribed(await nested);
  const count = mockSdk.stop.mock.calls.length;
  old.stop();
  expect(mockSdk.stop).toHaveBeenCalledTimes(count);
  expect(current.setInterval(40)).toEqual({ status: 'requested' });
  current.stop();
});

test.each(['registration', 'start'])(
  'SDK %s 同步事件先于句柄，回调取消等待完成监听清理再通知',
  async (phase) => {
    const controller = new AbortController();
    const remove = jest.fn();
    const stopped = jest.fn(() => {
      expect(remove).toHaveBeenCalledTimes(1);
      expect(mockSdk.stop).toHaveBeenCalledTimes(1);
    });
    const callback = jest.fn(() => controller.abort());
    mockSdk.addLocationListener.mockImplementationOnce((deliver) => {
      if (phase === 'registration') deliver({ latitude: 0, longitude: 0 });
      else
        mockSdk.start.mockImplementationOnce(() =>
          deliver({ latitude: 0, longitude: 0 }),
        );
      return { remove };
    });
    await expect(
      location.startLocationUpdates(
        { intervalMs: 0 },
        { onLocation: callback, onStopped: stopped },
        { signal: controller.signal },
      ),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(stopped).toHaveBeenCalledWith('cancelled');
    expect(remove).toHaveBeenCalledTimes(1);
  },
);

test('observer 异常不冒充 SDK 失败；回调 stop 同步阻止后续交付', async () => {
  const onLocation = jest.fn<void, []>(() => {
    throw Error('consumer');
  });
  const updates = subscribed(
    await location.startLocationUpdates(
      { intervalMs: 1 },
      {
        onLocation,
        onStopped() {
          throw Error('consumer stop');
        },
      },
    ),
  );
  const deliver = mockSdk.addLocationListener.mock.calls.at(-1)![0];
  expect(() => deliver({ latitude: 1, longitude: 2 })).not.toThrow();
  onLocation.mockImplementation(() => {
    updates.stop();
  });
  deliver({ latitude: 1, longitude: 2 });
  deliver({ latitude: 1, longitude: 2 });
  expect(onLocation).toHaveBeenCalledTimes(2);
  expect(updates.setInterval(10)).toEqual({ status: 'inactive' });
});

test.each([
  'addLocationListener',
  'setLocatingWithReGeocode',
  'setInterval',
  'start',
] as const)(
  '可观察 %s 异常失败并释放，新调用失败不复活旧观察',
  async (method) => {
    const stopped = jest.fn();
    const old = subscribed(
      await location.startLocationUpdates(
        { intervalMs: 1 },
        { onLocation() {}, onStopped: stopped },
      ),
    );
    mockSdk[method].mockImplementationOnce(() => {
      throw Error('external');
    });
    await expect(
      location.startLocationUpdates({ intervalMs: 2 }, { onLocation() {} }),
    ).resolves.toMatchObject({ error: { reason: 'unavailable' } });
    expect(stopped).toHaveBeenCalledWith('replaced');
    expect(old.setInterval(4)).toEqual({ status: 'inactive' });
  },
);

test('监听清理和 stop 异常仍结束且仅通知一次，句柄配置异常不终止观察', async () => {
  const stopped = jest.fn();
  mockSdk.addLocationListener.mockReturnValueOnce({
    remove() {
      throw Error('remove');
    },
  });
  const updates = subscribed(
    await location.startLocationUpdates(
      { intervalMs: 0 },
      { onLocation() {}, onStopped: stopped },
    ),
  );
  mockSdk.setInterval.mockImplementationOnce(() => {
    throw Error('interval');
  });
  expect(updates.setInterval(0)).toMatchObject({
    error: { reason: 'unavailable' },
  });
  expect(updates.setInterval(0)).toEqual({ status: 'requested' });
  mockSdk.stop.mockImplementationOnce(() => {
    throw Error('stop');
  });
  updates.stop();
  updates.stop();
  expect(stopped).toHaveBeenCalledTimes(1);
  expect(stopped).toHaveBeenCalledWith('stopped');
});

test('SDK 未就绪避免权限访问，原生异常文字不能推导权限拒绝', async () => {
  mockSdk.isSDKInitialized.mockReturnValueOnce(false);
  await expect(
    location.getCurrentLocation({ includeAddress: false }),
  ).resolves.toMatchObject({ error: { reason: 'unavailable' } });
  expect(checkMultiple).not.toHaveBeenCalled();
  mockSdk.getPrivacyStatus.mockReturnValueOnce({ isReady: false });
  await expect(
    location.startLocationUpdates({ intervalMs: 0 }, { onLocation() {} }),
  ).resolves.toMatchObject({ error: { reason: 'unavailable' } });
  expect(checkMultiple).not.toHaveBeenCalled();
  mockSdk.getCurrentLocation.mockRejectedValueOnce(
    Error('permission GPS error private coordinate'),
  );
  await expect(
    location.getCurrentLocation({ includeAddress: true }),
  ).resolves.toMatchObject({ error: { reason: 'unavailable' } });
});

test('拒权与预取消不结束现有观察，原 signal 取消只释放本次观察', async () => {
  const stopped = jest.fn();
  const controller = new AbortController();
  const old = subscribed(
    await location.startLocationUpdates(
      { intervalMs: 1 },
      { onLocation() {}, onStopped: stopped },
      { signal: controller.signal },
    ),
  );
  jest
    .mocked(checkMultiple)
    .mockImplementationOnce(
      async (permissions) =>
        Object.fromEntries(
          permissions.map((p) => [p, RESULTS.BLOCKED]),
        ) as Awaited<ReturnType<typeof checkMultiple>>,
    );
  await expect(
    location.startLocationUpdates({ intervalMs: 2 }, { onLocation() {} }),
  ).resolves.toMatchObject({ error: { reason: 'permission_denied' } });
  const aborted = new AbortController();
  aborted.abort();
  await expect(
    location.startLocationUpdates(
      { intervalMs: 2 },
      { onLocation() {} },
      { signal: aborted.signal },
    ),
  ).resolves.toEqual({ status: 'cancelled' });
  expect(stopped).not.toHaveBeenCalled();
  const newer = subscribed(
    await location.startLocationUpdates({ intervalMs: 3 }, { onLocation() {} }),
  );
  const stops = mockSdk.stop.mock.calls.length;
  controller.abort();
  old.stop();
  expect(mockSdk.stop).toHaveBeenCalledTimes(stops);
  expect(newer.setInterval(2147483647)).toEqual({ status: 'requested' });
  newer.stop();
});

test('onLocation 内新请求与旧 signal 取消归属独立，已进入回调后不再交付旧事件', async () => {
  let next!: Promise<location.StartLocationUpdatesResult>;
  const controller = new AbortController();
  const oldEvents = jest.fn(() => {
    next = location.startLocationUpdates(
      { intervalMs: 2 },
      { onLocation() {} },
    );
    controller.abort();
  });
  const stopped = jest.fn();
  await location.startLocationUpdates(
    { intervalMs: 1 },
    { onLocation: oldEvents, onStopped: stopped },
    { signal: controller.signal },
  );
  const oldDeliver = mockSdk.addLocationListener.mock.calls.at(-1)![0];
  oldDeliver({ latitude: 1, longitude: 2 });
  const newer = subscribed(await next);
  oldDeliver({ latitude: 1, longitude: 2 });
  expect(oldEvents).toHaveBeenCalledTimes(1);
  expect(stopped).toHaveBeenCalledWith('cancelled');
  expect(newer.setInterval(0)).toEqual({ status: 'requested' });
  newer.stop();
});
