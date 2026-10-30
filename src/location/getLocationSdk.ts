import type * as GaodeSdk from 'expo-gaode-map';
import type { LocationSdk } from './sdkTypes';
export function getLocationSdk(): LocationSdk {
  return (require('expo-gaode-map') as typeof GaodeSdk).ExpoGaodeMapModule;
}
