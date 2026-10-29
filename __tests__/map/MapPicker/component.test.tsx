import React, { createRef, StrictMode } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  act,
  cleanup,
  fireEvent,
  render,
  userEvent,
  within,
} from '@testing-library/react-native';
import { ThemeProvider } from '@unif/react-native-design';
import { deferred } from './runtimeFixtures';
import { MapPicker, MapPickerHost, openMapPicker } from '@amap/MapPicker';
import type { MapPickerControls } from '@amap/MapPicker';
import { getCurrentLocation } from '@amap/location';
import { sdkMap, sdkRef, sdkMapMount, sdkCircleMount } from './uiFixture';

jest.mock('expo-gaode-map', () => require('./uiFixture'));
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));

const selection = {
  coordinates: { latitude: 30, longitude: 120 },
  place: { name: '已有选择' },
};

test('顶部操作浮在原地图视口，中心针与地图共用视口且保留罗盘', async () => {
  const tree = await render(
    <ThemeProvider>
      <MapPicker initialSelection={selection} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  const toolbar = tree.getByTestId('map-picker-controls');
  const viewport = tree.getByTestId('map-picker-map-block');
  expect(
    toolbar.queryAll((node) => node.props.testID === 'sdk-map'),
  ).toHaveLength(0);
  expect(
    viewport.queryAll((node) => node.props.accessibilityLabel === '返回')
      .length,
  ).toBeGreaterThan(0);
  expect(
    viewport.queryAll((node) => node.props.testID === 'sdk-map').length,
  ).toBeGreaterThan(0);
  expect(
    viewport.queryAll((node) => node.props.testID === 'map-picker-center-pin')
      .length,
  ).toBeGreaterThan(0);
  expect(StyleSheet.flatten(toolbar.props.style).top).toBeGreaterThanOrEqual(
    12,
  );
  expect(StyleSheet.flatten(toolbar.props.style).position).toBe('absolute');
  expect(toolbar.props.pointerEvents).toBe('box-none');
  expect(tree.getByTestId('sdk-map').props.compassEnabled).toBe(true);
  expect(tree.queryByTestId('sdk-marker')).toBeNull();
});
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
const strictModeWarnings: unknown[][] = [];
function knownStrictModeWarning(args: unknown[]) {
  return (
    args[0] ===
      '%s is deprecated in StrictMode. %s was passed an instance of %s which is inside StrictMode. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://react.dev/link/strict-mode-find-node' &&
    args[1] === 'findNodeHandle' &&
    args[2] === 'findNodeHandle' &&
    args[3] === 'View'
  );
}
let consoleErrors: jest.SpyInstance;
beforeEach(() => {
  const original = console.error;
  consoleErrors = jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (knownStrictModeWarning(args)) {
      strictModeWarnings.push(args);
      return;
    }
    original(...args);
  });
});
afterEach(async () => {
  await cleanup();
  await flush();
  expect(
    consoleErrors.mock.calls.filter((args) => !knownStrictModeWarning(args)),
  ).toEqual([]);
});
afterAll(() => {
  expect(strictModeWarnings).toHaveLength(1);
});

test('闲置宿主不挂地图或定位；无宿主时返回中文 unavailable', async () => {
  await expect(openMapPicker({})).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'unavailable' },
  });
  await render(
    <ThemeProvider>
      <MapPickerHost />
    </ThemeProvider>,
  );
  expect(sdkMap).not.toHaveBeenCalled();
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test('直接组件保留独立显示与选择，真实设计完成按钮交付一次', async () => {
  const onResult = jest.fn();
  const ref = createRef<MapPickerControls>();
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialSelection={selection}
        initialCameraPosition={{ target: { latitude: 31, longitude: 121 } }}
        onResult={onResult}
      />
    </ThemeProvider>,
  );
  expect(tree.getByText('已有选择')).toBeTruthy();
  expect(
    tree.getByTestId('sdk-map').props.initialCameraPosition.target.latitude,
  ).toBe(31);
  expect(tree.getByTestId('sdk-map').props.myLocationEnabled).toBe(false);
  expect(sdkRef.setCenter).not.toHaveBeenCalled();
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: 'success', selection });
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test('StrictMode 真实 ConfirmHost 注册后确认，取消确认保留选点', async () => {
  const onResult = jest.fn();
  const tree = await render(
    <StrictMode>
      <ThemeProvider>
        <MapPicker
          initialSelection={selection}
          getConfirmationOptions={() => ({ title: '确认地点' })}
          onResult={onResult}
        />
      </ThemeProvider>
    </StrictMode>,
  );
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  expect(tree.getByText('确认地点')).toBeTruthy();
  await userEvent.setup().press(tree.getByTestId('confirm-cancel'));
  await flush();
  expect(onResult).not.toHaveBeenCalled();
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  await userEvent.setup().press(tree.getByTestId('confirm-ok'));
  await flush();
  expect(onResult).toHaveBeenCalledWith({ status: 'success', selection });
});

