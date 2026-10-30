import type { StyleProp, ViewStyle } from 'react-native';
import type { MapPickerGlyphProps } from '../MapPickerGlyph/types';
export interface MapPickerControlButtonProps {
  glyph: MapPickerGlyphProps['name'];
  color: string;
  label: string;
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
  onPress(): void;
}
