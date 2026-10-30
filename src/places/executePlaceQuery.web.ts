import { placeFailed } from './preparePlaceQuery';
import type {
  PlaceOperation,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
export function executePlaceQuery<T>(
  _operation: PlaceOperation,
  valid: boolean,
  _query: unknown,
  _convert: unknown,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<T>> {
  if (options?.signal?.aborted) return Promise.resolve({ status: 'cancelled' });
  return Promise.resolve(placeFailed(valid ? 'unsupported' : 'invalid_input'));
}
