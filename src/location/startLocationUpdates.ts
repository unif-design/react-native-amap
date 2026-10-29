import { createOperationContext } from '@unif/react-native-logger';
import { Platform } from 'react-native';
import { getLocationSdk } from './getLocationSdk';
import {
  locationFailed,
  validInterval,
  validObserver,
} from './prepareLocation';
import { ensureLocationPermission } from './ensureLocationPermission';
import { convertLocation } from './convertLocation';
import { diagnoseLocation } from './diagnoseLocation';
import type {
  StartLocationUpdatesInput,
  StartLocationUpdatesResult,
  LocationUpdatesObserver,
  LocationCallOptions,
  LocationUpdatesStopReason,
  LocationUpdates,
} from './types';

// 这里只管理 SDK 的一份持续资源；单次定位不读写本归属。
let stopCurrent: ((reason: LocationUpdatesStopReason) => void) | undefined;
let cancelPending: (() => void) | undefined;

export async function startLocationUpdates(
  input: StartLocationUpdatesInput,
  observer: LocationUpdatesObserver,
  options?: LocationCallOptions,
): Promise<StartLocationUpdatesResult> {
  if (!input || !validInterval(input.intervalMs) || !validObserver(observer))
    return locationFailed('invalid_input');
  const signal = options?.signal;
  if (signal?.aborted) return { status: 'cancelled' };
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    return locationFailed('unsupported');
  const context = createOperationContext('system');
  let sdk: ReturnType<typeof getLocationSdk>;
  try {
    sdk = getLocationSdk();
    if (!sdk.isSDKInitialized() || !sdk.getPrivacyStatus().isReady)
      return locationFailed('unavailable');
  } catch (error) {
    diagnoseLocation('prepare', context, error);
    return locationFailed('unavailable');
  }
  return new Promise((resolve) => {
    let settled = false;
    let active = true;
    let ownsResource = false;
    let settingUp = false;
    let cleaned = false;
    let subscription: ReturnType<typeof sdk.addLocationListener> | undefined;
    let stopReason: LocationUpdatesStopReason | undefined;
    function finish(result: StartLocationUpdatesResult) {
      if (settled) return;
      settled = true;
      if (cancelPending === cancel) cancelPending = undefined;
      if (result.status !== 'subscribed')
        signal?.removeEventListener('abort', cancel);
      resolve(result);
    }
    function flushCleanup() {
      if (active || settingUp || cleaned || !ownsResource) return;
      cleaned = true;
      // SDK 注册同步交付事件时，要等返回移除句柄后再收尾。
      try {
        subscription?.remove();
      } catch (error) {
        diagnoseLocation('remove_listener', context, error);
      }
      try {
        sdk.stop();
      } catch (error) {
        diagnoseLocation('stop', context, error);
      }
      if (stopReason) {
        try {
          observer.onStopped?.(stopReason);
        } catch (error) {
          diagnoseLocation('observer_stopped', context, error);
        }
      }
    }
    function end(reason?: LocationUpdatesStopReason) {
      if (!active) return;
      active = false;
      stopReason = reason;
      signal?.removeEventListener('abort', cancel);
      if (stopCurrent === end) stopCurrent = undefined;
      flushCleanup();
    }
    function cancel() {
      end('cancelled');
      finish({ status: 'cancelled' });
    }
    const updates: LocationUpdates = {
      stop: () => end('stopped'),
      setInterval: (intervalMs) => {
        if (!active || stopCurrent !== end) return { status: 'inactive' };
        if (!validInterval(intervalMs)) return locationFailed('invalid_input');
        try {
          sdk.setInterval(intervalMs);
          return { status: 'requested' };
        } catch (error) {
          diagnoseLocation('interval', context, error);
          return locationFailed('unavailable');
        }
      },
    };
    cancelPending?.();
    cancelPending = cancel;
    signal?.addEventListener('abort', cancel);
    (async () => {
      try {
        const granted = await ensureLocationPermission(() => active);
        if (!active) return;
        if (!granted) {
          end();
          finish(locationFailed('permission_denied'));
          return;
        }
        stopCurrent?.('replaced');
        // onStopped 可以重入，后来的有效开始永久取代本候选。
        if (!active) return;
        ownsResource = true;
        stopCurrent = end;
        settingUp = true;
        try {
          subscription = sdk.addLocationListener((raw) => {
            if (!active) return;
            const location = convertLocation(raw);
            if (!location) {
              diagnoseLocation('invalid_coordinates', context);
              return;
            }
            try {
              observer.onLocation(location);
            } catch (error) {
              diagnoseLocation('observer_location', context, error);
            }
          });
          if (active) sdk.setLocatingWithReGeocode(false);
          if (active) sdk.setInterval(input.intervalMs);
          if (active) sdk.start();
        } finally {
          settingUp = false;
          flushCleanup();
        }
        if (active) finish({ status: 'subscribed', updates });
      } catch (error) {
        diagnoseLocation('subscribe', context, error);
        end();
        finish(locationFailed('unavailable'));
      }
    })();
  });
}
