import React, { createRef } from 'react';
import {
  userEvent,
  act,
  fireEvent,
  render,
} from '@testing-library/react-native';
import { ThemeProvider, lightColors } from '@unif/react-native-design';
import { MapPicker } from '@amap/MapPicker';
import type { MapPickerControls } from '@amap/MapPicker';
import type { PlaceQueryResult, PlaceSearchPage } from '@amap/places';
import { deferred } from './runtimeFixtures';
import { sdkRef } from './uiFixture';
import { getCurrentLocation } from '@amap/location';
import { getPermissionAccess } from '@amap/host/permissions';
import type { GetCurrentLocationResult } from '@amap/location';

jest.mock('expo-gaode-map', () => require('./uiFixture'));
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
jest.mock('@amap/host/permissions', () => ({
  getPermissionAccess: jest.fn(),
}));

test('定位尚未完成时已返回候选照常可选，候选失败仍能显式重试', async () => {
  const location = deferred<GetCurrentLocationResult>();
  jest.mocked(getCurrentLocation).mockReturnValueOnce(location.promise);
  const ref = createRef<MapPickerControls>();
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialLocationRequest={{ includeAddress: false }}
        initialQueryCenter={{ latitude: 30, longitude: 120 }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {
        items: [
          { name: '已返回地点', location: { latitude: 30, longitude: 120 } },
        ],
      },
    }));
  });
  expect(page.getByRole('button', { name: /已返回地点/ })).toBeTruthy();
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'failed',
      error: { reason: 'unavailable', message: 'failed' },
    }));
  });
  expect(page.getByRole('button', { name: '重试' })).toBeTruthy();
  await act(async () => location.resolve({ status: 'cancelled' }));
});

test('定位权限拒绝提供系统设置入口，打开失败可再试且不自动重新定位', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValueOnce({
    status: 'failed',
    error: { reason: 'permission_denied', message: '定位权限被拒绝' },
  });
  const permissions = {
    read: jest.fn(),
    request: jest.fn(),
    openSettings: jest
      .fn()
      .mockRejectedValueOnce(new Error('settings failed'))
      .mockResolvedValue(undefined),
  };
  jest.mocked(getPermissionAccess).mockReturnValue(permissions);
  const page = await render(
    <ThemeProvider>
      <MapPicker
        initialLocationRequest={{ includeAddress: false }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(permissions.openSettings).not.toHaveBeenCalled();
  await act(
    async () =>
      await userEvent
        .setup()
        .press(page.getByRole('button', { name: '去系统设置开启定位权限' })),
  );
  expect(page.getByText('无法打开系统设置，请稍后重试')).toBeTruthy();
  await act(
    async () =>
      await userEvent
        .setup()
        .press(page.getByRole('button', { name: '去系统设置开启定位权限' })),
  );
  expect(permissions.openSettings).toHaveBeenCalledTimes(2);
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
  expect(permissions.request).not.toHaveBeenCalled();
  expect(page.getByTestId('sdk-map').props.scrollGesturesEnabled).toBe(true);
});

test('地点行恢复分类色、星级及距离格式，选择仍交付原始地点资料', async () => {
  const ref = createRef<MapPickerControls>();
  const onSelectionChange = jest.fn();
  const page = await render(
    <ThemeProvider forceScheme="light">
      <MapPicker
        ref={ref}
        onSelectionChange={onSelectionChange}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  const place = {
    id: 'food',
    name: '餐厅',
    typeCode: '050100',
    location: { latitude: 30, longitude: 120 },
    distanceMeters: 1435,
    business: { rating: '4' },
    address: '测试路',
    indoor: { floorName: '二层' },
  };
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: { items: [place] },
    }));
  });
  expect(page.getByText('4.0')).toBeTruthy();
  expect(page.getByText('1.4km')).toBeTruthy();
  expect(page.getByText('测试路 二层')).toBeTruthy();
  expect(
    page.getByTestId('map-place-icon-food', { includeHiddenElements: true })
      .props,
  ).toMatchObject({ width: 20, stroke: lightColors.error });
  await userEvent.setup().press(page.getByRole('button', { name: /餐厅/ }));
  expect(onSelectionChange).toHaveBeenCalledWith({
    coordinates: place.location,
    place: expect.objectContaining({
      distanceMeters: 1435,
      business: { rating: '4' },
    }),
  });
  expect(sdkRef.setCenter).toHaveBeenCalledWith(place.location, undefined);
  expect(
    page.getByRole('button', { name: /餐厅/, selected: true }),
  ).toBeTruthy();
  expect(page.getAllByText('POI选点')).toHaveLength(1);
});