test('非法直接输入和预先取消函数请求均不挂地图，不触发定位', async () => {
  const onResult = jest.fn();
  await render(
    <ThemeProvider>
      <MapPicker
        initialSelection={{ coordinates: { latitude: NaN, longitude: 0 } }}
        initialLocationRequest={{ includeAddress: false }}
        onResult={onResult}
      />
    </ThemeProvider>,
  );
  await flush();
  expect(onResult).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'failed',
      error: expect.objectContaining({ reason: 'invalid_input' }),
    }),
  );
  const controller = new AbortController();
  controller.abort();
  await expect(
    openMapPicker({}, { signal: controller.signal }),
  ).resolves.toEqual({ status: 'cancelled' });
  await expect(
    openMapPicker({ initialQueryCenter: { latitude: Infinity, longitude: 1 } }),
  ).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'invalid_input' },
  });
  expect(sdkMap).not.toHaveBeenCalled();
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test('函数入口接替旧轮，旧 signal 不关闭新轮，Modal 内同链路完成', async () => {
  const tree = await render(
    <ThemeProvider forceScheme="dark" fontScale={1.35}>
      <MapPickerHost />
    </ThemeProvider>,
  );
  const controller = new AbortController();
  let first!: ReturnType<typeof openMapPicker>;
  let second!: ReturnType<typeof openMapPicker>;
  await act(() => {
    first = openMapPicker(
      { initialSelection: selection },
      { signal: controller.signal },
    );
  });
  await flush();
  await act(() => {
    second = openMapPicker({
      initialSelection: selection,
      getConfirmationOptions: () => ({ title: '函数确认' }),
    });
  });
  await expect(first).resolves.toEqual({ status: 'cancelled' });
  await act(() => controller.abort());
  expect(tree.getByTestId('sdk-map').props.mapType).toBe(3);
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  expect(tree.getByText('函数确认')).toBeTruthy();
  await userEvent.setup().press(tree.getByTestId('confirm-ok'));
  await flush();
  await expect(second).resolves.toEqual({ status: 'success', selection });
  expect(tree.queryByTestId('sdk-map')).toBeNull();
});

test('真实卸载结算 cancelled，StrictMode 重放不结束或重复初始定位', async () => {
  const onResult = jest.fn();
  jest
    .mocked(getCurrentLocation)
    .mockImplementation(() => new Promise(() => {}));
  const tree = await render(
    <StrictMode>
      <ThemeProvider>
        <MapPicker
          initialLocationRequest={{ includeAddress: false }}
          onResult={onResult}
        />
      </ThemeProvider>
    </StrictMode>,
  );
  await flush();
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
  expect(tree.getByText('正在定位')).toBeTruthy();
  expect(onResult).not.toHaveBeenCalled();
  await tree.unmount();
  await flush();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});

test.each(['cancelled', 'failed'] as const)(
  '初始定位 %s 结束真实 busy，合法显式选择与手势保留',
  async (status) => {
    jest
      .mocked(getCurrentLocation)
      .mockResolvedValue(
        status === 'cancelled'
          ? { status }
          : { status, error: { reason: 'unavailable', message: '外部错误' } },
      );
    const tree = await render(
      <ThemeProvider>
        <MapPicker
          initialSelection={selection}
          initialLocationRequest={{ includeAddress: false }}
          onResult={jest.fn()}
        />
      </ThemeProvider>,
    );
    await flush();
    expect(tree.queryByText('正在定位')).toBeNull();
    expect(tree.getByText('已有选择')).toBeTruthy();
    expect(tree.getByTestId('sdk-map').props.scrollGesturesEnabled).toBe(true);
    if (status === 'failed')
      expect(tree.getByText('获取位置失败，请重试')).toBeTruthy();
  },
);

