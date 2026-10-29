import type {
  AmapLaunchRequest,
  AmapPlatform,
  AmapRoutePoint,
  AmapUriParameters,
} from './types';
import { createAppError } from '../errors';
import {
  AMAP_URIS,
  AMAP_DEV,
  AMAP_RIDE_FEATURE,
  AMAP_VIA_SEPARATOR,
  AMAP_CODES,
  AMAP_MESSAGES,
} from './constants';

function appendRoutePoint(
  parameters: AmapUriParameters,
  prefix: 's' | 'd',
  point?: AmapRoutePoint,
) {
  if (!point) return;
  if (point.location)
    parameters.push(
      [`${prefix}lat`, point.location.latitude],
      [`${prefix}lon`, point.location.longitude],
    );
  if (point.name !== undefined) parameters.push([`${prefix}name`, point.name]);
  if (point.poiId !== undefined) parameters.push([`${prefix}id`, point.poiId]);
}
export function buildAmapUri(
  request: Readonly<AmapLaunchRequest>,
  platform: AmapPlatform,
  sourceApplication: string,
): string {
  const parameters: AmapUriParameters = [
    ['sourceApplication', sourceApplication],
  ];
  switch (request.action) {
    case 'marker':
      parameters.push(
        ['poiname', request.name],
        ['lat', request.location.latitude],
        ['lon', request.location.longitude],
        ['dev', AMAP_DEV],
      );
      break;
    case 'navigate':
    case 'ride':
      if (request.action === 'ride')
        parameters.push(['featureName', AMAP_RIDE_FEATURE]);
      parameters.push(
        ['lat', request.destination.latitude],
        ['lon', request.destination.longitude],
        ['dev', AMAP_DEV],
      );
      if (request.action === 'ride')
        parameters.push(['rideType', request.rideType]);
      break;
    case 'route':
      appendRoutePoint(parameters, 's', request.start);
      appendRoutePoint(parameters, 'd', request.end);
      parameters.push(['dev', AMAP_DEV], ['t', request.mode]);
      if (request.preferenceCode !== undefined)
        parameters.push(['m', request.preferenceCode]);
      if (request.rideType !== undefined)
        parameters.push(['rideType', request.rideType]);
      if (request.via?.length) {
        parameters.push(
          ['vian', request.via.length],
          [
            'vialats',
            request.via
              .map((point) => point.location.latitude)
              .join(AMAP_VIA_SEPARATOR),
          ],
          [
            'vialons',
            request.via
              .map((point) => point.location.longitude)
              .join(AMAP_VIA_SEPARATOR),
          ],
          [
            'vianames',
            request.via.map((point) => point.name).join(AMAP_VIA_SEPARATOR),
          ],
        );
      }
      break;
  }
  let query: string;
  try {
    query = parameters
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
  } catch (cause) {
    throw createAppError(
      AMAP_CODES.invalidInput,
      AMAP_MESSAGES.invalidInput,
      cause,
    );
  }
  return `${AMAP_URIS[platform][request.action]}?${query}`;
}