test('原选择仅在上方摘要保留来源标签', async () => {
  const ref = createRef<MapPickerControls>();
  const selection = {
    coordinates: { latitude: 30, longitude: 120 },
    place: { id: 'original', name: '初始地点', address: '初始地址' },
  };
  const page = await render(
    <ThemeProvider>
      <MapPicker ref={ref} initialSelection={selection} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {
        items: [{ ...selection.place, location: selection.coordinates }],
      },
    }));
  });

  expect(page.getAllByText('原选位置')).toHaveLength(1);
});

test('搜索候选退出后在摘要保留搜索来源且恢复原候选顺序', async () => {
  const ref = createRef<MapPickerControls>();
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        search={{
          debounceMs: 0,
          query: async () => ({
            status: 'success',
            data: {
              items: [
                {
                  id: 'search',
                  name: '搜索地点',
                  location: { latitude: 31, longitude: 121 },
                },
              ],
            },
          }),
          onExit: (controls) => controls.restoreCandidates(),
        }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {
        items: [
          {
            id: 'a',
            name: '候选甲',
            location: { latitude: 30, longitude: 120 },
          },
          {
            id: 'b',
            name: '候选乙',
            location: { latitude: 30.1, longitude: 120.1 },
          },
        ],
      },
    }));
  });
  expect(page.queryByPlaceholderText('搜索地点')).toBeNull();
  await fireEvent.press(page.getByRole('button', { name: '搜索地点' }));
  await fireEvent.changeText(page.getByLabelText('搜索地点'), '咖啡');
  await act(async () => {});
  await userEvent.setup().press(page.getByRole('button', { name: /搜索地点/ }));
  await userEvent.setup().press(page.getByRole('button', { name: '关闭搜索' }));

  expect(page.queryByPlaceholderText('搜索地点')).toBeNull();
  expect(page.getByText('POI选点')).toBeTruthy();
  expect(
    page
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel)
      .filter((label) => label?.startsWith('候选')),
  ).toEqual(['候选甲，商超', '候选乙，商超']);
});

test('坐标选点摘要显示真实地址与地图来源且结果不伪造地点', async () => {
  const ref = createRef<MapPickerControls>();
  const onResult = jest.fn();
  const page = await render(
    <ThemeProvider>
      <MapPicker ref={ref} onResult={onResult} />
    </ThemeProvider>,
  );
  const setSelection = ref.current!.setSelection as (
    selection: { coordinates: { latitude: number; longitude: number } },
    presentation: { address: string; source: 'map' },
  ) => boolean;

  await act(() => {
    expect(
      setSelection(
        { coordinates: { latitude: 30, longitude: 120 } },
        { address: '测试地址', source: 'map' },
      ),
    ).toBe(true);
  });

  expect(page.getByText('测试地址')).toBeTruthy();
  expect(page.getByText('地图选点')).toBeTruthy();
  await userEvent.setup().press(page.getByRole('button', { name: '完成' }));
  await act(async () => {});
  expect(onResult).toHaveBeenCalledWith({
    status: 'success',
    selection: { coordinates: { latitude: 30, longitude: 120 } },
  });
});

