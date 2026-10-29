import type { LatLng, ReGeocode } from 'expo-gaode-map';
import type { ADDRESS_FIELDS } from './constants';

export type LocationCoordinateSystem = NonNullable<ReGeocode['coordType']>;

export interface LocationCoordinates extends LatLng {
  coordinateSystem?: LocationCoordinateSystem;
}

export interface LocationAddress extends Pick<
  ReGeocode,
  (typeof ADDRESS_FIELDS)[number]
> {
  formattedAddress?: ReGeocode['address'];
}

export interface LocationObservation extends LocationCoordinates {
  timestampMs?: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  headingDegrees?: number;
  speedMetersPerSecond?: number;
  address?: LocationAddress;
  isMock?: boolean;
  trustedLevel?: number;
  isSimulatedBySoftware?: boolean;
  isProducedByAccessory?: boolean;
}

export type LocationErrorReason =
  | 'invalid_input'
  | 'permission_denied'
  | 'unsupported'
  | 'unavailable'
  | 'invalid_coordinates';

export interface LocationError {
  reason: LocationErrorReason;
  message: string;
}

export interface LocationFailed {
  status: 'failed';
  error: LocationError;
}

export interface LocationCancelled {
  status: 'cancelled';
}

export interface GetCurrentLocationSuccess {
  status: 'success';
  location: LocationObservation;
}

export type GetCurrentLocationResult =
  GetCurrentLocationSuccess | LocationCancelled | LocationFailed;

export interface GetCurrentLocationInput {
  includeAddress: boolean;
}

export interface LocationCallOptions {
  signal?: AbortSignal;
}

export interface StartLocationUpdatesInput {
  intervalMs: number;
}

export type LocationUpdatesStopReason = 'stopped' | 'cancelled' | 'replaced';

export interface LocationUpdatesObserver {
  onLocation(location: LocationObservation): void;
  onStopped?(reason: LocationUpdatesStopReason): void;
}

export interface LocationIntervalRequested {
  status: 'requested';
}

export interface LocationUpdatesInactive {
  status: 'inactive';
}

export type SetLocationIntervalResult =
  LocationIntervalRequested | LocationUpdatesInactive | LocationFailed;

export interface LocationUpdates {
  setInterval(intervalMs: number): SetLocationIntervalResult;
  stop(): void;
}

export interface LocationUpdatesSubscribed {
  status: 'subscribed';
  updates: LocationUpdates;
}

export type StartLocationUpdatesResult =
  LocationUpdatesSubscribed | LocationCancelled | LocationFailed;
