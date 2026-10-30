import { createAppError } from '../errors';
import { AMAP_CODES, AMAP_MESSAGES } from './constants';
import type { AmapLaunchOptions, AmapLaunchRequest } from './types';
import { validateAmapRequest } from './validateAmapRequest';

export async function openAmap(
  request: Readonly<AmapLaunchRequest>,
  options: Readonly<AmapLaunchOptions>,
): Promise<boolean> {
  if (options.signal?.aborted) return false;
  validateAmapRequest(request, options.sourceApplication);
  throw createAppError(AMAP_CODES.unsupported, AMAP_MESSAGES.unsupported);
}
