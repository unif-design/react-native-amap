import { toast } from '@unif/react-native-design';
import { getCurrentLocation } from '@amap/location';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import type { MapPickerControls } from '@amap/MapPicker/types';
import { deferred, flush, open, origin, other } from './runtimeFixtures';
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
jest.mock('@unif/react-native-design', () => ({
  ...jest.requireActual('@unif/react-native-design'),
  toast: jest.fn(),
}));

test('async drag may exit search then select through its same operation controls', async () => {
  const pending = deferred<void>();
  const { session } = open({
    search: { debounceMs: 0, query: jest.fn() },
    onUserDragEnd: async (_center, controls) => {
      controls.exitSearch();
      await pending.promise;
      controls.setSelection({ coordinates: other });
    },
  });
  session.enterSearch();
  session.events.onUserDragStart!({ nativeEvent: origin } as never);
  session.events.onUserDragEnd!({ nativeEvent: origin } as never);
  pending.resolve();
  await flush();
  expect(session.store.getState().selection?.coordinates).toEqual(other);
});

test('relocate single flight and callback lease covers async state updates, selection and following display', async () => {
  const pending = deferred<void>();
  const onRequestRelocate = jest.fn(async (controls: MapPickerControls) => {
    await pending.promise;
    controls.setSelection({ coordinates: other });
    controls.setQueryCenter(other);
    await controls.setCenter(other);
  });
  const { session, map } = open({ onRequestRelocate });
  const call = session.requestRelocate();
  session.requestRelocate();
  expect(onRequestRelocate).toHaveBeenCalledTimes(1);
  expect(session.store.getState().relocateBusy).toBe(true);
  pending.resolve();
  await call;
  expect(session.store.getState()).toMatchObject({
    relocateBusy: false,
    selection: { coordinates: other },
    queryCenter: other,
  });
  expect(map.setCenter).toHaveBeenCalledTimes(1);
  expect(getCurrentLocation).not.toHaveBeenCalled();
});

test.each(['selection', 'relocate', 'end'] as const)(
  'new %s blocks late drag writes and late errors remain local to old operation',
  async (next) => {
    const pending = deferred<void>();
    const { session, onResult } = open({
      onRequestRelocate: () => {},
      onUserDragEnd: async (_center, controls) => {
        await pending.promise;
        controls.setSelection({ coordinates: other });
        throw new Error('private');
      },
    });
    session.events.onUserDragStart!({ nativeEvent: origin } as never);
    session.events.onUserDragEnd!({ nativeEvent: origin } as never);
    if (next === 'selection') {
      session.controls.setSelection({ coordinates: origin });
    } else if (next === 'relocate') {
      await session.requestRelocate();
    } else {
      session.cancel();
    }
    pending.resolve();
    await flush();
    expect(session.store.getState().selection?.coordinates).not.toEqual(other);
    expect(session.store.getState().localError).toBeNull();
    expect(onResult).toHaveBeenCalledTimes(next === 'end' ? 1 : 0);
  },
);

test('old clear/exit callback controls cannot overwrite later interaction; current async exit may restore', async () => {
  const pending = deferred<void>();
  const { session } = open({
    search: {
      debounceMs: 0,
      query: jest.fn(),
      onClear: async (controls) => {
        await pending.promise;
        controls.setSelection({ coordinates: other });
      },
      onExit: async (controls) => {
        await Promise.resolve();
        controls.restoreCandidates();
      },
    },
  });
  session.changeSearchText('');
  session.controls.setSelection({ coordinates: origin });
  pending.resolve();
  await flush();
  expect(session.store.getState().selection?.coordinates).toEqual(origin);
  session.controls.exitSearch();
  await flush();
  expect(session.store.getState().candidateSource).toBe('scenario');
});

test('raw map events retain exact object and camera idle never invents user drag or selection', async () => {
  const onLoad = jest.fn();
  const onMapPress = jest.fn();
  const onCameraIdle = jest.fn();
  const onUserDragEnd = jest.fn();
  const { session } = open({ onLoad, onMapPress, onCameraIdle, onUserDragEnd });
  const event = { nativeEvent: origin } as never;
  session.events.onMapPress!(event);
  session.events.onCameraIdle!(event);
  await session.controls.setCenter(other);
  expect(onMapPress).toHaveBeenCalledWith(event);
  expect(onCameraIdle).toHaveBeenCalledWith(event);
  expect(onUserDragEnd).not.toHaveBeenCalled();
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(session.store.getState().selection).toBeNull();
});

