import { ADDRESS_FIELDS } from './constants';
import type { LocationAddress, LocationObservation } from './types';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function projectLocationObservation(
  value: unknown,
): LocationObservation | undefined {
  if (
    !record(value) ||
    !finite(value.latitude) ||
    !finite(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180
  )
    return;

  const result: LocationObservation = {
    latitude: value.latitude,
    longitude: value.longitude,
  };
  if (value.coordinateSystem === 'GCJ02' || value.coordinateSystem === 'WGS84')
    result.coordinateSystem = value.coordinateSystem;
  if (finite(value.timestampMs)) result.timestampMs = value.timestampMs;
  if (finite(value.accuracyMeters) && value.accuracyMeters >= 0)
    result.accuracyMeters = value.accuracyMeters;
  if (finite(value.altitudeMeters))
    result.altitudeMeters = value.altitudeMeters;
  if (
    finite(value.headingDegrees) &&
    value.headingDegrees >= 0 &&
    value.headingDegrees < 360
  )
    result.headingDegrees = value.headingDegrees;
  if (finite(value.speedMetersPerSecond) && value.speedMetersPerSecond >= 0)
    result.speedMetersPerSecond = value.speedMetersPerSecond;
  if (finite(value.trustedLevel)) result.trustedLevel = value.trustedLevel;
  if (typeof value.isMock === 'boolean') result.isMock = value.isMock;
  if (typeof value.isSimulatedBySoftware === 'boolean')
    result.isSimulatedBySoftware = value.isSimulatedBySoftware;
  if (typeof value.isProducedByAccessory === 'boolean')
    result.isProducedByAccessory = value.isProducedByAccessory;

  if (record(value.address)) {
    const address: LocationAddress = {};
    if (typeof value.address.formattedAddress === 'string')
      address.formattedAddress = value.address.formattedAddress;
    for (const field of ADDRESS_FIELDS) {
      if (typeof value.address[field] === 'string')
        address[field] = value.address[field];
    }
    if (Object.keys(address).length) result.address = address;
  }
  return result;
}
