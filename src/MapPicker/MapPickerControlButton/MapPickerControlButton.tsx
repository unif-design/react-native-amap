import React from 'react';
import { IconButton } from '@unif/react-native-design';
import { MAP_PICKER_ICONS } from '../MapPickerGlyph/constants';
import type { MapPickerControlButtonProps } from './types';

export function MapPickerControlButton({
  glyph,
  color,
  label,
  hint,
  busy = false,
  disabled = false,
  style,
  onPress,
}: MapPickerControlButtonProps) {
  return (
    <IconButton
      variant="glass"
      icon={MAP_PICKER_ICONS[glyph]}
      surfaceSize={40}
      iconSize={22}
      color={color}
      style={style}
      onPress={onPress}
      loading={busy}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityHint={hint}
    />
  );
}
