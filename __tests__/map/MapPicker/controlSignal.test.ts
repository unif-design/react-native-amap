import type { MapPickerControls } from '@amap/MapPicker';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

test('整轮signal稳定，操作在dragStart即同步失效，自己setSelection/exitSearch仍有效', async () => {
  let drag!: MapPickerControls;
  let exit!: MapPickerControls;
  const s = open({
    search: {
      debounceMs: 0,
      query: jest.fn(),
      onExit: (c) => {
        exit = c;
        c.restoreCandidates();
      },
    },
    onUserDragEnd: (_p, c) => {
      drag = c;
      c.exitSearch();
      c.setSelection({ coordinates: other });
    },
  });
  const round = s.session.controls.signal;
  s.session.enterSearch();
  s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
  s.session.events.onUserDragEnd!({ nativeEvent: origin } as never);
  expect(drag.signal.aborted).toBe(false);
  expect(exit.signal.aborted).toBe(true);
  expect(round.aborted).toBe(false);
  s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
  expect(drag.signal.aborted).toBe(true);
  expect(round.aborted).toBe(false);
  s.session.cancel();
  expect(round.aborted).toBe(true);
});

test.each(['select', 'search', 'relocate'] as const)(
  '%s使旧回调signal失效',
  async (action) => {
    let view!: MapPickerControls;
    const s = open({
      onUserDragEnd: (_p, c) => {
        view = c;
      },
      onRequestRelocate: () => {},
      search: { debounceMs: 0, query: jest.fn() },
    });
    s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
    s.session.events.onUserDragEnd!({ nativeEvent: origin } as never);
    if (action === 'select')
      s.session.controls.setSelection({ coordinates: origin });
    else if (action === 'search') s.session.enterSearch();
    else await s.session.requestRelocate();
    expect(view.signal.aborted).toBe(true);
  },
);

test('真实相机失败不取消有效signal，已派发Promise在失效后仍交实际结果', async () => {
  let view!: MapPickerControls;
  const s = open({
    onUserDragEnd: (_p, c) => {
      view = c;
    },
  });
  s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
  s.session.events.onUserDragEnd!({ nativeEvent: origin } as never);
  jest.mocked(s.map.setCenter).mockRejectedValueOnce(new Error('native'));
  await expect(view.setCenter(other)).rejects.toThrow('native');
  expect(view.signal.aborted).toBe(false);
  const pending = deferred<void>();
  jest.mocked(s.map.setCenter).mockReturnValueOnce(pending.promise);
  const call = view.setCenter(other);
  s.session.cancel();
  expect(view.signal.aborted).toBe(true);
  pending.resolve();
  await expect(call).resolves.toBeUndefined();
});

test('StrictMode同步pause/replay不abort，真实卸载abort且不能复活', async () => {
  const s = open();
  const signal = s.session.controls.signal;
  s.session.deactivate();
  expect(signal.aborted).toBe(false);
  s.session.activate();
  await flush();
  expect(signal.aborted).toBe(false);
  s.session.deactivate();
  await flush();
  expect(signal.aborted).toBe(true);
  s.session.activate();
  expect(s.session.controls.signal).toBe(signal);
  expect(signal.aborted).toBe(true);
});

test('同步abort监听重入改选，新选择胜出且旧操作不能重新取得归属', async () => {
  let old!: MapPickerControls;
  const s = open({
    onUserDragEnd: (_p, c) => {
      old = c;
    },
  });
  s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
  s.session.events.onUserDragEnd!({ nativeEvent: origin } as never);
  old.signal.addEventListener('abort', () => {
    old.setSelection({ coordinates: { latitude: 9, longitude: 9 } });
    s.session.controls.setSelection({ coordinates: other });
  });
  s.session.controls.setSelection({ coordinates: origin });
  expect(s.session.store.getState().selection?.coordinates).toEqual(other);
  expect(old.signal.aborted).toBe(true);
});

test('退出搜索取消查询的同步abort重入不会让旧drag重新取得归属', async () => {
  let drag!: MapPickerControls;
  const pending = deferred<never>();
  const s = open({
    search: {
      debounceMs: 0,
      query: (_input, options) => {
        options.signal!.addEventListener('abort', () =>
          s.session.controls.setSelection({ coordinates: other }),
        );
        return pending.promise;
      },
    },
    onUserDragEnd: (_center, controls) => {
      drag = controls;
      controls.exitSearch();
      controls.setSelection({ coordinates: origin });
    },
  });
  s.session.changeSearchText('茶');
  s.session.events.onUserDragStart!({ nativeEvent: origin } as never);
  s.session.events.onUserDragEnd!({ nativeEvent: origin } as never);
  expect(drag.signal.aborted).toBe(true);
  expect(s.session.store.getState().selection?.coordinates).toEqual(other);
  expect(s.session.store.getState().searchActive).toBe(true);
  s.session.cancel();
  pending.reject(new Error('cancelled'));
  await flush();
});

test('setSelection回执区分旧lease、同步同值重入和正常采用，拖动开始原事件转发一次', () => {
  let view!: MapPickerControls;
  let reenter = true;
  const notification = jest.fn(() => {
    if (reenter) {
      reenter = false;
      expect(s.session.controls.setSelection({ coordinates: origin })).toBe(
        true,
      );
    }
  });
  const onUserDragStart = jest.fn();
  const s = open({
    onSelectionChange: notification,
    onUserDragStart,
    onUserDragEnd: (_p, c) => {
      view = c;
    },
  });
  expect(s.session.controls.setSelection({ coordinates: origin })).toBe(false);
  expect(s.session.controls.setSelection(null)).toBe(true);
  const event = { nativeEvent: origin } as never;
  s.session.events.onUserDragStart!(event);
  expect(onUserDragStart).toHaveBeenCalledTimes(1);
  expect(onUserDragStart).toHaveBeenCalledWith(event);
  s.session.events.onUserDragEnd!(event);
  s.session.controls.setSelection({ coordinates: other });
  expect(view.setSelection({ coordinates: origin })).toBe(false);
});

test.each(['search', 'end'] as const)(
  '采用后同步%s没有改选，回执仍为true',
  (action) => {
    const s = open({
      search: { debounceMs: 0, query: jest.fn() },
      onSelectionChange: () => {
        if (action === 'search') s.session.enterSearch();
        else s.session.cancel();
      },
    });
    expect(s.session.controls.setSelection({ coordinates: origin })).toBe(true);
  },
);

test('确认清理回调在选择实际提交前重入，新选择保留且旧设置回执false', async () => {
  const waiting = deferred<boolean>();
  const s = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = s.session.complete();
  await flush();
  const request = s.session.store.getState().confirmation!;
  s.session.bindConfirmation(
    request,
    () => waiting.promise,
    () => {
      s.session.controls.setSelection({ coordinates: other });
    },
  );
  await flush();
  expect(s.session.controls.setSelection({ coordinates: origin })).toBe(false);
  expect(s.session.store.getState().selection?.coordinates).toEqual(other);
  waiting.resolve(false);
  await completion;
  s.session.cancel();
});

test('非法onUserDragStart在打开阶段拒绝，不能开始交互', () => {
  const s = open({ onUserDragStart: 'invalid' as never });
  expect(s.session.validInput).toBe(false);
  expect(s.onResult).toHaveBeenCalledWith({
    status: 'failed',
    error: { reason: 'invalid_input', message: expect.any(String) },
  });
});
