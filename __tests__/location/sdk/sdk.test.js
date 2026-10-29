const { loadSdk } = require('./sdkFixture');

function setup() {
  const pending = [];
  let event;
  const native = {
    getPrivacyStatus: jest.fn(() => ({ isReady: true })),
    getCurrentLocation: jest.fn(
      (input) =>
        new Promise((resolve, reject) =>
          pending.push({ input, resolve, reject }),
        ),
    ),
    setLocatingWithReGeocode: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    addListener: jest.fn((name, listener) => {
      event = listener;
      return { remove: jest.fn() };
    }),
  };
  return {
    native,
    pending,
    sdk: loadSdk(native),
    emit: (value) => event(value),
  };
}

test('真实 SDK 在持续观察中并行交接每次地址参数和乱序结果', async () => {
  const { sdk, native, pending, emit } = setup();
  const observed = jest.fn();
  sdk.addLocationListener(observed);
  sdk.start();
  const addressed = sdk.getCurrentLocation({ includeAddress: true });
  const plain = sdk.getCurrentLocation({ includeAddress: false });
  expect(native.getCurrentLocation.mock.calls).toEqual([
    [{ includeAddress: true }],
    [{ includeAddress: false }],
  ]);
  emit({ latitude: 0, longitude: 0 });
  pending[1].resolve({ latitude: 2, longitude: 3 });
  await expect(plain).resolves.toEqual({ latitude: 2, longitude: 3 });
  pending[0].resolve({ latitude: 4, longitude: 5, address: 'fixture' });
  await expect(addressed).resolves.toEqual({
    latitude: 4,
    longitude: 5,
    address: 'fixture',
  });
  expect(observed).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
  expect(native.stop).not.toHaveBeenCalled();
  expect(native.setLocatingWithReGeocode).not.toHaveBeenCalled();
});

test('缺方向不补零，真实零方向与 bearing 兼容值保留', async () => {
  const { sdk, pending } = setup();
  for (const [input, output] of [
    [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    ],
    [
      { latitude: 0, longitude: 0, heading: 0 },
      { latitude: 0, longitude: 0, heading: 0 },
    ],
    [
      { latitude: 0, longitude: 0, bearing: 0 },
      { latitude: 0, longitude: 0, bearing: 0, heading: 0 },
    ],
  ]) {
    const result = sdk.getCurrentLocation({ includeAddress: false });
    pending.at(-1).resolve(input);
    await expect(result).resolves.toEqual(output);
  }
});

test.each([null, {}, { includeAddress: 0 }, { includeAddress: 'true' }, false])(
  '非法明确参数 %p 不发送原生调用',
  async (input) => {
    const { sdk, native } = setup();
    // Observe before awaiting: the baseline starts native work and leaves its Promise pending.
    const result = sdk.getCurrentLocation(input);
    const rejection = result.catch((error) => error);
    expect(native.getCurrentLocation).not.toHaveBeenCalled();
    expect(await rejection).toMatchObject({
      name: 'GaodeMapError',
      type: 'INVALID_PARAMETER',
    });
  },
);

test('无参兼容走 native 默认配置；单次错误不交换另一请求或停止持续观察', async () => {
  const { sdk, native, pending } = setup();
  sdk.start();
  const legacy = sdk.getCurrentLocation();
  const explicit = sdk.getCurrentLocation({ includeAddress: false });
  expect(pending[0].input).toBeNull();
  const rejected = legacy.catch((error) => error);
  pending[0].reject(new Error('fixture failure'));
  pending[1].resolve({ latitude: 0, longitude: 0, heading: 0 });
  expect(await rejected).toEqual(
    expect.objectContaining({
      message: expect.stringContaining('fixture failure'),
    }),
  );
  await expect(explicit).resolves.toEqual({
    latitude: 0,
    longitude: 0,
    heading: 0,
  });
  expect(native.stop).not.toHaveBeenCalled();
});