test('缺坐标与重复ID完整展示；实际行选择资料、评分距离楼层保留，聚焦失败不清选择', async () => {
  const ref = createRef<MapPickerControls>();
  const changed = jest.fn();
  const tree = await render(
    <ThemeProvider>
      <MapPicker ref={ref} onSelectionChange={changed} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {
        items: [
          { id: 'same', name: '资料行' },
          {
            id: 'same',
            name: '地点甲',
            location: { latitude: 0, longitude: 0 },
            distanceMeters: 0,
            business: { rating: '4.7' },
            address: '实际地址',
            indoor: { floorName: '二层' },
          },
          {
            id: 'same',
            name: '地点乙',
            location: { latitude: 1, longitude: 1 },
          },
        ],
      },
    }));
  });
  expect(
    tree.getByRole('button', { name: /资料行/ }).props.accessibilityState
      .disabled,
  ).toBe(true);
  expect(tree.getByText('4.7', { includeHiddenElements: true })).toBeTruthy();
  expect(tree.getByText('100m内')).toBeTruthy();
  expect(tree.getByText('实际地址 二层')).toBeTruthy();
  sdkRef.setCenter.mockRejectedValueOnce(new Error('secret position'));
  await userEvent.setup().press(tree.getByRole('button', { name: /地点甲/ }));
  await flush();
  expect(changed).toHaveBeenCalledWith(
    expect.objectContaining({
      coordinates: { latitude: 0, longitude: 0 },
      place: expect.objectContaining({ id: 'same', name: '地点甲' }),
    }),
  );
  expect(changed.mock.calls[0][0].place).not.toHaveProperty('location');
  expect(
    tree.getByRole('button', { name: /地点甲/ }).props.accessibilityState
      .selected,
  ).toBe(true);
  expect(
    tree.getByRole('button', { name: /地点乙/ }).props.accessibilityState
      .selected,
  ).toBe(false);
  expect(tree.getByText('操作失败，请重试')).toBeTruthy();
});

test('真实搜索输入切换、清空、退出恢复，不自动查询；panel隐藏仍可搜索', async () => {
  const ref = createRef<MapPickerControls>();
  const query = jest.fn(async () => ({
    status: 'success' as const,
    data: { items: [] },
  }));
  const onClear = jest.fn();
  const onExit = jest.fn((controls: MapPickerControls) =>
    controls.restoreCandidates(),
  );
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        panel={{ visible: false }}
        search={{ debounceMs: 0, query, onClear, onExit }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  expect(query).not.toHaveBeenCalled();
  expect(tree.queryByPlaceholderText('搜索地点')).toBeNull();
  await fireEvent.press(tree.getByRole('button', { name: '搜索地点' }));
  expect(tree.queryByRole('button', { name: '放大' })).toBeNull();
  await fireEvent.changeText(tree.getByLabelText('搜索地点'), ' 商店 ');
  await flush();
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0]).toEqual([
    expect.objectContaining({ keyword: '商店' }),
    expect.objectContaining({ signal: expect.anything() }),
  ]);
  await fireEvent.changeText(tree.getByLabelText('搜索地点'), '');
  expect(onClear).toHaveBeenCalledTimes(1);
  await userEvent.setup().press(tree.getByRole('button', { name: '关闭搜索' }));
  expect(tree.queryByPlaceholderText('搜索地点')).toBeNull();
  expect(tree.getByRole('button', { name: '搜索地点' })).toBeTruthy();
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(tree.getByRole('button', { name: '放大' })).toBeTruthy();
});

test('缩放读取实际视野再钳制，缺 zoom 不猜值；原事件与真实拖动分离', async () => {
  const onCameraIdle = jest.fn();
  const onMapPress = jest.fn();
  const drag = jest.fn();
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        onResult={jest.fn()}
        onCameraIdle={onCameraIdle}
        onMapPress={onMapPress}
        onUserDragEnd={drag}
      />
    </ThemeProvider>,
  );
  sdkRef.getCameraPosition.mockResolvedValueOnce({ zoom: 20 });
  await userEvent.setup().press(tree.getByRole('button', { name: '放大' }));
  await flush();
  expect(sdkRef.setZoom).toHaveBeenCalledWith(20, true);
  sdkRef.getCameraPosition.mockResolvedValueOnce({} as { zoom: number });
  await userEvent.setup().press(tree.getByRole('button', { name: '缩小' }));
  await flush();
  expect(sdkRef.setZoom).toHaveBeenCalledTimes(1);
  expect(tree.getByText('操作失败，请重试')).toBeTruthy();
  const event = { nativeEvent: { latitude: 4, longitude: 5 } };
  await fireEvent(tree.getByTestId('sdk-map'), 'cameraIdle', event);
  await fireEvent(tree.getByTestId('sdk-map'), 'mapPress', event);
  expect(onCameraIdle).toHaveBeenCalledWith(event);
  expect(onMapPress).toHaveBeenCalledWith(event);
  expect(drag).not.toHaveBeenCalled();
  await fireEvent(tree.getByTestId('sdk-map'), 'userDragStart', event);
  await fireEvent(tree.getByTestId('sdk-map'), 'userDragEnd', event);
  expect(drag).toHaveBeenCalledWith(
    { latitude: 4, longitude: 5 },
    expect.anything(),
  );
});

