import * as current from '@amap/location/getCurrentLocation.web';
import * as updates from '@amap/location/startLocationUpdates.web';
jest.mock('expo-gaode-map', () => {
  throw Error('Web 不应载入 SDK');
});
jest.mock('react-native-permissions', () => {
  throw Error('Web 不应载入原生权限');
});
test('Web 校验输入及预取消后返回 unsupported，无原生图', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    current.getCurrentLocation({ includeAddress: false }),
  ).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'unsupported' },
  });
  await expect(
    current.getCurrentLocation(
      { includeAddress: false },
      { signal: controller.signal },
    ),
  ).resolves.toEqual({ status: 'cancelled' });
  await expect(current.getCurrentLocation({} as never)).resolves.toMatchObject({
    error: { reason: 'invalid_input' },
  });
  await expect(
    updates.startLocationUpdates({ intervalMs: 0 }, { onLocation() {} }),
  ).resolves.toMatchObject({ error: { reason: 'unsupported' } });
  await expect(
    updates.startLocationUpdates({ intervalMs: -1 }, { onLocation() {} }),
  ).resolves.toMatchObject({ error: { reason: 'invalid_input' } });
});
