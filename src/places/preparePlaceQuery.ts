import { PLACE_QUERY_ERROR_MESSAGES, PLACE_QUERY_LIMITS } from './constants';
import type {
  PlaceInputRecord,
  PlaceQueryErrorReason,
  PlaceQueryFailed,
} from './types';
export function placeFailed(reason: PlaceQueryErrorReason): PlaceQueryFailed {
  return {
    status: 'failed',
    error: { reason, message: PLACE_QUERY_ERROR_MESSAGES[reason] },
  };
}
export function record(value: unknown): PlaceInputRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlaceInputRecord)
    : {};
}
export function snapshotPlaceInput(value: unknown): PlaceInputRecord {
  const source = record(value);
  return {
    page: source.page,
    pageSize: source.pageSize,
    keyword: source.keyword,
    city: source.city,
    radiusMeters: source.radiusMeters,
    includeExtensions: source.includeExtensions,
    center:
      source.center === undefined ? undefined : { ...record(source.center) },
    sortByDistance: source.sortByDistance,
    location: { ...record(source.location) },
    categories: Array.isArray(source.categories)
      ? Array.from(source.categories)
      : source.categories,
  };
}
export function validInteger(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}
export function placeCoordinates(value: unknown) {
  const input = record(value);
  if (
    typeof input.latitude !== 'number' ||
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    typeof input.longitude !== 'number' ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    (input.coordinateSystem !== undefined && input.coordinateSystem !== 'GCJ02')
  )
    return undefined;
  return { latitude: input.latitude, longitude: input.longitude };
}
export function validSearch(input: PlaceInputRecord): boolean {
  return (
    typeof input.keyword === 'string' &&
    validInteger(input.page, 1, PLACE_QUERY_LIMITS.page) &&
    validInteger(input.pageSize, 1, PLACE_QUERY_LIMITS.pageSize) &&
    (input.categories === undefined ||
      (Array.isArray(input.categories) &&
        input.categories.every((value) => typeof value === 'string')))
  );
}
export function categoryCondition(input: PlaceInputRecord): string | undefined {
  return Array.isArray(input.categories) &&
    input.categories.every((value) => typeof value === 'string')
    ? input.categories.join('|')
    : undefined;
}
export function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}
