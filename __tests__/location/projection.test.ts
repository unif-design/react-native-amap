import { projectLocationObservation } from '@amap/location/projectLocationObservation';

jest.mock('expo-gaode-map', () => {
  throw Error('纯位置投影不应载入 SDK');
});

test('投影保留合法零值、空地址和实际来源，并丢弃非法可选字段', () => {
  expect(
    projectLocationObservation({
      latitude: 0,
      longitude: -180,
      coordinateSystem: 'GCJ02',
      timestampMs: 0,
      accuracyMeters: 0,
      altitudeMeters: -3,
      headingDegrees: 360,
      speedMetersPerSecond: -1,
      trustedLevel: 0,
      isMock: false,
      isSimulatedBySoftware: false,
      isProducedByAccessory: true,
      address: {
        formattedAddress: '',
        city: '',
        street: 1,
        unknown: 'ignored',
      },
      extra: 'ignored',
    }),
  ).toEqual({
    latitude: 0,
    longitude: -180,
    coordinateSystem: 'GCJ02',
    timestampMs: 0,
    accuracyMeters: 0,
    altitudeMeters: -3,
    trustedLevel: 0,
    isMock: false,
    isSimulatedBySoftware: false,
    isProducedByAccessory: true,
    address: { formattedAddress: '', city: '' },
  });
});

test.each([
  undefined,
  null,
  [],
  {},
  { latitude: NaN, longitude: 0 },
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: -181 },
])('投影拒绝没有合法经纬度的值 %#', (value) => {
  expect(projectLocationObservation(value)).toBeUndefined();
});

test('投影省略缺少的可选字段并返回独立地址快照', () => {
  const address = { province: '浙江省' };
  const value = { latitude: 30, longitude: 120, address };
  const projected = projectLocationObservation(value);

  expect(projected).toEqual({
    latitude: 30,
    longitude: 120,
    address: { province: '浙江省' },
  });
  expect(projected).not.toBe(value);
  expect(projected?.address).not.toBe(address);

  address.province = '已修改';
  expect(projected?.address?.province).toBe('浙江省');
});
