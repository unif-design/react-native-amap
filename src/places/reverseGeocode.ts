import { executePlaceQuery } from './executePlaceQuery';
import { PLACE_QUERY_LIMITS } from './constants';
import {
  snapshotPlaceInput,
  placeCoordinates,
  validInteger,
} from './preparePlaceQuery';
import { convertReverseGeocode } from './convertPlaces';
import type {
  ReverseGeocodeInput,
  ReverseGeocodeData,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
export function reverseGeocode(
  value: ReverseGeocodeInput,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<ReverseGeocodeData>> {
  const input = snapshotPlaceInput(value);
  const location = placeCoordinates(input.location);
  const valid =
    !!location &&
    validInteger(
      input.radiusMeters,
      0,
      PLACE_QUERY_LIMITS.reverseRadiusMeters,
    ) &&
    typeof input.includeExtensions === 'boolean';
  const includeExtensions = input.includeExtensions === true;
  const args = {
    location: location!,
    radius: input.radiusMeters as number,
    requireExtension: includeExtensions,
  };
  return executePlaceQuery(
    'reverseGeocode',
    valid,
    (sdk) => sdk.reGeocode(args),
    (result) => convertReverseGeocode(result, includeExtensions),
    options,
  );
}
