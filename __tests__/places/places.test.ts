import {
  searchAround,
  searchByKeyword,
  getPoiById,
  reverseGeocode,
} from '@amap/places';
import type {
  SearchAroundInput,
  SearchByKeywordInput,
  ReverseGeocodeInput,
} from '@amap/places';
const mockSdk = {
  ExpoGaodeMapModule: { isSDKInitialized: jest.fn(() => true) },
  searchNearby: jest.fn<Promise<unknown>, [unknown]>(),
  searchPOI: jest.fn<Promise<unknown>, [unknown]>(),
  getPoiDetail: jest.fn<Promise<unknown>, [unknown]>(),
  reGeocode: jest.fn<Promise<unknown>, [unknown]>(),
  initSearch: jest.fn(),
  getCurrentLocation: jest.fn(),
  requestPermissions: jest.fn(),
};
const mockWarn = jest.fn();
jest.mock('expo-gaode-map', () => mockSdk);
jest.mock('@unif/react-native-logger', () => ({
  createLogger: () => ({ warn: (...args: unknown[]) => mockWarn(...args) }),
  createOperationContext: () => ({ operationId: 'test' }),
}));
const around = {
  center: { latitude: 0, longitude: 0 },
  radiusMeters: 0,
  keyword: '',
  page: 1,
  pageSize: 25,
};
const keyword = { keyword: '', page: 100, pageSize: 1 };
const reverse = {
  location: { latitude: 0, longitude: 0 },
  radiusMeters: 0,
  includeExtensions: true,
};
const entries = [
  ['around', () => searchAround(around), mockSdk.searchNearby],
  ['keyword', () => searchByKeyword(keyword), mockSdk.searchPOI],
  ['detail', () => getPoiById('id'), mockSdk.getPoiDetail],
  ['reverse', () => reverseGeocode(reverse), mockSdk.reGeocode],
] as const;
beforeEach(() => {
  mockSdk.ExpoGaodeMapModule.isSDKInitialized.mockReturnValue(true);
  for (const entry of entries) entry[2].mockReset().mockResolvedValue({});
});
afterEach(() => {
  expect(mockSdk.initSearch).not.toHaveBeenCalled();
  expect(mockSdk.getCurrentLocation).not.toHaveBeenCalled();
  expect(mockSdk.requestPermissions).not.toHaveBeenCalled();
});
test.each(entries)(
  '%s 单次查询成功空对象，初始化失败和SDK拒绝分别结束本次调用',
  async (_name, call, sdk) => {
    await expect(call()).resolves.toEqual({ status: 'success', data: {} });
    expect(sdk).toHaveBeenCalledTimes(1);
    sdk.mockRejectedValueOnce(
      Object.assign(new Error('not found PRIVATE_LOCATION_KEY'), {
        code: 'PRIVATE_KEY',
      }),
    );
    await expect(call()).resolves.toEqual({
      status: 'failed',
      error: { reason: 'unavailable', message: '暂时无法查询地点' },
    });
    expect(sdk).toHaveBeenCalledTimes(2);
    mockSdk.ExpoGaodeMapModule.isSDKInitialized.mockReturnValue(false);
    await expect(call()).resolves.toMatchObject({
      error: { reason: 'unavailable' },
    });
    expect(sdk).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mockWarn.mock.calls)).not.toMatch(
      /PRIVATE|not found/,
    );
  },
);
test('四操作只投影本次字段，快照坐标和分类，保留零与空条件', async () => {
  const input = {
    ...around,
    center: { latitude: 0, longitude: 180, coordinateSystem: 'GCJ02' as const },
    categories: ['a', 'b'],
  };
  const first = searchAround(input);
  input.center.latitude = 88;
  input.categories[0] = 'mutated';
  input.page = 3;
  await first;
  await searchByKeyword({ ...keyword, city: '', categories: [] });
  await getPoiById(' arbitrary id ');
  await reverseGeocode({ ...reverse, includeExtensions: false });
  expect(mockSdk.searchNearby.mock.calls).toEqual([
    [
      {
        center: { latitude: 0, longitude: 180 },
        radius: 0,
        keyword: '',
        types: 'a|b',
        pageNum: 1,
        pageSize: 25,
      },
    ],
  ]);
  expect(mockSdk.searchPOI.mock.calls).toEqual([
    [{ keyword: '', city: '', types: '', pageNum: 100, pageSize: 1 }],
  ]);
  expect(mockSdk.getPoiDetail.mock.calls).toEqual([[' arbitrary id ']]);
  expect(mockSdk.reGeocode.mock.calls).toEqual([
    [
      {
        location: { latitude: 0, longitude: 0 },
        radius: 0,
        requireExtension: false,
      },
    ],
  ]);
});
test.each([
  undefined,
  null,
  {},
  { ...around, page: 0 },
  { ...around, page: 101 },
  { ...around, page: 1.5 },
  { ...around, pageSize: 26 },
  { ...around, pageSize: 0 },
  { ...around, radiusMeters: -1 },
  { ...around, radiusMeters: 50001 },
  { ...around, radiusMeters: 0.5 },
  { ...around, keyword: null },
  { ...around, categories: ['a', 2] },
  { ...around, categories: Array(2) },
  { ...around, categories: null },
  { ...around, center: { latitude: NaN, longitude: 0 } },
  { ...around, center: { latitude: 91, longitude: 0 } },
  { ...around, center: { latitude: 0, longitude: -181 } },
  {
    ...around,
    center: { latitude: 0, longitude: 0, coordinateSystem: 'WGS84' },
  },
  {
    ...around,
    center: { latitude: 0, longitude: 0, coordinateSystem: 'unknown' },
  },
])('周边拒绝结构或越界输入 %#', async (input) => {
  await expect(searchAround(input as SearchAroundInput)).resolves.toMatchObject(
    { error: { reason: 'invalid_input' } },
  );
  expect(mockSdk.searchNearby).not.toHaveBeenCalled();
});
test.each([true, false])(
  '关键词中心和距离排序%s只交接口，结果保持服务返回顺序',
  async (sortByDistance) => {
    mockSdk.searchPOI.mockResolvedValueOnce({
      pois: [
        { id: 'first', distance: 900 },
        { id: 'second', distance: 10 },
      ],
    });
    const input = {
      ...keyword,
      center: { latitude: 0, longitude: 180 },
      sortByDistance,
    };
    const pending = searchByKeyword(input);
    input.center.latitude = 40;
    expect(await pending).toMatchObject({
      status: 'success',
      data: { items: [{ id: 'first' }, { id: 'second' }] },
    });
    expect(mockSdk.searchPOI.mock.calls).toEqual([
      [
        {
          keyword: '',
          pageNum: 100,
          pageSize: 1,
          center: { latitude: 0, longitude: 180 },
          sortByDistance,
        },
      ],
    ]);
  },
);

