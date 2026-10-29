import { createAppError } from '../errors';
import type { AmapLaunchRequest, AmapPlatform } from './types';
import {
  AMAP_CODES,
  AMAP_MESSAGES,
  AMAP_IOS_MAX_ROUTE_MODE,
} from './constants';

export function validateAmapSupport(
  request: Readonly<AmapLaunchRequest>,
  platform: AmapPlatform,
): void {
  if (
    request.action === 'route' &&
    ((platform === 'ios' && request.mode > AMAP_IOS_MAX_ROUTE_MODE) ||
      (platform === 'android' &&
        (!request.end?.location ||
          (!request.start?.location &&
            !!(request.start?.name?.trim() || request.start?.poiId?.trim())))))
  )
    throw createAppError(AMAP_CODES.unsupported, AMAP_MESSAGES.unsupported);
}
