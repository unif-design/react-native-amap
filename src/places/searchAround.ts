import { executePlaceQuery } from './executePlaceQuery';
import { PLACE_QUERY_LIMITS } from './constants';
import {
  snapshotPlaceInput,
  placeCoordinates,
  validInteger,
  validSearch,
  categoryCondition,
  omitUndefined,
} from './preparePlaceQuery';
import { convertPlacePage } from './convertPlaces';
import type {
  SearchAroundInput,
  PlaceSearchPage,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
export function searchAround(
  value: SearchAroundInput,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<PlaceSearchPage>> {
  const input = snapshotPlaceInput(value);
  const center = placeCoordinates(input.center);
  const valid =
    validSearch(input) &&
    !!center &&
    validInteger(input.radiusMeters, 0, PLACE_QUERY_LIMITS.aroundRadiusMeters);
  const args = omitUndefined({
    center: center!,
    radius: input.radiusMeters as number,
    keyword: input.keyword as string,
    types: categoryCondition(input),
    pageNum: input.page as number,
    pageSize: input.pageSize as number,
  });
  return executePlaceQuery(
    'searchAround',
    valid,
    (sdk) => sdk.searchNearby(args),
    convertPlacePage,
    options,
  );
}