test.each([
  undefined,
  null,
  {},
  { ...keyword, keyword: 0 },
  { ...keyword, city: null },
  { ...keyword, categories: [null] },
  { ...keyword, pageSize: 1.5 },
  { ...keyword, page: 101 },
  { ...keyword, center: null },
  { ...keyword, center: { latitude: 0, longitude: 181 } },
  { ...keyword, sortByDistance: true },
  { ...keyword, sortByDistance: 'true' },
])('关键词拒绝错误输入 %#', async (input) => {
  await expect(
    searchByKeyword(input as SearchByKeywordInput),
  ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
  expect(mockSdk.searchPOI).not.toHaveBeenCalled();
});
test.each([null, undefined, '', 3])(
  '详情拒绝非字符串或空ID %#',
  async (input) => {
    await expect(getPoiById(input as string)).resolves.toMatchObject({
      error: { reason: 'invalid_input' },
    });
    expect(mockSdk.getPoiDetail).not.toHaveBeenCalled();
  },
);
test.each([
  null,
  {},
  { ...reverse, location: null },
  { ...reverse, includeExtensions: 1 },
  { ...reverse, radiusMeters: 3001 },
  { ...reverse, radiusMeters: -1 },
  { ...reverse, radiusMeters: NaN },
])('逆地理拒绝错误输入 %#', async (input) => {
  await expect(
    reverseGeocode(input as ReverseGeocodeInput),
  ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
  expect(mockSdk.reGeocode).not.toHaveBeenCalled();
});
const cancellable = [
  [
    'around',
    (signal: AbortSignal) => searchAround(around, { signal }),
    mockSdk.searchNearby,
  ],
  [
    'keyword',
    (signal: AbortSignal) => searchByKeyword(keyword, { signal }),
    mockSdk.searchPOI,
  ],
  [
    'detail',
    (signal: AbortSignal) => getPoiById('id', { signal }),
    mockSdk.getPoiDetail,
  ],
  [
    'reverse',
    (signal: AbortSignal) => reverseGeocode(reverse, { signal }),
    mockSdk.reGeocode,
  ],
] as const;
test.each(cancellable)(
  '%s 预取消无查询，等待取消吸收迟到拒绝，成功后取消不撤销',
  async (_name, call, sdk) => {
    const controller = new AbortController();
    controller.abort();
    await expect(call(controller.signal)).resolves.toEqual({
      status: 'cancelled',
    });
    expect(sdk).not.toHaveBeenCalled();
    const active = new AbortController();
    let reject!: (error: unknown) => void;
    sdk.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const pending = call(active.signal);
    active.abort();
    await expect(pending).resolves.toEqual({ status: 'cancelled' });
    reject(new Error('late private'));
    await Promise.resolve();
    await Promise.resolve();
    const success = new AbortController();
    const result = await call(success.signal);
    success.abort();
    expect(result).toEqual({ status: 'success', data: {} });
    expect(sdk).toHaveBeenCalledTimes(2);
  },
);
test('两次同类查询反序完成与独立取消，不交付旧结果、不重试', async () => {
  const resolve: Array<(data: unknown) => void> = [];
  mockSdk.searchPOI.mockImplementation(
    () => new Promise((done) => resolve.push(done)),
  );
  const a = new AbortController();
  const first = searchByKeyword(keyword, { signal: a.signal });
  const second = searchByKeyword({ ...keyword, keyword: 'second' });
  a.abort();
  resolve[1]({ pois: [{ name: 'second' }] });
  resolve[0]({ pois: [{ name: 'old' }] });
  await expect(first).resolves.toEqual({ status: 'cancelled' });
  await expect(second).resolves.toEqual({
    status: 'success',
    data: { items: [{ name: 'second' }] },
  });
  expect(mockSdk.searchPOI).toHaveBeenCalledTimes(2);
});

test('无效分类在适配前拒绝，不执行分类对象的字符串转换', async () => {
  const badCategory = {
    toString: () => {
      throw new Error('must not coerce');
    },
  };
  for (const categories of [[Symbol('invalid')], [badCategory]]) {
    await expect(
      searchAround({ ...around, categories } as unknown as SearchAroundInput),
    ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
    await expect(
      searchByKeyword({
        ...keyword,
        categories,
      } as unknown as SearchByKeywordInput),
    ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
  }
  expect(mockSdk.searchNearby).not.toHaveBeenCalled();
  expect(mockSdk.searchPOI).not.toHaveBeenCalled();
});
