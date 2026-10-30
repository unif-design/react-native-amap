import type { ExpoGaodeMapModule, LatLng, ReGeocode } from 'expo-gaode-map';
import type { GetCurrentLocationInput } from './types';

export type LocationSdkObservation = LatLng & Partial<ReGeocode>;

// 保留宿主已实现的按次地址交接，不以官方包的声明推断运行期能力。
export interface LocationSdk extends Omit<
  typeof ExpoGaodeMapModule,
  'getCurrentLocation' | 'addLocationListener'
> {
  getCurrentLocation(
    input: GetCurrentLocationInput,
  ): Promise<LocationSdkObservation>;
  addLocationListener(
    listener: (value: LocationSdkObservation) => void,
  ): ReturnType<typeof ExpoGaodeMapModule.addLocationListener>;
}
