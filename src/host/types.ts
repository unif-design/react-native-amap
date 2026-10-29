import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type AmapPermissionState =
  'requestable' | 'blocked' | 'granted' | 'limited' | 'unavailable';
export interface AmapPermissionAccess {
  read(
    ids: readonly 'location'[],
  ): Promise<Array<{ status: AmapPermissionState }>>;
  request(id: 'location'): Promise<void>;
  openSettings(): Promise<void>;
}
export interface AmapKeyboardHost {
  KeyboardViewport: ComponentType<{
    children: ReactNode;
    active?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
  }>;
  KeyboardPresentationScope: ComponentType<{
    children: ReactNode;
    active?: boolean;
  }>;
  useKeyboardPresentation(presented: boolean): boolean;
}
export interface AmapHost {
  getPermissionAccess(): AmapPermissionAccess;
  keyboard: AmapKeyboardHost;
  canOpenExternalUrl(url: string): Promise<boolean>;
  openExternalUrl(url: string): Promise<void>;
}
export interface AmapKeys {
  iosKey?: string;
  androidKey?: string;
}
