import type { ReGeocode } from 'expo-gaode-map';
import { ADDRESS_FIELDS } from './constants';
import { projectLocationObservation } from './projectLocationObservation';
import type { LocationObservation } from './types';

export function convertLocation(
  value: ReGeocode,
): LocationObservation | undefined {
  if (!value) return;
  const address: Record<string, unknown> = {
    formattedAddress: value.address,
  };
  for (const field of ADDRESS_FIELDS) address[field] = value[field];
  return projectLocationObservation({
    latitude: value.latitude,
    longitude: value.longitude,
    coordinateSystem: value.coordType,
    timestampMs: value.timestamp,
    accuracyMeters: value.accuracy,
    altitudeMeters: value.altitude,
    headingDegrees: value.heading,
    speedMetersPerSecond: value.speed,
    address,
    trustedLevel: value.trustedLevel,
    isMock: value.isMock,
    isSimulatedBySoftware: value.isSimulatedBySoftware,
    isProducedByAccessory: value.isProducedByAccessory,
  });
}
