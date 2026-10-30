import type { LocationCoordinates } from '../location';

export interface AmapLaunchCoordinates extends LocationCoordinates {
  coordinateSystem: 'GCJ02';
}
export interface AmapHomeRequest {
  action: 'home';
}
export interface AmapCurrentLocationRequest {
  action: 'current_location';
}
export interface AmapMarkerRequest {
  action: 'marker';
  location: AmapLaunchCoordinates;
  name: string;
}
export interface AmapNavigationRequest {
  action: 'navigate';
  destination: AmapLaunchCoordinates;
}
export type AmapRideType = 'bike' | 'elebike';
export interface AmapRideRequest {
  action: 'ride';
  destination: AmapLaunchCoordinates;
  rideType: AmapRideType;
}
export interface AmapRoutePoint {
  location?: AmapLaunchCoordinates;
  name?: string;
  poiId?: string;
}
export interface AmapViaPoint {
  location: AmapLaunchCoordinates;
  name: string;
}
export type AmapRouteMode = 0 | 1 | 2 | 3 | 4 | 5;
export interface AmapRouteRequest {
  action: 'route';
  start?: AmapRoutePoint;
  end?: AmapRoutePoint;
  mode: AmapRouteMode;
  via?: readonly AmapViaPoint[];
  rideType?: AmapRideType;
  preferenceCode?: number;
}
export type AmapLaunchRequest =
  | AmapHomeRequest
  | AmapCurrentLocationRequest
  | AmapMarkerRequest
  | AmapNavigationRequest
  | AmapRideRequest
  | AmapRouteRequest;
export interface AmapLaunchOptions {
  sourceApplication: string;
  signal?: AbortSignal;
}
export type AmapPlatform = 'ios' | 'android';
export type AmapUriParameters = Array<[string, string | number]>;
