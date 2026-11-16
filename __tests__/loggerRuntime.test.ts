import { diagnoseLocation } from '@amap/location/diagnoseLocation';
import { executePlaceQuery } from '@amap/places/executePlaceQuery';
import {
  createOperationContext,
  installLogging,
} from '@unif/react-native-logger';
import type { LogFileStore, LogWrite } from '@unif/react-native-logger';

jest.mock('expo-gaode-map', () => ({
  ExpoGaodeMapModule: { isSDKInitialized: () => true },
}));

afterEach(() => {
  jest.useRealTimers();
});

test('正式 Logger 将定位与地点查询的诊断投影延后，业务失败先结束且保留关联字段', async () => {
  jest.useFakeTimers();
  const writes: LogWrite[] = [];
  const files: LogFileStore = {
    setOwner: async () => {},
    append: (entry) => {
      writes.push(entry);
    },
    flush: async () => {},
    getStatus: () => ({
      storageMode: 'memory',
      state: 'ready',
      writable: true,
      bufferedBytes: 0,
      droppedCount: 0,
      corruptedLines: 0,
      lastFailureCode: null,
    }),
    readSummary: async () => ({ fileCount: 0, bytes: 0 }),
    clear: async () => ({ status: 'success' }),
    createSnapshot: async () => ({
      id: 'unused',
      bytes: 0,
      identityEpoch: 'unused',
    }),
    readSnapshot: async () => '',
    releaseSnapshot: async () => {},
    takeSnapshotFile: async () => ({
      uri: 'unused',
      bytes: 0,
      release: async () => {},
    }),
    dispose: () => {},
  };
  let sequence = 0;
  const logger = installLogging({
    policy: {
      service: 'amap',
      allowedFields: ['sdkType', 'errorName'],
      startupScopes: [],
    },
    environment: {
      appVersion: 'test',
      platform: 'ios',
      osVersion: 'test',
      development: true,
    },
    files,
    createId: () => `amap-test-${++sequence}`,
  });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const ownerBinding = logger.setOwner(null);
    await jest.runAllTimersAsync();
    await ownerBinding;
    const read = jest.fn(Reflect.getOwnPropertyDescriptor);
    const error = new Proxy(
      {
        type: 'PERMISSION_DENIED',
        name: 'Error',
        message: 'private-location',
      },
      { getOwnPropertyDescriptor: read },
    );
    const context = createOperationContext('system');
    diagnoseLocation('current', context, error);
    const result = await executePlaceQuery(
      'searchAround',
      true,
      async () => {
        throw error;
      },
      (value) => value,
    );
    expect(result).toMatchObject({
      status: 'failed',
      error: { reason: 'unavailable' },
    });
    expect(read).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
    const flushed = logger.flush();
    await jest.runAllTimersAsync();
    await flushed;
    expect(read).toHaveBeenCalled();
    const records = writes.map((entry) => JSON.parse(entry.line));
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'location.unavailable',
          operationId: context.operationId,
          phase: 'current',
          fields: { sdkType: 'PERMISSION_DENIED', errorName: 'Error' },
        }),
        expect.objectContaining({
          event: 'places.unavailable',
          phase: 'searchAround.query',
          fields: { errorName: 'Error' },
        }),
      ]),
    );
    expect(JSON.stringify(records)).not.toContain('private-location');
  } finally {
    logger.dispose();
    warning.mockRestore();
  }
});
