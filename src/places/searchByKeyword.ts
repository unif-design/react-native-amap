import { executePlaceQuery } from './executePlaceQuery';
import {
  snapshotPlaceInput,
  placeCoordinates,
  validSearch,
  categoryCondition,
  omitUndefined,
} from './preparePlaceQuery';
import { convertPlacePage } from './convertPlaces';
import type {
  SearchByKeywordInput,
  PlaceSearchPage,
  PlaceQueryOptions,
  PlaceQueryResult,
} from './types';
export function searchByKeyword(
  value: SearchByKeywordInput,
  options?: PlaceQueryOptions,
): Promise<PlaceQueryResult<PlaceSearchPage>> {
  const input = snapshotPlaceInput(value);
  const center = placeCoordinates(input.center);
  const valid =
    validSearch(input) &&
    (input.city === undefined || typeof input.city === 'string') &&
    (input.center === undefined || !!center) &&
    (input.sortByDistance === undefined ||
      typeof input.sortByDistance === 'boolean') &&
    (input.sortByDistance !== true || !!center);
  const args = omitUndefined({
    keyword: input.keyword as string,
    city: input.city as string | undefined,
    types: categoryCondition(input),
    pageNum: input.page as number,
    pageSize: input.pageSize as number,
    center,
    sortByDistance: input.sortByDistance as boolean | undefined,
  });
  return executePlaceQuery(
    'searchByKeyword',
    valid,
    (sdk) => sdk.searchPOI(args),
    convertPlacePage,
    options,
  );
}
