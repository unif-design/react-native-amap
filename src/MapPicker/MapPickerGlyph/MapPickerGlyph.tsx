import React from 'react';

import { MAP_PICKER_ICONS } from './constants';
import type { MapPickerGlyphProps } from './types';

export function MapPickerGlyph({
  name,
  color,
  size = 20,
}: MapPickerGlyphProps) {
  const Glyph = MAP_PICKER_ICONS[name];
  return (
    <Glyph
      testID={`map-place-icon-${name}`}

      size={size}
      color={color}
    />
  );
}
