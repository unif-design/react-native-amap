import { executePlaceQuery } from './executePlaceQuery';
import { convertPlace } from './convertPlaces';
import type {
  PlaceReadView,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
export function getPoiById(
  id: string,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<PlaceReadView>> {
  return executePlaceQuery(
    'getPoiById',
    typeof id === 'string' && id.length > 0,
    (sdk) => sdk.getPoiDetail(id),
    convertPlace,
    options,
  );
}
