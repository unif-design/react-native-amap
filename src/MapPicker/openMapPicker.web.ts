import { snapshotConfig } from './snapshotMapPickerInput';
import { MAP_PICKER_MESSAGES } from './constants';
import type {
  MapPickerCallOptions,
  MapPickerConfig,
  MapPickerResult,
} from './types';

export async function openMapPicker(
  config: MapPickerConfig,
  options?: MapPickerCallOptions,
): Promise<MapPickerResult> {
  try {
    snapshotConfig(config);
  } catch {
    return {
      status: 'failed',
      error: {
        reason: 'invalid_input',
        message: MAP_PICKER_MESSAGES.invalidInput,
      },
    };
  }
  if (options?.signal?.aborted) return { status: 'cancelled' };
  return {
    status: 'failed',
    error: { reason: 'unavailable', message: MAP_PICKER_MESSAGES.unavailable },
  };
}