test('Circle 整体替换删除原生可选字段仅重建圈；手势更新不重建，回调独立更新', async () => {
  const ref = createRef<MapPickerControls>();
  const firstPress = jest.fn();
  const nextPress = jest.fn();
  const circle = {
    center: { latitude: 1, longitude: 2 },
    radius: 100,
    strokeWidth: 7,
    zIndex: 9,
    onCirclePress: firstPress,
  };
  const tree = await render(
    <ThemeProvider>
      <MapPicker ref={ref} initialDisplay={{ circle }} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  expect(sdkCircleMount).toHaveBeenCalledTimes(1);
  await act(() => ref.current!.updateDisplay({ scrollGesturesEnabled: false }));
  expect(sdkCircleMount).toHaveBeenCalledTimes(1);
  await act(() =>
    ref.current!.updateDisplay({
      circle: { ...circle, onCirclePress: nextPress },
    }),
  );
  await fireEvent(tree.getByTestId('sdk-circle'), 'circlePress', {});
  expect(nextPress).toHaveBeenCalledTimes(1);
  expect(firstPress).not.toHaveBeenCalled();
  expect(sdkCircleMount).toHaveBeenCalledTimes(1);
  await act(() =>
    ref.current!.updateDisplay({
      circle: { center: circle.center, radius: 100 },
    }),
  );
  expect(tree.getByTestId('sdk-circle').props.strokeWidth).toBeUndefined();
  expect(tree.getByTestId('sdk-circle').props.zIndex).toBeUndefined();
  expect(sdkCircleMount).toHaveBeenCalledTimes(2);
  expect(sdkMapMount).toHaveBeenCalledTimes(1);
});

test('确认期间改选释放旧 DS Host，旧确定动作不能确认新选择', async () => {
  const ref = createRef<MapPickerControls>();
  const onResult = jest.fn();
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialSelection={selection}
        onResult={onResult}
        getConfirmationOptions={(value) => ({
          title: `确认${value.place?.name}`,
        })}
      />
    </ThemeProvider>,
  );
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  const oldAccept = tree
    .getByTestId('confirm-ok')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(() =>
    ref.current!.setSelection({
      coordinates: { latitude: 2, longitude: 3 },
      place: { name: '新选择' },
    }),
  );
  await flush();
  expect(tree.queryByText('确认已有选择')).toBeNull();
  await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
  await flush();
  await act(() => oldAccept());
  await flush();
  expect(onResult).not.toHaveBeenCalled();
  expect(tree.getByText('确认新选择')).toBeTruthy();
  await userEvent.setup().press(tree.getByTestId('confirm-ok'));
  await flush();
  expect(onResult).toHaveBeenCalledWith(
    expect.objectContaining({
      selection: expect.objectContaining({ place: { name: '新选择' } }),
    }),
  );
});

test('异步完成校验的旧结果不放行改选；重复完成只执行一次', async () => {
  const ref = createRef<MapPickerControls>();
  const onResult = jest.fn();
  const checked = deferred<{ canConfirm: true }>();
  const beforeConfirm = jest.fn(() => checked.promise);
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        initialSelection={selection}
        onResult={onResult}
        beforeConfirm={beforeConfirm}
      />
    </ThemeProvider>,
  );
  const done = tree.getByRole('button', { name: '完成' });
  await userEvent.setup().press(done);
  await userEvent.setup().press(done);
  expect(beforeConfirm).toHaveBeenCalledTimes(1);
  await act(() =>
    ref.current!.setSelection({ coordinates: { latitude: 1, longitude: 1 } }),
  );
  await act(async () => checked.resolve({ canConfirm: true }));
  expect(onResult).not.toHaveBeenCalled();
  expect(
    tree.getByRole('button', { name: '完成' }).props.accessibilityState
      .disabled,
  ).toBe(false);
});

