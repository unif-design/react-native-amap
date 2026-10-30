import type { LocationCoordinates } from '../location';
import type { PlaceReadView } from '../places';
import { validateCoordinates } from './snapshotMapPickerInput';
import type { MapSelection } from './types';

export function selectableCoordinates(
  place: PlaceReadView,
): LocationCoordinates | null {
  try {
    validateCoordinates(place.location as LocationCoordinates);
    return place.location as LocationCoordinates;
  } catch {
    return null;
  }
}
export function placeTitle(place: PlaceReadView): string {
  if (place.name?.trim()) return place.name;
  const coordinates = selectableCoordinates(place);
  return coordinates
    ? `${coordinates.latitude}, ${coordinates.longitude}`
    : '地点资料不完整';
}
export function placeDistance(meters?: number): string {
  if (meters === undefined || !Number.isFinite(meters) || meters < 0) return '';
  const rounded = Math.round(meters);
  if (rounded < 100) return '100m内';
  return rounded >= 1000 ? `${(rounded / 1000).toFixed(1)}km` : `${rounded}m`;
}
export function placeAddress(place: PlaceReadView): string {
  return [place.address, place.indoor?.floorName ?? place.indoor?.floor]
    .filter((value) => value !== undefined && value !== '')
    .join(' ');
}
export function candidateSelected(
  place: PlaceReadView,
  selection: MapSelection | null,
): boolean {
  const coordinates = selectableCoordinates(place);
  if (!coordinates || !selection) return false;
  const details = { ...place };
  delete details.location;
  return (
    coordinates.latitude === selection.coordinates.latitude &&
    coordinates.longitude === selection.coordinates.longitude &&
    coordinates.coordinateSystem === selection.coordinates.coordinateSystem &&
    JSON.stringify(details) === JSON.stringify(selection.place)
  );
}
