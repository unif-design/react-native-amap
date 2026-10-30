import type { MapViewRef } from 'expo-gaode-map';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import type { MapPickerConfig } from '@amap/MapPicker/types';
export const origin = { latitude: 0, longitude: 0 };
export const other = { latitude: 2, longitude: 3 };
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export function open(config: MapPickerConfig = {}) {
  const onResult = jest.fn();
  const session = createMapPickerSession(config, onResult);
  const map = {
    setCenter: jest.fn().mockResolvedValue(undefined),
    moveCamera: jest.fn().mockResolvedValue(undefined),
    setZoom: jest.fn().mockResolvedValue(undefined),
    getCameraPosition: jest.fn().mockResolvedValue({ target: origin }),
  } as unknown as MapViewRef;
  session.attachMap(map);
  session.activate();
  session.events.onLoad!({ nativeEvent: {} } as never);
  return { session, map, onResult };
}
export async function flush() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}