test.each([
  ['有候选', ['第一候选', '场景选项', '第二候选']],
  ['无候选', ['场景选项']],
  ['加载中', []],
] as const)('附加选项在可滚动候选列表中，%s', async (phase, expected) => {
  const ref = createRef<MapPickerControls>();
  const tree = await render(
    <ThemeProvider>
      <MapPicker
        ref={ref}
        panel={{ renderAdditionalOptions: () => <Text>场景选项</Text> }}
        onResult={jest.fn()}
      />
    </ThemeProvider>,
  );
  const pending =
    deferred<Awaited<ReturnType<MapPickerControls['loadCandidates']>>>();
  let loading: ReturnType<MapPickerControls['loadCandidates']> | undefined;
  if (phase === '加载中')
    await act(() => {
      loading = ref.current!.loadCandidates(() => pending.promise);
    });
  else
    await act(async () => {
      await ref.current!.loadCandidates(async () => ({
        status: 'success',
        data: {
          items:
            phase === '有候选'
              ? [
                  {
                    id: 'first',
                    name: '第一候选',
                    location: selection.coordinates,
                  },
                  {
                    id: 'second',
                    name: '第二候选',
                    location: selection.coordinates,
                  },
                ]
              : [],
        },
      }));
    });
  const [list] = tree
    .getByTestId('map-picker-panel')
    .queryAll((node) => node.props.keyboardDismissMode === 'interactive');
  expect(list).toBeDefined();
  expect(
    within(list)
      .queryAllByText(/^(第一候选|场景选项|第二候选)$/)
      .map((node) => node.props.children),
  ).toEqual(expected);
  if (phase === '加载中') {
    expect(tree.queryByText('场景选项')).toBeNull();
    await act(async () => {
      pending.resolve({ status: 'success', data: { items: [] } });
      await loading;
    });
  }
});

test('真正的空列表、未取得列表、查询失败、取消与初始未查询分别展示', async () => {
  const ref = createRef<MapPickerControls>();
  const tree = await render(
    <ThemeProvider>
      <MapPicker ref={ref} onResult={jest.fn()} />
    </ThemeProvider>,
  );
  expect(tree.getByText('尚未查询地点')).toBeTruthy();
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: {},
    }));
  });
  expect(tree.getByText('暂无列表数据')).toBeTruthy();
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'success',
      data: { items: [] },
    }));
  });
  expect(tree.getByText('没有找到地点')).toBeTruthy();
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({
      status: 'failed',
      error: { reason: 'unavailable', message: 'raw private error' },
    }));
  });
  expect(tree.getByText('地点查询失败，请重试')).toBeTruthy();
  await act(async () => {
    await ref.current!.loadCandidates(async () => ({ status: 'cancelled' }));
  });
  expect(tree.getByText('查询已取消')).toBeTruthy();
});

test('定位同步异常和异步拒绝均结束 busy，仍能完成已有选择', async () => {
  for (const kind of ['sync', 'async']) {
    jest.mocked(getCurrentLocation).mockImplementationOnce(() => {
      if (kind === 'sync') throw new Error('private');
      return Promise.reject(new Error('private'));
    });
    const result = jest.fn();
    const tree = await render(
      <ThemeProvider>
        <MapPicker
          initialLocationRequest={{ includeAddress: true }}
          initialSelection={selection}
          onResult={result}
        />
      </ThemeProvider>,
    );
    await flush();
    expect(tree.queryByText('正在定位')).toBeNull();
    expect(tree.getByText('获取位置失败，请重试')).toBeTruthy();
    await userEvent.setup().press(tree.getByRole('button', { name: '完成' }));
    await flush();
    expect(result).toHaveBeenCalledWith({ status: 'success', selection });
    await tree.unmount();
    await flush();
  }
});

