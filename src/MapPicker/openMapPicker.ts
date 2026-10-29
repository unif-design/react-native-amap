import { createMapPickerSession } from './createMapPickerSession';
import { mapPickerRuntime } from './state';
import type {
  MapPickerCallOptions,
  MapPickerConfig,
  MapPickerResult,
} from './types';

export function openMapPicker(
  config: MapPickerConfig,
  options?: MapPickerCallOptions,
): Promise<MapPickerResult> {
  return new Promise((resolve) => {
    const signal = options?.signal;
    const session = createMapPickerSession(config, (result) => {
      signal?.removeEventListener('abort', cancel);
      if (mapPickerRuntime.getState().presentation?.session === session) {
        mapPickerRuntime.setState({ presentation: null });
      }
      resolve(result);
    });
    const cancel = () => session.cancel();
    if (!session.validInput) {
      session.activate();
      return;
    }
    if (signal?.aborted) {
      cancel();
      return;
    }
    const current = mapPickerRuntime.getState();
    const host = [...current.hosts].reverse().find((item) => item.mounted);
    if (!host) {
      session.failUnavailable();
      return;
    }
    const id = current.sequence + 1;
    // Cancelling old queries runs their abort listeners synchronously, which may open a newer picker.
    mapPickerRuntime.setState({ sequence: id });
    current.presentation?.session.cancel();
    const latest = mapPickerRuntime.getState();
    if (
      latest.sequence !== id ||
      signal?.aborted ||
      !host.mounted ||
      !latest.hosts.includes(host)
    ) {
      cancel();
      return;
    }
    signal?.addEventListener('abort', cancel, { once: true });
    mapPickerRuntime.setState({
      presentation: { id, host, session },
    });
  });
}
