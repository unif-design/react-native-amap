import type { PlaceReadView } from '../../places';
import type { MapPickerSelectionPresentation, MapSelection } from '../types';
import type { MAP_PLACE_CATEGORIES } from './constants';
export type MapPlaceCategory = keyof typeof MAP_PLACE_CATEGORIES;
export interface MapPickerCandidateProps {
  place: PlaceReadView;
  selection?: MapSelection | null;
  presentation?: MapPickerSelectionPresentation | null;
  summary?: boolean;
  onSelect?(): void;
}