test('同坐标改选未交展示资料时清除旧地址和来源', async () => {
  const ref = createRef<MapPickerControls>();
  const page = await render(
    <ThemeProvider>
      <MapPicker ref={ref} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  const setSelection = ref.current!.setSelection as (
    selection: { coordinates: { latitude: number; longitude: number } },
    presentation?: { address: string; source: 'map' },
  ) => boolean;

  await act(() => {
    setSelection(
      { coordinates: { latitude: 30, longitude: 120 } },
      { address: '旧地址', source: 'map' },
    );
  });
  expect(page.getByText('旧地址')).toBeTruthy();
  expect(page.getByText('地图选点')).toBeTruthy();

  await act(() => {
    setSelection({ coordinates: { latitude: 30, longitude: 120 } });
  });
  expect(page.queryByText('旧地址')).toBeNull();
  expect(page.queryByText('地图选点')).toBeNull();
});

test('选择通知同步重入只保留最终采用选择的展示资料', async () => {
  const ref = createRef<MapPickerControls>();
  const onSelectionChange = jest.fn(
    (selection: { coordinates: { latitude: number; longitude: number } }) => {
      if (selection.coordinates.latitude !== 30) return;
      const setSelection = ref.current!.setSelection as (
        value: { coordinates: { latitude: number; longitude: number } },
        presentation: { address: string; source: 'map' },
      ) => boolean;
      setSelection(
        { coordinates: { latitude: 31, longitude: 121 } },
        { address: '最终地址', source: 'map' },
      );
    },
  );
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        onSelectionChange={onSelectionChange}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  const setSelection = ref.current!.setSelection as (
    selection: { coordinates: { latitude: number; longitude: number } },
    presentation: { address: string; source: 'map' },
  ) => boolean;
  let adopted = true;

  await act(() => {
    adopted = setSelection(
      { coordinates: { latitude: 30, longitude: 120 } },
      { address: '已被接替地址', source: 'map' },
    );
  });

  expect(adopted).toBe(false);
  expect(page.getByText('最终地址')).toBeTruthy();
  expect(page.queryByText('已被接替地址')).toBeNull();
});

test('明确启用位置图层才显示蓝点，切换图层不替换选择或调用定位查询', async () => {
  const ref = createRef<MapPickerControls>();
  const selected = {
    coordinates: { latitude: 30, longitude: 120 },
    place: { name: '所选位置' },
  };
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialDisplay={{ myLocationEnabled: true }}
        initialSelection={selected}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  expect(page.getByTestId('sdk-map').props.myLocationEnabled).toBe(true);
  await act(() => ref.current!.updateDisplay({ myLocationEnabled: false }));
  expect(page.getByTestId('sdk-map').props.myLocationEnabled).toBe(false);
  expect(page.getByText('所选位置')).toBeTruthy();
  expect(sdkRef.setCenter).not.toHaveBeenCalled();
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test('失败面板的重试按钮实际重跑原查询，保留选点且不重新定位', async () => {
  const ref = createRef<MapPickerControls>();
  const retry = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest
    .fn()
    .mockResolvedValueOnce({
      status: 'failed',
      error: { reason: 'unavailable', message: 'service failed' },
    })
    .mockImplementationOnce(() => retry.promise);
  const onResult = jest.fn();
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialSelection={{
          coordinates: { latitude: 30, longitude: 120 },
          place: { name: '预选售点' },
        }}
        onResult={onResult}
      />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(query);
  });
  const button = page.getByRole('button', { name: '重试' });
  await act(async () => {
    await userEvent.setup().press(button);
    await userEvent.setup().press(button);
  });
  expect(query).toHaveBeenCalledTimes(2);
  expect(page.getAllByTestId(/map-poi-skeleton-row-/)).toHaveLength(4);
  await act(async () =>
    retry.resolve({
      status: 'success',
      data: {
        items: [
          { name: '重试返回地点', location: { latitude: 31, longitude: 121 } },
        ],
      },
    }),
  );
  expect(page.getByText('重试返回地点')).toBeTruthy();
  expect(page.getByText('预选售点')).toBeTruthy();
  expect(page.queryByRole('button', { name: '重试' })).toBeNull();
  expect(getCurrentLocation).not.toHaveBeenCalled();
  expect(sdkRef.setCenter).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
});

test('搜索聚焦收起当前摘要，等待查询显示骨架，结果显示本页数量，退出恢复原选择', async () => {
  const ref = createRef<MapPickerControls>();
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest.fn(() => pending.promise);
  const page = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialSelection={{
          coordinates: { latitude: 30, longitude: 120 },
          place: { name: '预选售点' },
        }}
        search={{
          debounceMs: 0,
          query,
          onExit: (controls) => controls.restoreCandidates(),
        }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {
        items: [
          { name: '附近商店', location: { latitude: 30, longitude: 120 } },
        ],
      },
    }));
  });
  expect(page.getByRole('button', { name: /附近商店/ })).toBeTruthy();
  expect(page.getByText('预选售点')).toBeTruthy();
  expect(page.queryByPlaceholderText('搜索地点')).toBeNull();
  await fireEvent.press(page.getByRole('button', { name: '搜索地点' }));
  expect(page.queryByText('预选售点')).toBeNull();
  expect(page.queryByRole('button', { name: /附近商店/ })).toBeNull();
  expect(query).not.toHaveBeenCalled();
  await fireEvent.changeText(page.getByLabelText('搜索地点'), '咖啡');
  expect(page.getAllByTestId(/map-poi-skeleton-row-/)).toHaveLength(4);
  await act(async () =>
    pending.resolve({
      status: 'success',
      data: {
        items: [
          { name: '咖啡甲', location: { latitude: 30, longitude: 120 } },
          { name: '咖啡乙', location: { latitude: 30.1, longitude: 120.1 } },
        ],
      },
    }),
  );
  expect(page.getByText('搜索结果 · 2 个')).toBeTruthy();
  expect(page.queryByRole('button', { name: /附近商店/ })).toBeNull();
  await fireEvent.changeText(page.getByLabelText('搜索地点'), '');
  expect(page.queryByRole('button', { name: /咖啡/ })).toBeNull();
  expect(page.queryByRole('button', { name: /附近商店/ })).toBeNull();
  expect(page.getByText('输入关键词搜索地点')).toBeTruthy();
  await userEvent.setup().press(page.getByRole('button', { name: '关闭搜索' }));
  expect(page.getByText('预选售点')).toBeTruthy();
  expect(page.getByRole('button', { name: /附近商店/ })).toBeTruthy();
  expect(query).toHaveBeenCalledTimes(1);
});
