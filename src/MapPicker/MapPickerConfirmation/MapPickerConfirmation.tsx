import React, { useEffect, useState } from 'react';
import { confirm, ConfirmHost } from '@unif/react-native-design';
import type { MapPickerConfirmationProps } from './types';

export function MapPickerConfirmation({
  session,
  request,
}: MapPickerConfirmationProps) {
  const [released, setReleased] = useState(false);
  useEffect(() => {
    // Child Host effects register first; the core defers public confirm through replay.
    return session.bindConfirmation(request, confirm, () => setReleased(true));
  }, [session, request]);
  return released ? null : <ConfirmHost />;
}
