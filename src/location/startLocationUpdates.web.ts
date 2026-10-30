import {
  locationFailed,
  validInterval,
  validObserver,
} from './prepareLocation';
import type {
  StartLocationUpdatesInput,
  StartLocationUpdatesResult,
  LocationUpdatesObserver,
  LocationCallOptions,
} from './types';
export async function startLocationUpdates(
  input: StartLocationUpdatesInput,
  observer: LocationUpdatesObserver,
  options?: LocationCallOptions,
): Promise<StartLocationUpdatesResult> {
  if (!input || !validInterval(input.intervalMs) || !validObserver(observer))
    return locationFailed('invalid_input');
  if (options?.signal?.aborted) return { status: 'cancelled' };
  return locationFailed('unsupported');
}
