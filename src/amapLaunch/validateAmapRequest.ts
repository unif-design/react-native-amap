import { createAppError } from '../errors';
import {
  AMAP_CODES,
  AMAP_MESSAGES,
  AMAP_COORDINATE_SYSTEM,
  AMAP_MAX_LATITUDE,
  AMAP_MAX_LONGITUDE,
  AMAP_MAX_ROUTE_MODE,
  AMAP_RIDE_TYPES,
  AMAP_VIA_SEPARATOR,
} from './constants';
import type { AmapLaunchRequest } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validCoordinates(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.coordinateSystem === AMAP_COORDINATE_SYSTEM &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= AMAP_MAX_LATITUDE &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= AMAP_MAX_LONGITUDE
  );
}
function validPoint(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.location === undefined || validCoordinates(value.location)) &&
    (value.name === undefined || validText(value.name)) &&
    (value.poiId === undefined || validText(value.poiId))
  );
}
function validText(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}
function validName(value: unknown): value is string {
  return validText(value) && value.trim().length > 0;
}

export function validateAmapRequest(
  request: Readonly<AmapLaunchRequest>,
  sourceApplication: string,
): void {
  let valid = isRecord(request) && validName(sourceApplication);
  if (valid) {
    switch (request.action) {
      case 'home':
      case 'current_location':
        break;
      case 'marker':
        valid = validCoordinates(request.location) && validName(request.name);
        break;
      case 'navigate':
        valid = validCoordinates(request.destination);
        break;
      case 'ride':
        valid =
          validCoordinates(request.destination) &&
          AMAP_RIDE_TYPES.includes(request.rideType);
        break;
      case 'route':
        valid =
          Number.isInteger(request.mode) &&
          request.mode >= 0 &&
          request.mode <= AMAP_MAX_ROUTE_MODE &&
          (request.start === undefined || validPoint(request.start)) &&
          (request.end === undefined || validPoint(request.end)) &&
          (request.rideType === undefined ||
            AMAP_RIDE_TYPES.includes(request.rideType)) &&
          (request.preferenceCode === undefined ||
            Number.isInteger(request.preferenceCode)) &&
          (request.via === undefined ||
            (Array.isArray(request.via) &&
              Array.from(request.via).every(
                (point) =>
                  isRecord(point) &&
                  validCoordinates(point.location) &&
                  validName(point.name) &&
                  !point.name.includes(AMAP_VIA_SEPARATOR),
              )));
        break;
      default:
        valid = false;
    }
  }
  if (!valid)
    throw createAppError(AMAP_CODES.invalidInput, AMAP_MESSAGES.invalidInput);
}
