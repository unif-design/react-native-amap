import type * as GaodeSdk from 'expo-gaode-map';
export function getLocationSdk(): typeof GaodeSdk.ExpoGaodeMapModule {
  return (require('expo-gaode-map') as typeof GaodeSdk).ExpoGaodeMapModule;
}
