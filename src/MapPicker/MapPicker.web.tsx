import { useEffect, useState } from 'react';
import { openMapPicker } from './openMapPicker.web';
import type { MapPickerProps, MapPickerResult } from './types';

export function MapPicker({ ref: _ref, onResult, ...config }: MapPickerProps) {
  const [round] = useState(() => ({
    config,
    onResult,
    delivered: false,
    generation: 0,
  }));
  useEffect(() => {
    const generation = ++round.generation;
    function deliver(result: MapPickerResult) {
      if (round.delivered) return;
      round.delivered = true;
      try {
        Promise.resolve(round.onResult(result)).catch(() => {});
      } catch {
        /* A result observer cannot resettle this round. */
      }
    }
    openMapPicker(round.config).then((result) => {
      if (generation === round.generation) deliver(result);
    });
    return () => {
      const release = ++round.generation;
      Promise.resolve().then(() => {
        if (release === round.generation) deliver({ status: 'cancelled' });
      });
    };
  }, [round]);
  return null;
}
