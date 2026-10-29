import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Config from 'react-native-config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Button, ThemeProvider } from '@unif/react-native-design';
import {
  configureAmapHost,
  getCurrentLocation,
  initializeGaode,
  MapPickerHost,
  openAmap,
  openMapPicker,
  searchAround,
  searchByKeyword,
} from '@unif/react-native-amap';
import * as keyboard from './host/keyboard';
import { getPermissionAccess } from './host/permissions';
import { canOpenExternalUrl, openExternalUrl } from './host/externalUrl';

configureAmapHost({
  getPermissionAccess,
  keyboard,
  canOpenExternalUrl,
  openExternalUrl,
});
const center = { latitude: 30.2741, longitude: 120.1551 };

function Example() {
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState('尚未操作');
  const show = async (run: () => Promise<unknown>) => {
    try {
      setResult(JSON.stringify(await run(), null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : '操作失败');
    }
  };
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Unif AMap</Text>
        {!accepted ? (
          <>
            <Text>
              本示例使用高德地图
              SDK，定位时会申请前台位置权限。请先阅读高德隐私说明，并确认同意后继续。
            </Text>
            <Button
              label="查看高德隐私说明"
              onPress={() => {
                show(() =>
                  openExternalUrl('https://lbs.amap.com/pages/privacy/'),
                );
              }}
            />
            <Button
              label="同意并初始化"
              onPress={() => {
                initializeGaode({
                  iosKey: Config.AMAP_KEY_IOS,
                  androidKey: Config.AMAP_KEY_ANDROID,
                });
                setAccepted(true);
              }}
            />
          </>
        ) : (
          <>
            <Button
              label="打开地图选点"
              onPress={() => {
                show(() =>
                  openMapPicker({
                    initialCameraPosition: { target: center, zoom: 16 },
                    initialQueryCenter: center,
                    initialLocationRequest: { includeAddress: false },
                    onReady: (controls) => {
                      controls.loadCandidates((options) =>
                        searchAround(
                          {
                            center,
                            radiusMeters: 500,
                            keyword: '',
                            page: 1,
                            pageSize: 20,
                          },
                          options,
                        ),
                      );
                    },
                    search: {
                      debounceMs: 300,
                      query: (input, options) =>
                        searchByKeyword(
                          {
                            keyword: input.keyword,
                            center: input.queryCenter,
                            page: 1,
                            pageSize: 20,
                          },
                          options,
                        ),
                      onExit: (controls) => controls.restoreCandidates(),
                    },
                  }),
                );
              }}
            />
            <Button
              label="取得位置（不带地址）"
              onPress={() => {
                show(() => getCurrentLocation({ includeAddress: false }));
              }}
            />
            <Button
              label="打开高德应用"
              onPress={() => {
                show(() =>
                  openAmap(
                    { action: 'home' },
                    { sourceApplication: 'Unif AMap Example' },
                  ),
                );
              }}
            />
          </>
        )}
        <View accessibilityLiveRegion="polite">
          <Text selectable>{result}</Text>
        </View>
      </ScrollView>
      <MapPickerHost />
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <keyboard.KeyboardPresentationScope>
            <ThemeProvider>
              <Example />
            </ThemeProvider>
          </keyboard.KeyboardPresentationScope>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 18 },
  title: { fontSize: 28, fontWeight: '600' },
});
