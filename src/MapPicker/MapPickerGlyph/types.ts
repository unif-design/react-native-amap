import type { MAP_PICKER_ICONS } from './constants';
export interface MapPickerGlyphProps {
  name: keyof typeof MAP_PICKER_ICONS;
  color: string;
  size?: number;
}
