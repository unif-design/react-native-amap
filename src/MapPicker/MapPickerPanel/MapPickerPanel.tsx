import {
  CloseOutlined,
  LocationOutlined,
  SearchOutlined,
} from '@unif/react-native-icons';
import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  Button,
  Empty,
  IconButton,
  Input,
  useColors,
  useThemedStyles,
} from '@unif/react-native-design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'zustand';
import { MAP_PICKER_UNSELECTED_TITLE } from '../constants';
import { MapPickerCandidate } from '../MapPickerCandidate/MapPickerCandidate';
import { selectableCoordinates } from '../placePresentation';
import { MapPickerGlyph } from '../MapPickerGlyph/MapPickerGlyph';
import { MapPickerSkeleton } from './MapPickerSkeleton';
import { MapPickerLocationSettings } from '../MapPickerLocationSettings';
import { getAmapHost } from '../../host';
import { makeStyles } from './styles';
import type { MapPickerContentProps } from '../types';

export function MapPickerPanel({ session }: MapPickerContentProps) {
  const { KeyboardViewport } = getAmapHost().keyboard;
  const state = useStore(session.store);
  const searchRef = useRef<React.ComponentRef<typeof Input>>(null);
  useEffect(() => {
    if (state.searchActive) searchRef.current?.focus();
  }, [state.searchActive]);
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, controls } = session;
  const visible = config.panel?.visible !== false;
  const lane = state[state.candidateSource];
  const items =
    lane.result?.status === 'success' ? lane.result.data.items : undefined;
  const selectedPlace = state.selection
    ? { ...state.selection.place, location: state.selection.coordinates }
    : undefined;
  const loading =
    lane.status === 'loading' ||
    (state.initialLocationPending &&
      state.candidateSource === 'scenario' &&
      lane.status === 'idle');
  const additionalOptions =
    visible && !loading
      ? config.panel?.renderAdditionalOptions?.({
          selection: state.selection,
          searchActive: state.searchActive,
          controls,
        })
      : null;
  let emptyTitle =
    state.candidateSource === 'search' ? '输入关键词搜索地点' : '尚未查询地点';
  if (lane.status === 'success')
    emptyTitle = items === undefined ? '暂无列表数据' : '没有找到地点';
  if (lane.status === 'cancelled') emptyTitle = '查询已取消';
  if (lane.status === 'failed' || lane.status === 'exception')
    emptyTitle = lane.message ?? '地点查询失败，请重试';
  return (
    <KeyboardViewport
      style={styles.panel}
      active={state.searchActive}
      testID="map-picker-panel"
    >
      <View style={styles.head}>
        <View style={styles.searchRow}>
          {state.searchActive && config.search ? (
            <View style={styles.searchInput}>
              <Input
                ref={searchRef}
                accessibilityLabel="搜索地点"
                accessibilityRole="search"
                returnKeyType="search"
                leading={{ kind: 'icon', icon: SearchOutlined, size: 18 }}
                placeholder="搜索地点"
                value={state.searchText}
                onChangeText={session.changeSearchText}
              />
            </View>
          ) : (
            <View style={styles.summaryBody}>
              {visible && selectedPlace ? (
                <MapPickerCandidate
                  place={selectedPlace}
                  presentation={state.selectionPresentation}
                  summary
                />
              ) : visible && !loading ? (
                <View style={styles.summary}>
                  <View style={styles.summaryIcon}>
                    <MapPickerGlyph name="selection" color={colors.primary} />
                  </View>
                  <Text
                    style={[styles.title, styles.summaryBody]}
                    numberOfLines={1}
                  >
                    {config.panel?.unselectedTitle ??
                      MAP_PICKER_UNSELECTED_TITLE}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          {config.search ? (
            <IconButton
              variant="glass"
              icon={state.searchActive ? CloseOutlined : SearchOutlined}
              color={colors.foreground}
              surfaceSize={40}
              iconSize={22}
              style={styles.searchButton}
              accessibilityLabel={state.searchActive ? '关闭搜索' : '搜索地点'}
              onPress={() => {
                if (state.searchActive) {
                  searchRef.current?.blur();
                  controls.exitSearch();
                } else {
                  session.enterSearch();
                }
              }}
            />
          ) : null}
        </View>
        {state.localError ? (
          <View style={styles.error}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {state.localError}
            </Text>
          </View>
        ) : null}
        <MapPickerLocationSettings session={session} />
        {state.candidateSource === 'search' && !loading && !!items?.length ? (
          <Text style={styles.label}>搜索结果 · {items.length} 个</Text>
        ) : null}
      </View>
      {visible ? (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {loading ? (
            <MapPickerSkeleton />
          ) : items?.length ? (
            items.map((place, index) => (
              <React.Fragment key={index}>
                <MapPickerCandidate
                  place={place}
                  selection={state.selection}
                  presentation={state.selectionPresentation}
                  onSelect={() => {
                    const coordinates = selectableCoordinates(place);
                    if (!coordinates) return;
                    session.selectCandidate(place);
                    controls.setCenter(coordinates).catch(() => {
                      session.reportOperationError();
                    });
                  }}
                />
                {index === 0 ? additionalOptions : null}
              </React.Fragment>
            ))
          ) : (
            <>
              {additionalOptions}
              <View style={styles.empty}>
                <Empty title={emptyTitle} icon={LocationOutlined} />
                {lane.status === 'failed' || lane.status === 'exception' ? (
                  <Button
                    label="重试"
                    variant="secondary"
                    size="sm"
                    onPress={() => session.retryCandidates()}
                    style={styles.retry}
                  />
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      ) : null}
    </KeyboardViewport>
  );
}
