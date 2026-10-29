import { Platform } from 'react-native';
import {
  checkMultiple,
  requestMultiple,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
import type { Permission, PermissionStatus } from 'react-native-permissions';
import { initializeGaode } from '@amap/initialization';
import { getPermissionAccess } from '@amap/host/permissions';
import { getCurrentLocation, startLocationUpdates } from '@amap/location';
import type { ReGeocode } from 'expo-gaode-map';
const { loadPublicSdk } = require('./publicSdkFixture');
let mockErrorLogger: typeof import('expo-gaode-map').ErrorLogger;
let mockSdk: typeof import('expo-gaode-map').ExpoGaodeMapModule;
jest.mock('expo-gaode-map', () => ({
  get ErrorLogger() {
    return mockErrorLogger;
  },
  get ExpoGaodeMapModule() {
    return mockSdk;
  },
}));
const pending: Array<(value: ReGeocode) => void> = [];
let deliver: (value: ReGeocode) => void;
const native = {
  getPrivacyStatus: jest.fn(() => ({ isReady: true })),
  initSDK: jest.fn(),
  setPrivacyConfig: jest.fn(),
  setInterval: jest.fn(),
  setLocatingWithReGeocode: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  addListener: jest.fn((_name: string, listener: typeof deliver) => {
    deliver = listener;
    return { remove: jest.fn() };
  }),
  getCurrentLocation: jest.fn(
    (_input: unknown) =>
      new Promise<ReGeocode>((resolve) => pending.push(resolve)),
  ),
};
function permissionsResult(
  permissions: Permission[],
  status: PermissionStatus,
) {
  return Object.fromEntries(permissions.map((p) => [p, status])) as Record<
    Permission,
    PermissionStatus
  >;
}

test('真实宿主权限和定位共享申请 queue 及 Android blocked 确证，SDK 公共 JS 接到 Expo 边界', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
  ({ ExpoGaodeMapModule: mockSdk, ErrorLogger: mockErrorLogger } =
    loadPublicSdk(native));
  const vendorWarning = jest
    .spyOn(console, 'warn')
    .mockImplementation(() => {});
  const services = {
    permissions: getPermissionAccess(),
    acceptPrivacy: () => initializeGaode({ androidKey: 'fixture-android' }),
  };
  expect(services.permissions).toBe(getPermissionAccess());
  services.acceptPrivacy();
  expect(native.initSDK).toHaveBeenCalledWith({
    androidKey: 'fixture-android',
  });
  expect(mockSdk.isSDKInitialized()).toBe(true);
  let finishRequest!: () => void;
  let entered!: () => void;
  const requesting = new Promise<void>((resolve) => {
    entered = resolve;
  });
  jest
    .mocked(checkMultiple)
    .mockImplementation(async (permissions) =>
      permissionsResult(permissions, RESULTS.DENIED),
    );
  jest.mocked(requestMultiple).mockImplementationOnce((permissions) => {
    entered();
    return new Promise((resolve) => {
      finishRequest = () =>
        resolve(permissionsResult(permissions, RESULTS.BLOCKED));
    });
  });
  const settingsRequest = services.permissions.request('location');
  await requesting;
  const locate = getCurrentLocation({ includeAddress: false });
  expect(checkMultiple).toHaveBeenCalledTimes(1);
  finishRequest();
  await settingsRequest;
  await expect(locate).resolves.toMatchObject({
    error: { reason: 'permission_denied' },
  });
  expect(requestMultiple).toHaveBeenCalledTimes(1);
  expect(native.getCurrentLocation).not.toHaveBeenCalled();
  await expect(services.permissions.read(['location'])).resolves.toMatchObject([
    { status: 'blocked' },
  ]);
  jest.mocked(checkMultiple).mockImplementation(async (permissions) => ({
    ...permissionsResult(permissions, RESULTS.DENIED),
    [PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION]: RESULTS.GRANTED,
  }));
  const observations = jest.fn();
  const watching = await startLocationUpdates(
    { intervalMs: 0 },
    { onLocation: observations },
  );
  expect(watching.status).toBe('subscribed');
  expect(native.setLocatingWithReGeocode).toHaveBeenCalledWith(false);
  let started!: () => void;
  const startedBoth = new Promise<void>((resolve) => {
    started = resolve;
  });
  native.getCurrentLocation.mockImplementation((input) => {
    expect(input).toHaveProperty('includeAddress');
    const result = new Promise<ReGeocode>((resolve) => pending.push(resolve));
    if (pending.length === 2) started();
    return result;
  });
  const addressed = getCurrentLocation({ includeAddress: true });
  const plain = getCurrentLocation({ includeAddress: false });
  await startedBoth;
  deliver({ latitude: 0, longitude: 0 });
  pending[1]({ latitude: 1, longitude: 2 });
  await expect(plain).resolves.toEqual({
    status: 'success',
    location: { latitude: 1, longitude: 2 },
  });
  pending[0]({ latitude: 3, longitude: 4, address: '' });
  await expect(addressed).resolves.toEqual({
    status: 'success',
    location: { latitude: 3, longitude: 4, address: { formattedAddress: '' } },
  });
  expect(observations).toHaveBeenCalledWith({ latitude: 0, longitude: 0 });
  expect(native.stop).not.toHaveBeenCalled();
  expect(native.getCurrentLocation.mock.calls).toEqual([
    [{ includeAddress: true }],
    [{ includeAddress: false }],
  ]);
  native.stop.mockImplementationOnce(() => {
    throw Error('private-location-and-key');
  });
  if (watching.status === 'subscribed') watching.updates.stop();
  expect(vendorWarning).not.toHaveBeenCalled();
  expect(native.stop).toHaveBeenCalledTimes(1);
});