test('map controls preserve promise errors after round ends and invalid updates never dispatch', async () => {
  const { session, map } = open();
  const pending = deferred<void>();
  const error = new Error('native detail');
  jest.mocked(map.setZoom).mockReturnValue(pending.promise);
  const result = session.controls.setZoom(10);
  session.cancel();
  pending.reject(error);
  await expect(result).rejects.toBe(error);
  const next = open();
  const state = next.session.store.getState();
  await expect(
    next.session.controls.moveCamera({
      target: { latitude: 91, longitude: 0 },
    }),
  ).rejects.toThrow();
  expect(next.map.moveCamera).not.toHaveBeenCalled();
  expect(next.session.store.getState()).toBe(state);
});

test('real unmount ends round once; onReady and initial callbacks reject safely', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({
    status: 'failed',
    error: { reason: 'permission_denied', message: '原始信息' },
  });
  const { session, onResult } = open({
    initialLocationRequest: { includeAddress: false },
    onReady: () => {
      throw new Error('private');
    },
    onInitialLocationResult: async () => {
      throw new Error('private');
    },
  });
  await flush();
  expect(session.store.getState().display).toMatchObject({
    scrollGesturesEnabled: true,
    zoomGesturesEnabled: true,
  });
  expect(onResult).not.toHaveBeenCalled();
  session.deactivate();
  await flush();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  session.deactivate();
  await flush();
  expect(onResult).toHaveBeenCalledTimes(1);
});

test.each([
  { initialQueryCenter: { latitude: Infinity, longitude: 0 } },
  { initialDisplay: { circle: { center: origin, radius: 0 } } },
  { search: { debounceMs: -1, query: jest.fn() } },
])(
  'invalid open reports failed only after committed activation: %j',
  (config) => {
    const onResult = jest.fn();
    const session = createMapPickerSession(config, onResult);
    expect(onResult).not.toHaveBeenCalled();
    session.activate();
    expect(onResult).toHaveBeenCalledWith({
      status: 'failed',
      error: { reason: 'invalid_input', message: '选点参数无效，请检查后重试' },
    });
  },
);

test('confirmation effect replay runs public confirm once and only releases its own host', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确定' }),
  });
  const completion = session.complete();
  const request = session.store.getState().confirmation!;
  const first = jest.fn();
  const second = jest.fn().mockResolvedValue(true);
  const firstRelease = jest.fn();
  const secondRelease = jest.fn();
  const cleanup = session.bindConfirmation(request, first, firstRelease);
  cleanup();
  session.bindConfirmation(request, second, secondRelease);
  await completion;
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  expect(firstRelease).not.toHaveBeenCalled();
  expect(secondRelease).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledTimes(1);
});

test('完成校验失败使用 Toast 并保留选点，取消确认不提示错误', async () => {
  const empty = open({ beforeConfirm: jest.fn() });
  await empty.session.complete();
  expect(empty.onResult).not.toHaveBeenCalled();
  expect(empty.session.config.beforeConfirm).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  const blocked = open({
    initialSelection: { coordinates: origin },
    beforeConfirm: () => ({ canConfirm: false, message: '不在范围内' }),
  });
  await blocked.session.complete();
  expect(toast).toHaveBeenLastCalledWith({
    message: '不在范围内',
    position: 'top',
  });
  expect(blocked.session.store.getState().localError).toBeNull();
  expect(blocked.onResult).not.toHaveBeenCalled();
  const failed = open({
    initialSelection: { coordinates: origin },
    beforeConfirm: async () => {
      throw new Error('private');
    },
  });
  await failed.session.complete();
  expect(toast).toHaveBeenLastCalledWith({
    position: 'top',
    message: '位置确认失败，请重试',
  });
  expect(failed.session.store.getState().localError).toBeNull();
  expect(failed.onResult).not.toHaveBeenCalled();
  const unconfirmed = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = unconfirmed.session.complete();
  unconfirmed.session.bindConfirmation(
    unconfirmed.session.store.getState().confirmation!,
    async () => false,
    jest.fn(),
  );
  await completion;
  expect(unconfirmed.onResult).not.toHaveBeenCalled();
  expect(unconfirmed.session.store.getState().completing).toBe(false);
  expect(toast).toHaveBeenCalledTimes(2);
});

test.each(['blocked', 'rejected'] as const)(
  '已取消的完成校验不投递迟到 Toast：%s',
  async (outcome) => {
    const checked = deferred<{ canConfirm: false; message: string }>();
    const { session, onResult } = open({
      initialSelection: { coordinates: origin },
      beforeConfirm: () => checked.promise,
    });
    const completion = session.complete();
    session.cancel();
    if (outcome === 'blocked')
      checked.resolve({ canConfirm: false, message: '旧选择不在范围内' });
    else checked.reject(new Error('旧校验失败'));
    await completion;
    expect(toast).not.toHaveBeenCalled();
    expect(session.store.getState().localError).toBeNull();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  },
);

