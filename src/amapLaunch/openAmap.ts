import { Platform } from 'react-native';
import { canOpenExternalUrl, openExternalUrl } from '../host/externalUrl';
import { createAppError } from '../errors';
import type { AmapLaunchOptions, AmapLaunchRequest } from './types';
import { AMAP_CODES, AMAP_MESSAGES } from './constants';
import { validateAmapRequest } from './validateAmapRequest';
import { validateAmapSupport } from './validateAmapSupport';
import { buildAmapUri } from './buildAmapUri';

export async function openAmap(
  request: Readonly<AmapLaunchRequest>,
  options: Readonly<AmapLaunchOptions>,
): Promise<boolean> {
  const signal = options.signal;
  if (signal?.aborted) return false;
  validateAmapRequest(request, options.sourceApplication);
  const platform = Platform.OS;
  if (platform !== 'ios' && platform !== 'android')
    throw createAppError(AMAP_CODES.unsupported, AMAP_MESSAGES.unsupported);
  validateAmapSupport(request, platform);
  const uri = buildAmapUri(request, platform, options.sourceApplication);
  let canOpen: boolean;
  try {
    canOpen = await canOpenExternalUrl(uri);
  } catch (error) {
    if (signal?.aborted) return false;
    throw error;
  }
  if (!canOpen || signal?.aborted) return false;
  await openExternalUrl(uri);
  return true;
}
