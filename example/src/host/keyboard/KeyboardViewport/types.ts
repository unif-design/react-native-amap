import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type KeyboardViewportMode = 'resize' | 'external';

export interface KeyboardViewportProps {
  children: ReactNode;
  active?: boolean;
  mode?: KeyboardViewportMode;
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Private browser surface: keep DOM globals out of the native TS program.
export interface KeyboardBrowserViewport extends Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
> {
  height: number;
  width: number;
  offsetTop: number;
  offsetLeft: number;
}

export interface KeyboardBrowserWindow extends Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
> {
  innerHeight: number;
  innerWidth: number;
  visualViewport?: KeyboardBrowserViewport;
}

export interface KeyboardBrowserGlobals {
  window?: KeyboardBrowserWindow;
}
