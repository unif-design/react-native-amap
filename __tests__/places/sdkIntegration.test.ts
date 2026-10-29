import {
  searchAround,
  searchByKeyword,
  getPoiById,
  reverseGeocode,
} from '@amap/places';
const { loadPublicSdk } = require('./publicSdkFixture');
let mockSdk: typeof import('expo-gaode-map');
jest.mock(
  'expo-gaode-map',
  () => new Proxy({}, { get: (_target, key) => Reflect.get(mockSdk, key) }),
);
test('真实SDK初始化状态和四操作JS接线至Expo边界，转换和单次请求成立', async () => {
  const native = {
    getPrivacyStatus: jest.fn(() => ({ isReady: true })),
    initSDK: jest.fn(),
    setPrivacyConfig: jest.fn(),
    getCurrentLocation: jest.fn(),
    requestLocationPermission: jest.fn(),
  };
  const pending: Array<(value: unknown) => void> = [];
  const search = {
    searchNearby: jest.fn(
      (_input: unknown) => new Promise((resolve) => pending.push(resolve)),
    ),
    searchPOI: jest.fn(
      (_input: unknown) => new Promise((resolve) => pending.push(resolve)),
    ),
    getPoiDetail: jest.fn(
      (_input: unknown) => new Promise((resolve) => pending.push(resolve)),
    ),
    reGeocode: jest.fn(
      (_input: unknown) => new Promise((resolve) => pending.push(resolve)),
    ),
    initSearch: jest.fn(),
  };
  mockSdk = loadPublicSdk(native, search);
  mockSdk.ErrorLogger.setEnabled(false);
  await expect(getPoiById('before-init')).resolves.toMatchObject({
    error: { reason: 'unavailable' },
  });
  expect(search.getPoiDetail).not.toHaveBeenCalled();
  mockSdk.ExpoGaodeMapModule.initSDK({ iosKey: 'fixture-only' });
  const a = searchAround({
    center: { latitude: 0, longitude: 0 },
    radiusMeters: 0,
    keyword: '',
    categories: ['a', 'b'],
    page: 2,
    pageSize: 25,
  });
  const b = searchByKeyword({
    keyword: '',
    city: '',
    page: 100,
    pageSize: 1,
    center: { latitude: 0, longitude: 180 },
    sortByDistance: true,
  });
  const c = getPoiById('id');
  const d = reverseGeocode({
    location: { latitude: 0, longitude: 0 },
    radiusMeters: 0,
    includeExtensions: false,
  });
  expect(search.searchNearby.mock.calls).toEqual([
    [
      {
        center: { latitude: 0, longitude: 0 },
        radius: 0,
        keyword: '',
        types: 'a|b',
        pageNum: 2,
        pageSize: 25,
      },
    ],
  ]);
  expect(search.searchPOI.mock.calls).toEqual([
    [
      {
        keyword: '',
        city: '',
        pageNum: 100,
        pageSize: 1,
        center: { latitude: 0, longitude: 180 },
        sortByDistance: true,
      },
    ],
  ]);
  expect(search.getPoiDetail.mock.calls).toEqual([['id']]);
  expect(search.reGeocode.mock.calls).toEqual([
    [
      {
        location: { latitude: 0, longitude: 0 },
        radius: 0,
        requireExtension: false,
      },
    ],
  ]);
  pending[3]({ formattedAddress: '', pois: [{ name: 'ignored' }] });
  pending[2]({ id: '', typeDes: 'detail', location: { latitude: 0 } });
  pending[1]({ pois: [] });
  pending[0]({
    pois: [{ name: '', distance: -1 }, null],
    total: 0,
    pageNum: 2,
  });
  await expect(a).resolves.toEqual({
    status: 'success',
    data: { items: [{ name: '' }, {}], total: 0, page: 2 },
  });
  await expect(b).resolves.toEqual({ status: 'success', data: { items: [] } });
  await expect(c).resolves.toEqual({
    status: 'success',
    data: { id: '', typeDescription: 'detail', location: { latitude: 0 } },
  });
  await expect(d).resolves.toEqual({
    status: 'success',
    data: { formattedAddress: '' },
  });
  expect(native.initSDK).toHaveBeenCalledTimes(1);
  expect(native.setPrivacyConfig).not.toHaveBeenCalled();
  expect(native.getCurrentLocation).not.toHaveBeenCalled();
  expect(native.requestLocationPermission).not.toHaveBeenCalled();
  expect(search.initSearch).not.toHaveBeenCalled();
});