test('两个真实确认宿主接管后，旧请求释放和旧地图卸载不关闭新确认', async () => {
  const first = jest.fn();
  const second = jest.fn();
  const firstConfig = {
    initialSelection: selection,
    getConfirmationOptions: () => ({ title: '第一轮确认' }),
    onResult: first,
  };
  const secondConfig = {
    initialSelection: selection,
    getConfirmationOptions: () => ({ title: '第二轮确认' }),
    onResult: second,
  };
  const tree = await render(
    <ThemeProvider>
      <MapPicker key="a" {...firstConfig} />
      <MapPicker key="b" {...secondConfig} />
    </ThemeProvider>,
  );
  await userEvent
    .setup()
    .press(tree.getAllByRole('button', { name: '完成' })[0]);
  await flush();
  expect(tree.getByText('第一轮确认')).toBeTruthy();
  await userEvent.setup().press(
    tree.getAllByRole('button', {
      name: '完成',
      includeHiddenElements: true,
    })[1],
  );
  await flush();
  expect(tree.getByText('第二轮确认')).toBeTruthy();
  await tree.rerender(
    <ThemeProvider>
      <MapPicker key="b" {...secondConfig} />
    </ThemeProvider>,
  );
  await flush();
  expect(first).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(second).not.toHaveBeenCalled();
  await userEvent.setup().press(tree.getByTestId('confirm-ok'));
  await flush();
  expect(second).toHaveBeenCalledWith({ status: 'success', selection });
});

test('函数宿主真实卸载取消所属轮；其他宿主卸载不影响当前窗口', async () => {
  const tree = await render(
    <StrictMode>
      <ThemeProvider>
        <MapPickerHost key="a" />
        <MapPickerHost key="b" />
      </ThemeProvider>
    </StrictMode>,
  );
  let pending!: ReturnType<typeof openMapPicker>;
  await act(() => {
    pending = openMapPicker({ initialSelection: selection });
  });
  await flush();
  expect(tree.getByText('已有选择')).toBeTruthy();
  await tree.rerender(
    <StrictMode>
      <ThemeProvider>
        <MapPickerHost key="b" />
      </ThemeProvider>
    </StrictMode>,
  );
  await flush();
  expect(tree.getByText('已有选择')).toBeTruthy();
  await tree.unmount();
  await flush();
  await expect(pending).resolves.toEqual({ status: 'cancelled' });
  await expect(openMapPicker({})).resolves.toMatchObject({
    status: 'failed',
    error: { reason: 'unavailable' },
  });
});

test('函数窗口在真正挂载前取消，无地图或定位；完成按钮可隐藏', async () => {
  const tree = await render(
    <ThemeProvider>
      <MapPickerHost />
    </ThemeProvider>,
  );
  const cancel = new AbortController();
  let pending!: ReturnType<typeof openMapPicker>;
  await act(() => {
    pending = openMapPicker(
      { initialLocationRequest: { includeAddress: false } },
      { signal: cancel.signal },
    );
    cancel.abort();
  });
  await expect(pending).resolves.toEqual({ status: 'cancelled' });
  expect(sdkMap).not.toHaveBeenCalled();
  expect(getCurrentLocation).not.toHaveBeenCalled();
  await act(() => {
    pending = openMapPicker({ showCompleteButton: false });
  });
  await flush();
  expect(tree.queryByRole('button', { name: '完成' })).toBeNull();
  await userEvent.setup().press(tree.getByRole('button', { name: '返回' }));
  await expect(pending).resolves.toEqual({ status: 'cancelled' });
});

test('分屏读取实际根高度；主题与字体变化进入地图和真实摘要，当前选择不依赖候选页', async () => {
  const result = jest.fn();
  const tree = await render(
    <ThemeProvider forceScheme="light" fontScale={1}>
      <MapPicker onResult={result} initialSelection={selection} />
    </ThemeProvider>,
  );
  const fontSize = StyleSheet.flatten(
    tree.getByText('已有选择').props.style,
  ).fontSize;
  await fireEvent(tree.getByTestId('map-picker'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 400 } },
  });
  expect(
    StyleSheet.flatten(tree.getByTestId('map-picker-map-block').props.style)
      .height,
  ).toBeCloseTo(220);
  await tree.rerender(
    <ThemeProvider forceScheme="dark" fontScale={1.35}>
      <MapPicker onResult={result} initialSelection={selection} />
    </ThemeProvider>,
  );
  expect(tree.getByTestId('sdk-map').props.mapType).toBe(3);
  expect(
    StyleSheet.flatten(tree.getByText('已有选择').props.style).fontSize,
  ).toBeCloseTo(fontSize * 1.35);
  expect(sdkMapMount).toHaveBeenCalledTimes(1);
});
