import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { MapPickerModal } from './MapPickerModal';
import { mapPickerRuntime, registerMapPickerHost } from './state';
import type { MapPickerHostBinding, MapPickerHostProps } from './types';

export function MapPickerHost({ children }: MapPickerHostProps) {
  const [host] = useState<MapPickerHostBinding>(() => ({
    mounted: false,
    generation: 0,
  }));
  const presentation = useStore(
    mapPickerRuntime,
    (state) => state.presentation,
  );
  useEffect(() => registerMapPickerHost(host), [host]);
  if (!presentation || presentation.host !== host) return null;
  const { session, id } = presentation;
  return (
    <MapPickerModal key={id} session={session}>
      {children}
    </MapPickerModal>
  );
}
