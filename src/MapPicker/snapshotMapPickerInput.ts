import type { CameraUpdate, LatLngPoint } from 'expo-gaode-map';
import type { LocationCoordinates } from '../location';
import {
  MAP_PICKER_INITIAL_ZOOM,
  MAP_PICKER_MESSAGES,
  MAP_PICKER_COLOR_MIN,
  MAP_PICKER_COLOR_MAX,
} from './constants';
import type {
  MapPickerConfig,
  MapPickerDisplayOptions,
  MapPickerSelectionPresentation,
  MapSelection,
} from './types';

export function snapshotValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => snapshotValue(item))) as T;
  }
  if (value && typeof value === 'object') {
    const next = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, snapshotValue(item)]),
    );
    return Object.freeze(next) as T;
  }
  return value;
}
export function invalidInput(): never {
  throw new Error(MAP_PICKER_MESSAGES.invalidInput);
}
export function validateCoordinates(value: LocationCoordinates): void {
  if (
    !value ||
    typeof value !== 'object' ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180 ||
    (value.coordinateSystem !== undefined &&
      value.coordinateSystem !== 'GCJ02' &&
      value.coordinateSystem !== 'WGS84')
  ) {
    invalidInput();
  }
}
export function validatePoint(value: LatLngPoint): void {
  if (Array.isArray(value)) {
    if (value.length !== 2) {
      invalidInput();
    }
    validateCoordinates({ longitude: value[0], latitude: value[1] });
  } else {
    validateCoordinates(value);
  }
}
export function validateCamera(value: CameraUpdate): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidInput();
  }
  if (value.target !== undefined) {
    validateCoordinates(value.target);
  }
  for (const key of ['zoom', 'bearing', 'tilt'] as const) {
    if (value[key] !== undefined && !Number.isFinite(value[key])) {
      invalidInput();
    }
  }
}
export function snapshotSelection(
  value: MapSelection | null,
): MapSelection | null {
  if (value === null) {
    return null;
  }
  if (!value || typeof value !== 'object') {
    invalidInput();
  }
  validateCoordinates(value.coordinates);
  if (
    value.place !== undefined &&
    (!value.place ||
      typeof value.place !== 'object' ||
      Array.isArray(value.place) ||
      'location' in value.place)
  ) {
    invalidInput();
  }
  return snapshotValue(value);
}
export function snapshotSelectionPresentation(
  value?: MapPickerSelectionPresentation,
): MapPickerSelectionPresentation | null {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidInput();
  }
  for (const key of ['title', 'address'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string') {
      invalidInput();
    }
  }
  if (
    value.source !== undefined &&
    !['map', 'search', 'original', 'location', 'poi'].includes(value.source)
  ) {
    invalidInput();
  }
  return snapshotValue(value);
}
export function snapshotDisplay(
  value: MapPickerDisplayOptions,
): MapPickerDisplayOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidInput();
  }
  for (const key of [
    'scrollGesturesEnabled',
    'zoomGesturesEnabled',
    'myLocationEnabled',
  ] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') {
      invalidInput();
    }
  }
  if (value.circle !== undefined && value.circle !== null) {
    validatePoint(value.circle.center);
    for (const key of ['strokeColor', 'fillColor'] as const) {
      const color = value.circle[key];
      if (
        typeof color === 'number' &&
        (!Number.isInteger(color) ||
          color < MAP_PICKER_COLOR_MIN ||
          color > MAP_PICKER_COLOR_MAX)
      ) {
        invalidInput();
      }
    }
    if (!Number.isFinite(value.circle.radius) || value.circle.radius <= 0) {
      invalidInput();
    }
    for (const key of ['strokeWidth', 'zIndex'] as const) {
      if (
        value.circle[key] !== undefined &&
        !Number.isFinite(value.circle[key])
      ) {
        invalidInput();
      }
    }
  }
  return snapshotValue(value);
}
export function snapshotConfig(value: MapPickerConfig): MapPickerConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidInput();
  }
  if (value.initialCameraPosition !== undefined) {
    validateCamera(value.initialCameraPosition);
  }
  if (value.initialQueryCenter !== undefined) {
    validateCoordinates(value.initialQueryCenter);
  }
  if (value.initialSelection !== undefined) {
    if (value.initialSelection === null) {
      invalidInput();
    }
    snapshotSelection(value.initialSelection);
  }
  snapshotSelectionPresentation(value.initialSelectionPresentation);
  if (
    value.selectInitialLocation !== undefined &&
    typeof value.selectInitialLocation !== 'boolean'
  ) {
    invalidInput();
  }
  if (value.initialDisplay !== undefined) {
    snapshotDisplay(value.initialDisplay);
  }
  if (
    value.initialLocationRequest !== undefined &&
    (!value.initialLocationRequest ||
      typeof value.initialLocationRequest.includeAddress !== 'boolean')
  ) {
    invalidInput();
  }
  if (
    value.search !== undefined &&
    (!value.search ||
      !Number.isSafeInteger(value.search.debounceMs) ||
      value.search.debounceMs < 0 ||
      typeof value.search.query !== 'function')
  ) {
    invalidInput();
  }
  if (
    value.showCompleteButton !== undefined &&
    typeof value.showCompleteButton !== 'boolean'
  ) {
    invalidInput();
  }
  for (const key of [
    'onReady',
    'onInitialLocationResult',
    'onLoad',
    'onCameraMove',
    'onCameraIdle',
    'onMapPress',
    'onRequestRelocate',
    'onSelectionChange',
    'onUserDragStart',
    'onUserDragEnd',
    'beforeConfirm',
    'getConfirmationOptions',
  ] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'function') {
      invalidInput();
    }
  }
  if (value.search) {
    for (const key of ['onClear', 'onExit'] as const) {
      if (
        value.search[key] !== undefined &&
        typeof value.search[key] !== 'function'
      ) {
        invalidInput();
      }
    }
  }
  if (value.panel !== undefined) {
    if (
      !value.panel ||
      typeof value.panel !== 'object' ||
      Array.isArray(value.panel) ||
      (value.panel.visible !== undefined &&
        typeof value.panel.visible !== 'boolean') ||
      (value.panel.unselectedTitle !== undefined &&
        typeof value.panel.unselectedTitle !== 'string') ||
      (value.panel.renderAdditionalOptions !== undefined &&
        typeof value.panel.renderAdditionalOptions !== 'function')
    ) {
      invalidInput();
    }
  }
  // Only serializable configuration values are copied; callback functions retain identity.
  return snapshotValue({
    ...value,
    initialCameraPosition: {
      ...value.initialCameraPosition,
      zoom: value.initialCameraPosition?.zoom ?? MAP_PICKER_INITIAL_ZOOM,
    },
  });
}
