import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Spinner,
  GlassLayer,
  useColors,
  useTheme,
  useThemedStyles,
} from '@unif/react-native-design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle as SvgCircle } from 'react-native-svg';
import { useStore } from 'zustand';
import type * as MapSdk from 'expo-gaode-map';
import { MapPickerConfirmation } from './MapPickerConfirmation/MapPickerConfirmation';
import { MapPickerPanel } from './MapPickerPanel/MapPickerPanel';
import { MapPickerControlButton } from './MapPickerControlButton/MapPickerControlButton';
import { MapPickerLocationSettings } from './MapPickerLocationSettings';
import {
  MAP_PICKER_MAP_FRACTION,
  MAP_PICKER_SEARCH_MAP_FRACTION,
  MAP_PICKER_SPLIT_DURATION,
  MAP_PICKER_MIN_ZOOM,
  MAP_PICKER_MAX_ZOOM,
} from './constants';
import { makeStyles } from './styles';
import type { MapPickerContentProps } from './types';

export function MapPickerContent({ session }: MapPickerContentProps) {
  const state = useStore(session.store);
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [sdk] = useState<typeof MapSdk | null>(() => {
    if (!session.validInput) return null;
    try {
      return require('expo-gaode-map');
    } catch {
      return null;
    }
  });
  const hasPanel =
    session.config.panel?.visible !== false || !!session.config.search;
  const fraction = useSharedValue(hasPanel ? MAP_PICKER_MAP_FRACTION : 1);
  useEffect(() => {
    fraction.value = withTiming(
      hasPanel
        ? state.searchActive
          ? MAP_PICKER_SEARCH_MAP_FRACTION
          : MAP_PICKER_MAP_FRACTION
        : 1,
      { duration: MAP_PICKER_SPLIT_DURATION, easing: Easing.out(Easing.cubic) },
    );
  }, [fraction, hasPanel, state.searchActive]);
  const mapStyle = useAnimatedStyle(() => ({
    height: height * fraction.value,
  }));
  useEffect(() => {
    if (!session.validInput || sdk) session.activate();
    else session.failUnavailable();
    return session.deactivate;
  }, [session, sdk]);
  async function zoom(delta: number) {
    try {
      const camera = await session.controls.getCameraPosition();
      if (typeof camera.zoom !== 'number' || !Number.isFinite(camera.zoom))
        throw new Error();
      await session.controls.setZoom(
        Math.max(
          MAP_PICKER_MIN_ZOOM,
          Math.min(MAP_PICKER_MAX_ZOOM, camera.zoom + delta),
        ),
        true,
      );
    } catch {
      session.reportOperationError();
    }
  }
  if (!session.validInput || !sdk || state.result) return null;
  const { MapView, Circle, MapType } = sdk;
  const top = insets.top + 12;
  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        testID="map-picker"
      >
        <Animated.View
          style={[styles.mapBlock, mapStyle]}
          testID="map-picker-map-block"
        >
          <MapView
            ref={session.attachMap}
            style={styles.map}
            initialCameraPosition={session.config.initialCameraPosition}
            mapType={scheme === 'dark' ? MapType.Night : MapType.Standard}
            compassEnabled
            myLocationEnabled={state.display.myLocationEnabled ?? false}
            scrollGesturesEnabled={state.display.scrollGesturesEnabled}
            zoomGesturesEnabled={state.display.zoomGesturesEnabled}
            {...session.events}
          >
            {state.display.circle ? (
              <Circle
                key={JSON.stringify(state.display.circle)}
                strokeColor={colors.mapCircleStroke}
                fillColor={colors.mapCircleFill}
                {...state.display.circle}
              />
            ) : null}
          </MapView>
          <View
            pointerEvents="none"
            style={styles.pin}
            testID="map-picker-center-pin"
          >
            <View style={styles.pinInner}>
              <Svg width={38} height={50} viewBox="0 0 38 50" fill="none">
                <Path
                  d="M19 2C10.7 2 4 8.7 4 17c0 9.6 12.2 26 14.1 28.5a1.1 1.1 0 0 0 1.8 0C21.8 43 34 26.6 34 17 34 8.7 27.3 2 19 2z"
                  fill={colors.primary}
                />
                <SvgCircle cx="19" cy="17" r="6" fill={colors.onPrimary} />
              </Svg>
              <View style={styles.pinShadow} />
            </View>
          </View>
          <View
            style={[styles.toolbar, { top }]}
            pointerEvents="box-none"
            testID="map-picker-controls"
          >
            <MapPickerControlButton
              glyph="back"
              color={colors.foreground}
              label="返回"
              hint="取消本次选点"
              onPress={session.cancel}
              style={styles.back}
            />
            {session.config.showCompleteButton !== false ? (
              <MapPickerControlButton
                glyph="done"
                color={colors.primary}
                label="完成"
                hint="确认当前选择"
                disabled={!state.selection}
                busy={state.completing}
                onPress={() => {
                  session.complete();
                }}
                style={styles.back}
              />
            ) : null}
          </View>
          {state.initialLocationPending ? (
            <View style={[styles.status, { top }]}>
              <GlassLayer style={styles.statusMaterial} />
              <Spinner size={15} />
              <Text style={styles.statusText}>正在定位</Text>
            </View>
          ) : null}
          {!state.searchActive ? (
            <View
              style={[styles.floating, hasPanel && styles.floatingAbovePanel]}
            >
              {session.config.onRequestRelocate ? (
                <MapPickerControlButton
                  glyph="locate"
                  color={colors.primary}
                  label="重新定位"
                  onPress={() => {
                    session.requestRelocate();
                  }}
                  busy={state.relocateBusy}
                  style={styles.square}
                />
              ) : null}
              <MapPickerControlButton
                glyph="plus"
                color={colors.foreground}
                label="放大"
                onPress={() => {
                  zoom(1);
                }}
                style={styles.square}
              />
              <MapPickerControlButton
                glyph="minus"
                color={colors.foreground}
                label="缩小"
                onPress={() => {
                  zoom(-1);
                }}
                style={styles.square}
              />
            </View>
          ) : null}
          {!hasPanel && (state.localError || state.locationPermissionDenied) ? (
            <View style={[styles.error, styles.mapError]}>
              <Text accessibilityRole="alert" style={styles.errorText}>
                {state.localError}
              </Text>
              <MapPickerLocationSettings session={session} />
            </View>
          ) : null}
        </Animated.View>
        {hasPanel ? <MapPickerPanel session={session} /> : null}
        {state.confirmation ? (
          <MapPickerConfirmation
            key={state.confirmation.id}
            request={state.confirmation}
            session={session}
          />
        ) : null}
      </View>
    </View>
  );
}
