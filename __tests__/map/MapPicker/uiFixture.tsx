import React, { useEffect, useImperativeHandle } from 'react';
import { View } from 'react-native';
import type {
  MapViewProps,
  MapViewRef,
  CircleProps,
  MarkerProps,
} from 'expo-gaode-map';
export const sdkRef = {
  setCenter: jest.fn(async () => {}),
  moveCamera: jest.fn(async () => {}),
  setZoom: jest.fn(async () => {}),
  getCameraPosition: jest.fn(async () => ({ zoom: 16 })),
};
export const sdkMap = jest.fn();
export const sdkMapMount = jest.fn();
export const sdkCircleMount = jest.fn();
export const MapType = { Standard: 1, Night: 3 };
export const MapView = React.forwardRef<MapViewRef, MapViewProps>(
  (props, ref) => {
    sdkMap(props);
    useImperativeHandle(ref, () => sdkRef as unknown as MapViewRef, []);
    useEffect(() => {
      sdkMapMount();
    }, []);
    const { onLoad } = props;
    useEffect(() => {
      onLoad?.({} as Parameters<NonNullable<MapViewProps['onLoad']>>[0]);
    }, [onLoad]);
    return (
      <View {...props} testID="sdk-map">
        {props.children}
      </View>
    );
  },
);
export function Circle(props: CircleProps) {
  useEffect(() => {
    sdkCircleMount();
  }, []);
  return <View {...props} testID="sdk-circle" />;
}
export function Marker(props: MarkerProps) {
  return <View {...props} testID="sdk-marker" />;
}
