import { locationFailed } from './prepareLocation';
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
  if (options?.signal?.aborted) return { status: 'cancelled' };
  return locationFailed('unsupported');
}
