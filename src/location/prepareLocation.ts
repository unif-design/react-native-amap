import { LOCATION_ERROR_MESSAGES, MAX_INTERVAL_MS } from './constants';
import type {
  LocationErrorReason,
  LocationFailed,
  LocationUpdatesObserver,
} from './types';
export function locationFailed(reason: LocationErrorReason): LocationFailed {
  return {
    status: 'failed',
    error: { reason, message: LOCATION_ERROR_MESSAGES[reason] },
  };
}
export function validInterval(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_INTERVAL_MS
  );
}
export function validObserver(observer: LocationUpdatesObserver): boolean {
  return (
    !!observer &&
    typeof observer.onLocation === 'function' &&
    (observer.onStopped === undefined ||
      typeof observer.onStopped === 'function')
  );
}
