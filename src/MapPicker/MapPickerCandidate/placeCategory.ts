import { MAP_PLACE_CATEGORIES } from './constants';
import type { MapPlaceCategory } from './types';

export function placeCategory(typeCode?: string): MapPlaceCategory {
  return (
    (Object.keys(MAP_PLACE_CATEGORIES) as MapPlaceCategory[]).find((category) =>
      MAP_PLACE_CATEGORIES[category].prefixes.some((prefix) =>
        typeCode?.startsWith(prefix),
      ),
    ) ?? 'shop'
  );
}