test('callback error after its own accepted selection remains this operation error', async () => {
  const { session } = open({
    onRequestRelocate: async (controls) => {
      controls.setSelection({ coordinates: origin });
      await Promise.resolve();
      throw new Error('secret');
    },
  });
  await session.requestRelocate();
  expect(session.store.getState().localError).toBe('操作失败，请重试');
});

test('display gesture patch preserves circle identity; ARGB integer validation is atomic', () => {
  const { session } = open({
    initialDisplay: { circle: { center: [0, 0], radius: 50, fillColor: 0 } },
  });
  const circle = session.store.getState().display.circle;
  session.controls.updateDisplay({ zoomGesturesEnabled: false });
  expect(session.store.getState().display.circle).toBe(circle);
  const state = session.store.getState();
  for (const color of [NaN, Infinity, -2147483649, 4294967296, 0.5]) {
    expect(() =>
      session.controls.updateDisplay({
        scrollGesturesEnabled: false,
        circle: { center: origin, radius: 10, strokeColor: color },
      }),
    ).toThrow();
    expect(session.store.getState()).toBe(state);
  }
  for (const color of [-2147483648, 4294967295, 0]) {
    session.controls.updateDisplay({
      circle: { center: other, radius: 10, fillColor: color },
    });
    expect(session.store.getState().display.circle?.fillColor).toBe(color);
  }
  expect(() =>
    session.controls.updateDisplay({
      circle: { center: [45, 120], radius: 10 },
    }),
  ).toThrow();
});

test('confirmation pending dialog is released at selection revision and old true cannot finish', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const pending = deferred<boolean>();
  const release = jest.fn();
  const completion = session.complete();
  const request = session.store.getState().confirmation!;
  session.bindConfirmation(request, () => pending.promise, release);
  await flush();
  session.controls.setSelection({ coordinates: other });
  await completion;
  expect(release).toHaveBeenCalledTimes(1);
  pending.resolve(true);
  await flush();
  expect(onResult).not.toHaveBeenCalled();
  expect(session.store.getState().selection?.coordinates).toEqual(other);
});

test('confirmation host detaching without replacement settles local completion', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const pending = deferred<boolean>();
  const completion = session.complete();
  const cleanup = session.bindConfirmation(
    session.store.getState().confirmation!,
    () => pending.promise,
    jest.fn(),
  );
  await flush();
  cleanup();
  await completion;
  expect(onResult).not.toHaveBeenCalled();
  expect(session.store.getState().completing).toBe(false);
  pending.resolve(false);
});

test('initial explicit undefined zoom still receives adopted default and zero other camera fields survive', () => {
  const { session } = open({
    initialCameraPosition: { zoom: undefined, bearing: 0, tilt: 0 },
  });
  expect(session.config.initialCameraPosition).toEqual({
    zoom: 16,
    bearing: 0,
    tilt: 0,
  });
});

test.each(['配置', '操作'] as const)(
  '确认%s异常使用 Toast 并保留选点',
  async (failureAt) => {
    const { session, onResult } = open({
      initialSelection: { coordinates: origin },
      getConfirmationOptions: () => {
        if (failureAt === '配置') throw new Error('private');
        return { title: '确认' };
      },
    });
    const completion = session.complete();
    if (failureAt === '操作')
      session.bindConfirmation(
        session.store.getState().confirmation!,
        async () => {
          throw new Error('private');
        },
        jest.fn(),
      );
    await completion;
    expect(toast).toHaveBeenCalledWith({
      position: 'top',
      message: '位置确认失败，请重试',
    });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(session.store.getState().localError).toBeNull();
    expect(onResult).not.toHaveBeenCalled();
  },
);

test('readiness callback reentrant cancellation prevents later raw load callback and initial delivery', async () => {
  const onLoad = jest.fn();
  const session = createMapPickerSession(
    { onReady: () => session.cancel(), onLoad },
    jest.fn(),
  );
  const available = open();
  session.attachMap(available.map);
  session.activate();
  session.events.onLoad!({ nativeEvent: {} } as never);
  expect(onLoad).not.toHaveBeenCalled();
});

test('native dispatch rejection is returned verbatim while UI receives only safe local text', async () => {
  const { session, map } = open();
  const error = new Error('location 1,2 private');
  jest.mocked(map.setCenter).mockRejectedValue(error);
  await expect(session.controls.setCenter(origin)).rejects.toBe(error);
  expect(session.store.getState().localError).toBe('操作失败，请重试');
});
