import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '@unif/react-native-design';
import { MapPicker } from '@amap/MapPicker';
import { getCurrentLocation } from '@amap/location';
jest.mock('expo-gaode-map', () => {
  throw new Error('SDK unavailable');
});
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
test('SDK 不可装载时选点 unavailable，不发起初始定位', async () => {
  const onResult = jest.fn();
  await render(
    <ThemeProvider>
      <MapPicker
        onResult={onResult}
        initialLocationRequest={{ includeAddress: false }}
      />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(onResult).toHaveBeenCalledWith({
    status: 'failed',
    error: { reason: 'unavailable', message: '地图暂时不可用，请稍后重试' },
  });
  expect(getCurrentLocation).not.toHaveBeenCalled();
});
