import React from 'react';
import { Button } from '@unif/react-native-design';
import { useStore } from 'zustand';
import type { MapPickerContentProps } from './types';

export function MapPickerLocationSettings({ session }: MapPickerContentProps) {
  const denied = useStore(
    session.store,
    (state) => state.locationPermissionDenied,
  );
  const busy = useStore(session.store, (state) => state.locationSettingsBusy);
  return denied ? (
    <Button
      label="去系统设置开启定位权限"
      variant="text"
      loading={busy}
      onPress={() => session.openLocationSettings()}
    />
  ) : null;
}
