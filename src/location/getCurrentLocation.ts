import { createOperationContext } from '@unif/react-native-logger';
import { Platform } from 'react-native';
import { getLocationSdk } from './getLocationSdk';
import { locationFailed } from './prepareLocation';
import { ensureLocationPermission } from './ensureLocationPermission';
import { convertLocation } from './convertLocation';
import { diagnoseLocation } from './diagnoseLocation';
import type {
  GetCurrentLocationInput,
  GetCurrentLocationResult,
  LocationCallOptions,
} from './types';
export async function getCurrentLocation(
  input: GetCurrentLocationInput,
  options?: LocationCallOptions,
): Promise<GetCurrentLocationResult> {
  if (!input || typeof input.includeAddress !== 'boolean')
    return locationFailed('invalid_input');
  const signal = options?.signal;
  if (signal?.aborted) return { status: 'cancelled' };
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    return locationFailed('unsupported');
  const context = createOperationContext('system');
  return new Promise((resolve) => {
    let settled = false;
    function finish(result: GetCurrentLocationResult) {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', cancel);
      resolve(result);
    }
    function cancel() {
      finish({ status: 'cancelled' });
    }
    signal?.addEventListener('abort', cancel);
    (async () => {
      try {
        const sdk = getLocationSdk();
        if (!sdk.isSDKInitialized() || !sdk.getPrivacyStatus().isReady) {
          finish(locationFailed('unavailable'));
          return;
        }
        const granted = await ensureLocationPermission(() => !settled);
        if (settled) return;
        if (!granted) {
          finish(locationFailed('permission_denied'));
          return;
        }
        const raw = await sdk.getCurrentLocation({
          includeAddress: input.includeAddress,
        });
        if (settled) return;
        const location = convertLocation(raw);
        finish(
          location
            ? { status: 'success', location }
            : locationFailed('invalid_coordinates'),
        );
      } catch (error) {
        diagnoseLocation('current', context, error);
        finish(locationFailed('unavailable'));
      }
    })();
  });
}
