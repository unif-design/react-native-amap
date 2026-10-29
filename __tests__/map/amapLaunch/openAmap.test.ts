import { Linking, Platform } from 'react-native';
import { URL } from 'react-native-url-polyfill';
import { openAmap } from '@amap/amapLaunch';
import { openAmap as webOpen } from '@amap/amapLaunch/openAmap.web';
import type { AmapLaunchRequest } from '@amap/amapLaunch';

const destination = {
  latitude: 0,
  longitude: 0,
  coordinateSystem: 'GCJ02' as const,
};
beforeEach(() => {
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

test.each([
  ['ios', { action: 'home' }, 'iosamap://rootmap'],
  ['android', { action: 'home' }, 'androidamap://rootmap'],
  ['ios', { action: 'current_location' }, 'iosamap://myLocation'],
  ['android', { action: 'current_location' }, 'androidamap://myLocation'],
  [
    'ios',
    { action: 'marker', location: destination, name: '地点&=# 名称' },
    'iosamap://viewMap',
  ],
  ['android', { action: 'navigate', destination }, 'androidamap://navi'],
  [
    'ios',
    { action: 'ride', destination, rideType: 'elebike' },
    'amapuri://openFeature',
  ],
  [
    'android',
    { action: 'ride', destination, rideType: 'bike' },
    'amapuri://openFeature',
  ],
  [
    'ios',
    { action: 'route', mode: 0, end: { name: '目的地' } },
    'iosamap://path',
  ],
  [
    'android',
    { action: 'route', mode: 5, end: { location: destination } },
    'amapuri://route/plan/',
  ],
])('%s 的 $action 只查询并打开同一 URI：%s', async (platform, input, base) => {
  jest.replaceProperty(Platform, 'OS', platform as 'ios' | 'android');
  await expect(
    openAmap(input as AmapLaunchRequest, { sourceApplication: 'Portal &测试' }),
  ).resolves.toBe(true);
  const uri = jest.mocked(Linking.canOpenURL).mock.calls[0][0];
  expect(uri.startsWith(`${base}?`)).toBe(true);
  const url = new URL(uri);
  expect(url.searchParams.get('sourceApplication')).toBe('Portal &测试');
  expect(Linking.canOpenURL).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledWith(uri);
  if ('destination' in (input as object) || 'location' in (input as object)) {
    expect(url.searchParams.get('lat')).toBe('0');
    expect(url.searchParams.get('lon')).toBe('0');
    expect(url.searchParams.get('dev')).toBe('0');
  }
  const action = input as AmapLaunchRequest;
  if (action.action === 'marker')
    expect(url.searchParams.get('poiname')).toBe(action.name);
  if (action.action === 'ride') {
    expect(url.searchParams.get('featureName')).toBe('OnRideNavi');
    expect(url.searchParams.get('rideType')).toBe(action.rideType);
  }
  if (action.action === 'route')
    expect(url.searchParams.get('t')).toBe(String(action.mode));
});

test('路线参数只投影明确字段，特殊字符编码一次且途经点对应', async () => {
  const input = {
    action: 'route' as const,
    mode: 3 as const,
    rideType: 'elebike' as const,
    start: { location: destination, name: '起点&=#', poiId: 'ID&=' },
    end: {
      location: { ...destination, latitude: 31, longitude: 121 },
      name: '',
    },
    via: [
      { location: destination, name: '中途&地点' },
      { location: { ...destination, longitude: 1 }, name: '终途#点' },
    ],
    preferenceCode: 0,
    sourceApplication: 'bad',
    dev: 1,
  };
  await openAmap(input, { sourceApplication: 'Portal' });
  const uri = jest.mocked(Linking.openURL).mock.calls[0][0];
  const query = new URL(uri).searchParams;
  expect(query.get('sname')).toBe('起点&=#');
  expect(query.get('sid')).toBe('ID&=');
  expect(query.get('dname')).toBe('');
  expect(query.get('vian')).toBe('2');
  expect(query.get('vialats')).toBe('0|0');
  expect(query.get('vialons')).toBe('0|1');
  expect(query.get('vianames')).toBe('中途&地点|终途#点');
  expect(query.get('sourceApplication')).toBe('Portal');
  expect(query.get('dev')).toBe('0');
  expect(query.get('m')).toBe('0');
});

test.each([
  null,
  { action: 'unknown' },
  { action: 'marker', location: destination, name: '' },
  { action: 'navigate', destination: { ...destination, latitude: 91 } },
  { action: 'navigate', destination: { ...destination, longitude: Infinity } },
  {
    action: 'navigate',
    destination: { ...destination, coordinateSystem: 'WGS84' },
  },
  { action: 'route', mode: 6 },
  { action: 'route', mode: 0, via: [{ location: destination, name: 'a|b' }] },
  { action: 'marker', location: destination, name: '\ud800' },
  { action: 'route', mode: 0, via: new Array(1) },
])('非法输入 %p 在系统调用前失败', async (request) => {
  await expect(
    openAmap(request as AmapLaunchRequest, { sourceApplication: 'Portal' }),
  ).rejects.toMatchObject({ code: 'amap_launch.invalid_input' });
  expect(Linking.canOpenURL).not.toHaveBeenCalled();
  expect(Linking.openURL).not.toHaveBeenCalled();
});

test('统一有效输入在平台不能承接时返回不支持，Web 不唤起', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await expect(
    openAmap(
      { action: 'route', mode: 0, end: { name: '终点' } },
      { sourceApplication: 'Portal' },
    ),
  ).rejects.toMatchObject({ code: 'amap_launch.unsupported' });
  await expect(
    openAmap(
      {
        action: 'route',
        mode: 0,
        start: { name: '上海虹桥站' },
        end: { location: destination },
      },
      { sourceApplication: 'Portal' },
    ),
  ).rejects.toMatchObject({ code: 'amap_launch.unsupported' });
  jest.replaceProperty(Platform, 'OS', 'ios');
  await expect(
    openAmap({ action: 'route', mode: 4 }, { sourceApplication: 'Portal' }),
  ).rejects.toMatchObject({ code: 'amap_launch.unsupported' });
  await expect(
    webOpen({ action: 'home' }, { sourceApplication: 'Portal' }),
  ).rejects.toMatchObject({ code: 'amap_launch.unsupported' });
  expect(Linking.canOpenURL).not.toHaveBeenCalled();
});

test('查询期间输入变化不改变已准备的 URI，取消阻止打开', async () => {
  let finish!: (value: boolean) => void;
  jest.mocked(Linking.canOpenURL).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const request = {
    action: 'navigate' as const,
    destination: { ...destination },
  };
  const controller = new AbortController();
  const options = { sourceApplication: 'Portal', signal: controller.signal };
  const pending = openAmap(request, options);
  const uri = jest.mocked(Linking.canOpenURL).mock.calls[0][0];
  request.destination.latitude = 30;
  options.sourceApplication = 'changed';
  finish(true);
  await expect(pending).resolves.toBe(true);
  expect(Linking.openURL).toHaveBeenCalledWith(uri);
  jest.mocked(Linking.openURL).mockClear();
  const cancelled = openAmap(request, options);
  controller.abort();
  finish(true);
  await expect(cancelled).resolves.toBe(false);
  expect(Linking.openURL).not.toHaveBeenCalled();
  await expect(openAmap(request, options)).resolves.toBe(false);
  expect(Linking.canOpenURL).toHaveBeenCalledTimes(2);
});

test('查询 false 不打开；已发出打开后的取消不改写结果；异常保留系统码', async () => {
  jest.mocked(Linking.canOpenURL).mockResolvedValueOnce(false);
  await expect(
    openAmap({ action: 'home' }, { sourceApplication: 'Portal' }),
  ).resolves.toBe(false);
  expect(Linking.openURL).not.toHaveBeenCalled();
  const controller = new AbortController();
  jest.mocked(Linking.openURL).mockImplementationOnce(async () => {
    controller.abort();
  });
  await expect(
    openAmap(
      { action: 'home' },
      { sourceApplication: 'Portal', signal: controller.signal },
    ),
  ).resolves.toBe(true);
  const cause = new Error('native');
  jest.mocked(Linking.canOpenURL).mockRejectedValueOnce(cause);
  await expect(
    openAmap({ action: 'home' }, { sourceApplication: 'Portal' }),
  ).rejects.toMatchObject({ code: 'system.url_check_failed', cause });
});

test.each(['ios', 'android', 'web'] as const)(
  '原生与 Web 共享输入校验契约：%s',
  async (platform) => {
    jest.replaceProperty(Platform, 'OS', platform);
    const operation = platform === 'web' ? webOpen : openAmap;
    await expect(
      operation({ action: 'route', mode: 6 } as unknown as AmapLaunchRequest, {
        sourceApplication: 'Portal',
      }),
    ).rejects.toMatchObject({ code: 'amap_launch.invalid_input' });
    await expect(
      operation({ action: 'home' }, { sourceApplication: '  ' }),
    ).rejects.toMatchObject({ code: 'amap_launch.invalid_input' });
    await expect(
      operation(
        { action: 'marker', location: destination, name: '\ud800' },
        { sourceApplication: 'Portal' },
      ),
    ).rejects.toMatchObject({ code: 'amap_launch.invalid_input' });
    await expect(
      operation(
        {
          action: 'route',
          mode: 4,
          end: { name: '\ud800', location: destination },
        },
        { sourceApplication: 'Portal' },
      ),
    ).rejects.toMatchObject({ code: 'amap_launch.invalid_input' });
    expect(Linking.canOpenURL).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  },
);

test('查询期间取消后即使查询失败也结束为取消，已发出的打开失败仍保留实际错误', async () => {
  let reject!: (cause: Error) => void;
  const controller = new AbortController();
  jest.mocked(Linking.canOpenURL).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  const pending = openAmap(
    { action: 'home' },
    { sourceApplication: 'Portal', signal: controller.signal },
  );
  controller.abort();
  reject(new Error('query failed'));
  await expect(pending).resolves.toBe(false);
  expect(Linking.openURL).not.toHaveBeenCalled();
  const later = new AbortController();
  jest.mocked(Linking.openURL).mockImplementationOnce(async () => {
    later.abort();
    throw new Error('open failed');
  });
  await expect(
    openAmap(
      { action: 'home' },
      { sourceApplication: 'Portal', signal: later.signal },
    ),
  ).rejects.toMatchObject({ code: 'system.url_open_failed' });
});
