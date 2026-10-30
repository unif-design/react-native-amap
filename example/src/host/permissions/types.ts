export type PermissionId =
  'camera' | 'location' | 'bluetooth' | 'notifications' | 'microphone';

export type PermissionState =
  'requestable' | 'blocked' | 'granted' | 'limited' | 'unavailable';

export interface PermissionEntry {
  id: PermissionId;
  label: string;
  status: PermissionState;
  detail?: string;
}

export interface PermissionAccess {
  read(ids?: readonly PermissionId[]): Promise<PermissionEntry[]>;
  request(id: PermissionId): Promise<void>;
  openSettings(): Promise<void>;
}

export type PermissionObservation = Pick<PermissionEntry, 'status' | 'detail'>;
