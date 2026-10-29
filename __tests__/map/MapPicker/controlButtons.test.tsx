import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@unif/react-native-design';
import { MapPickerControlButton } from '@amap/MapPicker/MapPickerControlButton/MapPickerControlButton';

test('地图按钮保留40px表面和22px图标，命中区补足44px且忙碌时不重复调用', async () => {
  const onPress = jest.fn();
  const content = (busy = false) => (
    <ThemeProvider>
      <MapPickerControlButton
        glyph="locate"
        color="#123456"
        label="重新定位"
        style={{ width: 40, height: 40 }}
        busy={busy}
        onPress={onPress}
      />
    </ThemeProvider>
  );
  const page = await render(content());
  const button = page.getByRole('button', { name: '重新定位' });
  expect(StyleSheet.flatten(button.props.style)).toMatchObject({
    width: 40,
    height: 40,
  });
  expect(button.props.hitSlop).toEqual({
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
  });
  expect(
    page.container.queryAll(
      (node) => node.props.width === 22 && node.props.height === 22,
    ).length,
  ).toBeGreaterThan(0);
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
  await page.rerender(content(true));
  const busyButton = page.getByRole('button', { name: '重新定位' });
  expect(busyButton).toBeDisabled();
  expect(busyButton.props.accessibilityState.busy).toBe(true);
  await fireEvent.press(busyButton);
  expect(onPress).toHaveBeenCalledTimes(1);
});
