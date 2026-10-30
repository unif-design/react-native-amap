import { createElement } from 'react';
import type { NativeSyntheticEvent } from 'react-native';
import {
  MapPicker,
  MapPickerHost,
  configureAmapHost,
  getCurrentLocation,
  initializeGaode,
  openAmap,
  openMapPicker,
  projectLocationObservation,
  reverseGeocode,
  searchAround,
  searchByKeyword,
  startLocationUpdates,
} from '@unif/react-native-amap';
import type {
  AmapHost,
  LocationAddress,
  LocationObservation,
  MapPickerConfig,
  MapPickerControls,
} from '@unif/react-native-amap';

export const address: LocationAddress = {};
export const observed: LocationObservation = { latitude: 0, longitude: 0 };
export const emptyConfig: MapPickerConfig = {};
export const config: MapPickerConfig = {
  onUserDragStart(event) {
    const latitude: number = event.nativeEvent.latitude;
    // @ts-expect-error 经纬度必须保留 number 类型，不能退化为 any。
    const wrong: string = event.nativeEvent.latitude;
    return [latitude, wrong];
  },
};
export const picker = createElement(MapPicker, { onResult: () => {} });
export const narrowDrag: MapPickerConfig = {
  // @ts-expect-error 原生事件只有坐标，不能接受要求额外字段的回调。
  onUserDragStart: (
    event: NativeSyntheticEvent<{
      latitude: number;
      longitude: number;
      label: string;
    }>,
  ) => event.nativeEvent.label.toLowerCase(),
};
export const host = createElement(MapPickerHost);
export function controlsContract(controls: MapPickerControls): boolean {
  return controls.setSelection({ coordinates: observed });
}
export async function consume(hostDependencies: AmapHost) {
  configureAmapHost(hostDependencies);
  initializeGaode({ iosKey: 'fixture', androidKey: 'fixture' });
  projectLocationObservation(observed);
  await getCurrentLocation({ includeAddress: false });
  await startLocationUpdates({ intervalMs: 0 }, { onLocation: () => {} });
  await searchAround({
    center: observed,
    keyword: '',
    radiusMeters: 0,
    page: 1,
    pageSize: 1,
  });
  await searchByKeyword({ keyword: '', page: 1, pageSize: 1 });
  await reverseGeocode({
    location: observed,
    radiusMeters: 0,
    includeExtensions: false,
  });
  await openMapPicker({ initialLocationRequest: { includeAddress: false } });
  await openAmap({ action: 'home' }, { sourceApplication: 'fixture' });
  // @ts-expect-error includeAddress 仍是必填的按次参数。
  await getCurrentLocation({});
}
