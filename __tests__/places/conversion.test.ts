import {
  searchAround,
  searchByKeyword,
  getPoiById,
  reverseGeocode,
} from '@amap/places';
const mockSdk = {
  ExpoGaodeMapModule: { isSDKInitialized: () => true },
  searchNearby: jest.fn(),
  searchPOI: jest.fn(),
  getPoiDetail: jest.fn(),
  reGeocode: jest.fn(),
};
jest.mock('expo-gaode-map', () => mockSdk);
const raw = {
  id: 'same',
  name: '',
  address: 'address',
  location: { latitude: 0, longitude: NaN },
  typeCode: '',
  typeDes: 'description',
  tel: 'tel',
  distance: 0,
  cityName: 'city',
  cityCode: 'cc',
  provinceName: 'province',
  adName: 'district',
  adCode: 'dc',
  businessArea: 'ba',
  parkingType: 'parking',
  website: 'web',
  email: 'mail',
  postcode: 'post',
  direction: 'dir',
  hasIndoorMap: false,
  business: {
    opentime: '',
    opentimeToday: 'today',
    rating: '0',
    cost: '',
    parkingType: 'p',
    tag: 't',
    tel: 'tel',
    alias: 'a',
    businessArea: 'b',
  },
  photos: [null, { title: '', url: 'url' }, { url: 9 }],
  indoor: { floor: 0, floorName: '', poiId: 'indoor', hasIndoorMap: false },
  unknown: 'secret',
};
const expected = {
  id: 'same',
  name: '',
  address: 'address',
  location: { latitude: 0 },
  typeCode: '',
  typeDescription: 'description',
  tel: 'tel',
  distanceMeters: 0,
  cityName: 'city',
  cityCode: 'cc',
  provinceName: 'province',
  districtName: 'district',
  districtCode: 'dc',
  businessArea: 'ba',
  parkingType: 'parking',
  website: 'web',
  email: 'mail',
  postcode: 'post',
  direction: 'dir',
  hasIndoorMap: false,
  business: {
    openTime: '',
    openTimeToday: 'today',
    rating: '0',
    cost: '',
    parkingType: 'p',
    tag: 't',
    tel: 'tel',
    alias: 'a',
    businessArea: 'b',
  },
  photos: [{}, { title: '', url: 'url' }, {}],
  indoor: { floor: '0', floorName: '', poiId: 'indoor', hasIndoorMap: false },
};
test('分页、详情与逆地理实际入口共享完整地点转换，保留重复和坏行', async () => {
  mockSdk.searchNearby.mockResolvedValue({
    pois: [raw, null, raw, 7],
    total: 0,
    pageNum: 2,
    pageSize: 3,
    pageCount: 0,
    extra: true,
  });
  mockSdk.searchPOI.mockResolvedValue({
    pois: [raw],
    total: Infinity,
    pageNum: '1',
    pageSize: null,
  });
  mockSdk.getPoiDetail.mockResolvedValue(raw);
  mockSdk.reGeocode.mockResolvedValue({ pois: [raw] });
  await expect(
    searchAround({
      center: { latitude: 0, longitude: 0 },
      radiusMeters: 0,
      keyword: '',
      page: 1,
      pageSize: 3,
    }),
  ).resolves.toEqual({
    status: 'success',
    data: {
      items: [expected, {}, expected, {}],
      total: 0,
      page: 2,
      pageSize: 3,
      pageCount: 0,
    },
  });
  await expect(
    searchByKeyword({ keyword: '', page: 1, pageSize: 1 }),
  ).resolves.toEqual({ status: 'success', data: { items: [expected] } });
  await expect(getPoiById('id')).resolves.toEqual({
    status: 'success',
    data: expected,
  });
  await expect(
    reverseGeocode({
      location: { latitude: 0, longitude: 0 },
      radiusMeters: 0,
      includeExtensions: true,
    }),
  ).resolves.toEqual({ status: 'success', data: { places: [expected] } });
});
test.each([{}, { pois: null }, { pois: [] }, { pois: [null] }, null])(
  '缺列表、实际空列表与坏行分别交付 %#',
  async (rawPage) => {
    mockSdk.searchPOI.mockResolvedValue(rawPage);
    const result = await searchByKeyword({ keyword: '', page: 1, pageSize: 1 });
    const data =
      rawPage && Array.isArray(rawPage.pois)
        ? { items: rawPage.pois.map(() => ({})) }
        : {};
    expect(result).toEqual({ status: 'success', data });
  },
);
test('过滤非法字段但保留地点、部分坐标、文字楼层和合法数值', async () => {
  mockSdk.getPoiDetail.mockResolvedValue({
    name: 'kept',
    location: { latitude: Infinity, longitude: -180 },
    distance: -1,
    hasIndoorMap: 0,
    business: { rating: 4, cost: 0 },
    indoor: { floor: 'B1', hasIndoorMap: true },
    photos: null,
  });
  await expect(getPoiById('id')).resolves.toEqual({
    status: 'success',
    data: {
      name: 'kept',
      location: { longitude: -180 },
      business: {},
      indoor: { floor: 'B1', hasIndoorMap: true },
    },
  });
  mockSdk.getPoiDetail.mockResolvedValue({
    location: { latitude: 91, longitude: 181 },
    indoor: { floor: NaN },
    distance: NaN,
  });
  await expect(getPoiById('id')).resolves.toEqual({
    status: 'success',
    data: { location: {}, indoor: {} },
  });
});
test('完整地址与道路交叉AOI映射，false仅交付基础地址', async () => {
  const address = {
    country: '',
    countryCode: 'CN',
    province: 'p',
    city: 'c',
    district: 'd',
    township: 't',
    towncode: 'tc',
    neighborhood: 'n',
    building: 'b',
    cityCode: 'cc',
    adCode: 'ac',
    streetNumber: {
      street: '',
      number: '0',
      location: { longitude: 0 },
      direction: '',
      distance: 0,
    },
    businessAreas: [null, { name: '', location: { latitude: 0 } }],
  };
  const base = {
    formattedAddress: '',
    addressComponent: {
      country: '',
      countryCode: 'CN',
      province: 'p',
      city: 'c',
      district: 'd',
      township: 't',
      townshipCode: 'tc',
      neighborhood: 'n',
      building: 'b',
      cityCode: 'cc',
      districtCode: 'ac',
      streetNumber: {
        street: '',
        number: '0',
        location: { longitude: 0 },
        direction: '',
        distanceMeters: 0,
      },
      businessAreas: [{}, { name: '', location: { latitude: 0 } }],
    },
  };
  mockSdk.reGeocode.mockResolvedValue({
    formattedAddress: '',
    addressComponent: address,
    pois: [],
    roads: [
      {
        id: 'r',
        name: '',
        location: { longitude: 0 },
        distance: 0,
        direction: '',
      },
      null,
    ],
    roadCrosses: [
      {
        location: { latitude: 0 },
        distance: -1,
        direction: '',
        firstId: '1',
        firstName: '',
        secondId: '2',
        secondName: 'two',
      },
    ],
    aois: [
      { id: 'a', name: '', adCode: 'd', location: { latitude: 0 }, area: 0 },
      null,
    ],
  });
  const input = {
    location: { latitude: 0, longitude: 0 },
    radiusMeters: 3000,
    includeExtensions: false,
  };
  await expect(reverseGeocode(input)).resolves.toEqual({
    status: 'success',
    data: base,
  });
  await expect(
    reverseGeocode({ ...input, includeExtensions: true }),
  ).resolves.toEqual({
    status: 'success',
    data: {
      ...base,
      places: [],
      roads: [
        {
          id: 'r',
          name: '',
          location: { longitude: 0 },
          distanceMeters: 0,
          direction: '',
        },
        {},
      ],
      roadCrosses: [
        {
          location: { latitude: 0 },
          direction: '',
          firstRoadId: '1',
          firstRoadName: '',
          secondRoadId: '2',
          secondRoadName: 'two',
        },
      ],
      areas: [
        {
          id: 'a',
          name: '',
          districtCode: 'd',
          location: { latitude: 0 },
          area: 0,
        },
        {},
      ],
    },
  });
});
