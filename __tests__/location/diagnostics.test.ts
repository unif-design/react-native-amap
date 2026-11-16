import { diagnoseLocation } from '@amap/location/diagnoseLocation';
import type { OperationContext } from '@unif/react-native-logger';
const mockWarn = jest.fn();
jest.mock('@unif/react-native-logger', () => ({
  createLogger: () => ({ warn: (...args: unknown[]) => mockWarn(...args) }),
}));
const context: OperationContext = {
  runId: 'fixture-run',
  operationId: 'fixture-operation',
  identityEpoch: 'fixture-epoch',
  trigger: 'system',
  startedAt: 0,
};

test('观察者异常与非法样本保留原归属，不记成 SDK unavailable', () => {
  diagnoseLocation('observer_location', context, Error('private message'));
  expect(mockWarn).toHaveBeenCalledWith(
    'location.observer_failed',
    expect.any(Function),
  );
  expect(mockWarn.mock.lastCall![1]()).toMatchObject({
    context,
    phase: 'observer_location',
    code: 'location.observer_failed',
  });
  diagnoseLocation('invalid_coordinates', context);
  expect(mockWarn).toHaveBeenLastCalledWith(
    'location.invalid_coordinates',
    expect.any(Function),
  );
  expect(mockWarn.mock.lastCall![1]()).toMatchObject({
    code: 'location.invalid_coordinates',
  });
});

test('诊断仅保留已知 SDK 分类和错误名，不读取 getter 或输出敏感对象与 message', () => {
  const getter = jest.fn(() => {
    throw Error('private');
  });
  const error = Object.assign(Error('private-position-and-key'), {
    type: 'PERMISSION_DENIED',
    name: 'GaodeMapError',
    latitude: 31.1234,
    Config: { key: 'private-key' },
  });
  Object.defineProperty(error, 'code', { get: getter });
  diagnoseLocation('current', context, error);
  expect(getter).not.toHaveBeenCalled();
  expect(mockWarn).toHaveBeenCalledWith(
    'location.unavailable',
    expect.any(Function),
  );
  const metadata = mockWarn.mock.lastCall![1]();
  expect(metadata).toEqual({
    context,
    phase: 'current',
    code: 'location.unavailable',
    fields: { sdkType: 'PERMISSION_DENIED', errorName: 'GaodeMapError' },
  });
  expect(JSON.stringify(metadata)).not.toMatch(/private|31\.1234|Config/);
});

test('日志专用错误投影提交后才执行，不占用调用者控制流', () => {
  const read = jest.fn(Reflect.getOwnPropertyDescriptor);
  const error = new Proxy(
    { type: 'PERMISSION_DENIED', name: 'GaodeMapError' },
    {
      getOwnPropertyDescriptor: read,
    },
  );
  diagnoseLocation('current', context, error);
  expect(read).not.toHaveBeenCalled();
  const metadata = mockWarn.mock.lastCall?.[1];
  expect(typeof metadata).toBe('function');
  expect(metadata()).toMatchObject({
    context,
    phase: 'current',
    fields: { sdkType: 'PERMISSION_DENIED', errorName: 'GaodeMapError' },
  });
  expect(read).toHaveBeenCalled();
});
