import { Linking } from 'react-native';
import { createAppError } from '../errors';
import { EXTERNAL_URL_CODES, EXTERNAL_URL_MESSAGES } from './constants';
import { validateExternalUrl } from './validateExternalUrl';

export async function openExternalUrl(url: string): Promise<void> {
  validateExternalUrl(url);
  if (typeof Linking.openURL !== 'function') {
    throw createAppError(
      EXTERNAL_URL_CODES.unsupported,
      EXTERNAL_URL_MESSAGES.unsupported,
    );
  }
  try {
    await Linking.openURL(url);
  } catch (cause) {
    throw createAppError(
      EXTERNAL_URL_CODES.openFailed,
      EXTERNAL_URL_MESSAGES.openFailed,
      cause,
    );
  }
}
