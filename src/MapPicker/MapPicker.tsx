import React, { useImperativeHandle, useState } from 'react';
import { createMapPickerSession } from './createMapPickerSession';
import { MapPickerContent } from './MapPickerContent';
import type { MapPickerProps } from './types';

export function MapPicker({ ref, onResult, ...config }: MapPickerProps) {
  const [session] = useState(() => createMapPickerSession(config, onResult));
  useImperativeHandle(ref, () => session.controls, [session]);
  return <MapPickerContent session={session} />;
}
