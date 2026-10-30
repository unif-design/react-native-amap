import { Linking } from 'react-native';
import { createAppError } from '../errors';
import { EXTERNAL_URL_CODES, EXTERNAL_URL_MESSAGES } from './constants';
import { validateExternalUrl } from './validateExternalUrl';

export async function canOpenExternalUrl(url: string): Promise<boolean> {
  validateExternalUrl(url);
  if (typeof Linking.canOpenURL !== 'function') {
    throw createAppError(
      EXTERNAL_URL_CODES.unsupported,
      EXTERNAL_URL_MESSAGES.unsupported,
    );
  }
  try {
    return await Linking.canOpenURL(url);
  } catch (cause) {
    throw createAppError(
      EXTERNAL_URL_CODES.checkFailed,
      EXTERNAL_URL_MESSAGES.checkFailed,
      cause,
    );
  }
}
