import type * as GaodeSdk from 'expo-gaode-map';
import {
  createLogger,
  createOperationContext,
} from '@unif/react-native-logger';
import { SAFE_ERROR_NAMES } from './constants';
import { placeFailed } from './preparePlaceQuery';
import type {
  PlaceOperation,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
const log = createLogger('places');
export function executePlaceQuery<T>(
  operation: PlaceOperation,
  valid: boolean,
  query: (sdk: typeof GaodeSdk) => Promise<unknown>,
  convert: (value: unknown) => T,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<T>> {
  const context = createOperationContext('system');
  if (options?.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
  if (!valid) return Promise.resolve(placeFailed('invalid_input'));
  return new Promise((resolve) => {
    let settled = false;
    const signal = options?.signal;
    function finish(result: PlaceQueryResult<T>) {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      resolve(result);
    }
    function cancel() {
      finish({ status: 'cancelled' });
    }
    function fail(error: unknown, phase: string) {
      const name =
        error && typeof error === 'object'
          ? Object.getOwnPropertyDescriptor(error, 'name')?.value
          : undefined;
      log.warn('places.unavailable', {
        context,
        phase: `${operation}.${phase}`,
        code: 'places.unavailable',
        fields: {
          errorName:
            typeof name === 'string' && SAFE_ERROR_NAMES.has(name)
              ? name
              : 'unknown',
        },
      });
      finish(placeFailed('unavailable'));
    }
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    try {
      const sdk = require('expo-gaode-map') as typeof GaodeSdk;
      if (!sdk.ExpoGaodeMapModule.isSDKInitialized()) {
        fail(undefined, 'initialize');
        return;
      }
      query(sdk).then(
        (value) => {
          if (settled) return;
          try {
            finish({ status: 'success', data: convert(value) });
          } catch (error) {
            fail(error, 'convert');
          }
        },
        (error) => fail(error, 'query'),
      );
    } catch (error) {
      fail(error, 'query');
    }
  });
}
