import {
  snapshotConfig,
  snapshotDisplay,
  snapshotSelection,
  snapshotSelectionPresentation,
  validateCamera,
  validateCoordinates,
  validatePoint,
} from '@amap/MapPicker/snapshotMapPickerInput';
import { MAP_PICKER_MESSAGES } from '@amap/MapPicker/constants';
import type {
  MapPickerConfig,
  MapPickerDisplayOptions,
  MapPickerSelectionPresentation,
  MapSelection,
} from '@amap/MapPicker/types';
import type { CameraUpdate, LatLngPoint } from 'expo-gaode-map';
import type { LocationCoordinates } from '@amap/location';

const coordinates = { latitude: 30, longitude: 120 };
const circle = { center: coordinates, radius: 100 };

test.each(['GCJ02', 'WGS84'] as const)(
  '合法坐标系 %s 与边界坐标可用',
  (coordinateSystem) => {
    expect(() =>
      validateCoordinates({ latitude: -90, longitude: 180, coordinateSystem }),
    ).not.toThrow();
  },
);

test.each([null, 1, [], {}, { ...coordinates, coordinateSystem: 'BD09' }])(
  '拒绝不完整或未知坐标系 %j',
  (value) => {
    expect(() => validateCoordinates(value as LocationCoordinates)).toThrow(
      MAP_PICKER_MESSAGES.invalidInput,
    );
  },
);

test.each([[], [120], [120, 30, 4]].map((value) => ({ value })))(
  '坐标数组长度必须为二：$value',
  ({ value }) => {
    expect(() => validatePoint(value as LatLngPoint)).toThrow(
      MAP_PICKER_MESSAGES.invalidInput,
    );
  },
);

test.each([
  null,
  1,
  [],
  { zoom: NaN },
  { bearing: Infinity },
  { tilt: -Infinity },
])('拒绝非法镜头输入 %j', (value) => {
  expect(() => validateCamera(value as CameraUpdate)).toThrow(
    MAP_PICKER_MESSAGES.invalidInput,
  );
});

test.each([
  undefined,
  1,
  { coordinates, place: null },
  { coordinates, place: '地点' },
  { coordinates, place: [] },
  { coordinates, place: { location: coordinates } },
])('选中地点拒绝非法元数据或第二套坐标 %j', (value) => {
  expect(() => snapshotSelection(value as MapSelection)).toThrow(
    MAP_PICKER_MESSAGES.invalidInput,
  );
});

test.each([
  null,
  1,
  [],
  { title: 1 },
  { address: false },
  { source: 'unknown' },
])('选中项显示输入必须符合契约 %j', (value) => {
  expect(() =>
    snapshotSelectionPresentation(value as MapPickerSelectionPresentation),
  ).toThrow(MAP_PICKER_MESSAGES.invalidInput);
});

test.each([
  null,
  1,
  [],
  { scrollGesturesEnabled: 1 },
  { zoomGesturesEnabled: null },
  { myLocationEnabled: 'true' },
  { circle: { ...circle, strokeWidth: NaN } },
  { circle: { ...circle, zIndex: Infinity } },
])('显示配置拒绝非法开关或圆形参数 %j', (value) => {
  expect(() => snapshotDisplay(value as MapPickerDisplayOptions)).toThrow(
    MAP_PICKER_MESSAGES.invalidInput,
  );
});

test.each([
  null,
  1,
  [],
  { initialSelection: null },
  { initialLocationRequest: null },
  { initialLocationRequest: { includeAddress: 'true' } },
  { showCompleteButton: 'true' },
  { panel: null },
  { panel: 1 },
  { panel: [] },
  { panel: { visible: 'true' } },
  { panel: { unselectedTitle: 1 } },
  { panel: { renderAdditionalOptions: false } },
])('会话配置拒绝非法嵌套选项 %j', (value) => {
  expect(() => snapshotConfig(value as MapPickerConfig)).toThrow(
    MAP_PICKER_MESSAGES.invalidInput,
  );
});

test.each(['onClear', 'onExit'] as const)('搜索 %s 回调不接受非函数', (key) => {
  const search = {
    debounceMs: 0,
    query: async () => ({ status: 'cancelled' as const }),
    [key]: true,
  };
  expect(() =>
    snapshotConfig({ search } as unknown as MapPickerConfig),
  ).toThrow(MAP_PICKER_MESSAGES.invalidInput);
});

test('配置和地点快照深拷贝并冻结，回调保持身份', () => {
  const onReady = jest.fn();
  const input: MapPickerConfig = {
    initialSelection: {
      coordinates: { ...coordinates },
      place: { name: '门店', photos: [{ url: 'https://example.test/a.jpg' }] },
    },
    initialDisplay: { circle: { ...circle, center: { ...coordinates } } },
    initialSelectionPresentation: { source: 'original', title: '门店' },
    onReady,
  };
  const result = snapshotConfig(input);
  input.initialSelection!.coordinates.latitude = 10;
  input.initialSelection!.place!.name = '修改';
  expect(result.initialSelection?.coordinates).toEqual(coordinates);
  expect(result.initialSelection?.place?.name).toBe('门店');
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.initialSelection?.place?.photos)).toBe(true);
  expect(Object.isFrozen(result.initialSelection?.place?.photos?.[0])).toBe(
    true,
  );
  expect(result.onReady).toBe(onReady);
});
