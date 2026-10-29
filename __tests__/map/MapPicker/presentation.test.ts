import { getCurrentLocation } from '@amap/location';
import type { GetCurrentLocationResult } from '@amap/location';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import { deferred, flush } from './runtimeFixtures';
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));

test('初始定位 busy 来自实际单次调用，暂停接收在有效重放后采用', async () => {
  const wait = deferred<GetCurrentLocationResult>();
  jest.mocked(getCurrentLocation).mockReturnValue(wait.promise);
  const session = createMapPickerSession(
    { initialLocationRequest: { includeAddress: false } },
    jest.fn(),
  );
  expect(session.store.getState().initialLocationPending).toBe(false);
  session.activate();
  expect(session.store.getState().initialLocationPending).toBe(true);
  wait.resolve({ status: 'cancelled' });
  session.deactivate();
  session.activate();
  await flush();
  expect(session.store.getState().initialLocationPending).toBe(false);
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
});
test('真正结束清除初始定位 busy，迟到成功和局部展示错误不能再次更新', async () => {
  const wait = deferred<GetCurrentLocationResult>();
  jest.mocked(getCurrentLocation).mockReturnValue(wait.promise);
  const session = createMapPickerSession(
    { initialLocationRequest: { includeAddress: false } },
    jest.fn(),
  );
  session.activate();
  session.deactivate();
  session.reportOperationError();
  expect(session.store.getState().localError).toBeNull();
  await flush();
  expect(session.store.getState().initialLocationPending).toBe(false);
  const ended = session.store.getState();
  wait.resolve({ status: 'cancelled' });
  await flush();
  session.reportOperationError();
  expect(session.store.getState()).toBe(ended);
});
test('有效性投影与核心输入判定同源，非法输入不启动定位', () => {
  const result = jest.fn();
  const session = createMapPickerSession(
    {
      initialQueryCenter: { latitude: NaN, longitude: 0 },
      initialLocationRequest: { includeAddress: false },
    },
    result,
  );
  expect(session.validInput).toBe(false);
  session.activate();
  expect(getCurrentLocation).not.toHaveBeenCalled();
  expect(session.store.getState().initialLocationPending).toBe(false);
  expect(result).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'failed' }),
  );
});
