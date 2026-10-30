import { createStore } from 'zustand/vanilla';
import type { MapPickerHostBinding, MapPickerRuntimeState } from './types';

export const mapPickerRuntime = createStore<MapPickerRuntimeState>(() => ({
  hosts: [],
  presentation: null,
  sequence: 0,
}));

export function registerMapPickerHost(host: MapPickerHostBinding): () => void {
  host.mounted = true;
  const generation = ++host.generation;
  mapPickerRuntime.setState((state) =>
    state.hosts.includes(host) ? state : { hosts: [...state.hosts, host] },
  );
  return () => {
    host.mounted = false;
    Promise.resolve().then(() => {
      if (host.mounted || host.generation !== generation) return;
      const { presentation } = mapPickerRuntime.getState();
      if (presentation?.host === host) presentation.session.cancel();
      mapPickerRuntime.setState((state) => ({
        hosts: state.hosts.filter((item) => item !== host),
      }));
    });
  };
}
