import React, { StrictMode, useEffect, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { openMapPicker } from '@amap/MapPicker/openMapPicker.web';
import { MapPicker } from '@amap/MapPicker/MapPicker.web';
import { MapPickerHost } from '@amap/MapPicker/MapPickerHost.web';

jest.mock('expo-gaode-map', () => {
  throw new Error('Web must not load native map');
});
jest.mock('@amap/location', () => {
  throw new Error('Web must not load native location');
});
afterEach(async () => {
  await cleanup();
  await act(async () => {});
});

test('Web 合法 unavailable、非法 invalid_input、预取消 cancelled，不载入 native', async () => {
  await expect(openMapPicker({})).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'unavailable' },
  });
  await expect(
    openMapPicker({ initialQueryCenter: { latitude: NaN, longitude: 0 } }),
  ).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'invalid_input' },
  });
  const abort = new AbortController();
  abort.abort();
  await expect(openMapPicker({}, { signal: abort.signal })).resolves.toEqual({
    status: 'cancelled',
  });
  const tree = await render(<MapPickerHost />);
  expect(tree.toJSON()).toBeNull();
});
test('Web 直接组件 StrictMode 只交付一次 unavailable，卸载不重复交付', async () => {
  const onResult = jest.fn();
  const tree = await render(
    <StrictMode>
      <MapPicker onResult={onResult} />
    </StrictMode>,
  );
  await act(async () => {});
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith(
    expect.objectContaining({
      error: expect.objectContaining({ reason: 'unavailable' }),
    }),
  );
  await tree.unmount();
  await act(async () => {});
  expect(onResult).toHaveBeenCalledTimes(1);
});
test('Web 直接组件交付前卸载只交付 cancelled', async () => {
  const onResult = jest.fn();
  function ClosingHost() {
    const [visible, setVisible] = useState(true);
    useEffect(() => setVisible(false), []);
    return visible ? <MapPicker onResult={onResult} /> : null;
  }
  const tree = await render(<ClosingHost />);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  await tree.unmount();
  expect(onResult).toHaveBeenCalledTimes(1);
});
