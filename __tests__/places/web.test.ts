import {
  searchAround,
  searchByKeyword,
  getPoiById,
  reverseGeocode,
} from '@amap/places';
jest.mock('@amap/places/executePlaceQuery', () =>
  jest.requireActual('@amap/places/executePlaceQuery.web'),
);
jest.mock('expo-gaode-map', () => {
  throw new Error('Web must not load map SDK');
});
const calls = [
  [
    'around',
    (signal?: AbortSignal) =>
      searchAround(
        {
          center: { latitude: 0, longitude: 0 },
          radiusMeters: 0,
          keyword: '',
          page: 1,
          pageSize: 1,
        },
        { signal },
      ),
    () => searchAround({} as never),
  ],
  [
    'keyword',
    (signal?: AbortSignal) =>
      searchByKeyword({ keyword: '', page: 1, pageSize: 1 }, { signal }),
    () => searchByKeyword({} as never),
  ],
  [
    'detail',
    (signal?: AbortSignal) => getPoiById('id', { signal }),
    () => getPoiById(''),
  ],
  [
    'reverse',
    (signal?: AbortSignal) =>
      reverseGeocode(
        {
          location: { latitude: 0, longitude: 0 },
          radiusMeters: 0,
          includeExtensions: false,
        },
        { signal },
      ),
    () => reverseGeocode({} as never),
  ],
] as const;
test.each(calls)(
  '%s Web校验和预取消先于unsupported，不加载SDK',
  async (_name, call, invalid) => {
    await expect(call()).resolves.toEqual({
      status: 'failed',
      error: { reason: 'unsupported', message: '当前环境不支持地点查询' },
    });
    await expect(invalid()).resolves.toEqual({
      status: 'failed',
      error: { reason: 'invalid_input', message: '地点查询参数不正确' },
    });
    const controller = new AbortController();
    controller.abort();
    await expect(call(controller.signal)).resolves.toEqual({
      status: 'cancelled',
    });
  },
);
