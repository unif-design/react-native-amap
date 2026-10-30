import type { LatLng, MapViewProps } from 'expo-gaode-map';
import type { NativeSyntheticEvent } from 'react-native';

// 宿主扩展事件的契约；声明本身不会为官方 SDK 实现这些事件。
export interface MapPickerSdkEvents extends Pick<
  MapViewProps,
  'onLoad' | 'onCameraMove' | 'onCameraIdle' | 'onMapPress'
> {
  onUserDragStart?: (event: NativeSyntheticEvent<LatLng>) => void;
  onUserDragEnd?: (event: NativeSyntheticEvent<LatLng>) => void;
}
