import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import type { MapPickerControls } from '@amap/MapPicker/types';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

test.each([
  'drag',
  'enter_search',
  'search_text',
  'relocate',
  'exit_search',
] as const)(
  '%s 取消旧操作时重入的新选点优先，旧操作不再获得归属',
  async (action) => {
    let old!: MapPickerControls;
    const relocate = jest.fn();
    const onExit = jest.fn();
    const query = jest.fn();
    const { session } = open({
      onUserDragEnd: (_, controls) => {
        old = controls;
      },
      onRequestRelocate: relocate,
      search: { debounceMs: 0, query, onExit },
    });
    if (action === 'exit_search') session.enterSearch();
    session.events.onUserDragStart!({ nativeEvent: origin } as never);
    session.events.onUserDragEnd!({ nativeEvent: origin } as never);
    old.signal.addEventListener(
      'abort',
      () => {
        session.controls.setSelection({ coordinates: other });
      },
      { once: true },
    );
    if (action === 'drag')
      session.events.onUserDragStart!({ nativeEvent: origin } as never);
    if (action === 'enter_search') session.enterSearch();
    if (action === 'search_text') session.changeSearchText('旧搜索');
    if (action === 'relocate') await session.requestRelocate();
    if (action === 'exit_search') session.controls.exitSearch();
    expect(session.store.getState().selection).toEqual({ coordinates: other });
    expect(session.store.getState().searchActive).toBe(
      action === 'exit_search',
    );
    expect(query).not.toHaveBeenCalled();
    expect(relocate).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
    const snapshot = session.store.getState();
    old.exitSearch();
    expect(session.store.getState()).toBe(snapshot);
    session.cancel();
  },
);

test('退出搜索状态发布时页面关闭，不把迟到 onExit 交给新一轮', () => {
  const onExit = jest.fn();
  const { session } = open({
    search: { debounceMs: 0, query: jest.fn(), onExit },
  });
  session.enterSearch();
  const unsubscribe = session.store.subscribe((state) => {
    if (!state.searchActive && !state.result) session.cancel();
  });
  session.controls.exitSearch();
  expect(session.store.getState().result).toEqual({ status: 'cancelled' });
  expect(onExit).not.toHaveBeenCalled();
  unsubscribe();
});

test('替换搜索时原请求 abort listener 改选，旧文本不覆盖新用户操作', async () => {
  const pending = deferred<never>();
  const query = jest.fn((_, options: { signal?: AbortSignal }) => {
    options.signal!.addEventListener(
      'abort',
      () => session.controls.setSelection({ coordinates: other }),
      { once: true },
    );
    return pending.promise;
  });
  const { session } = open({ search: { debounceMs: 0, query } });
  session.changeSearchText('原查询');
  session.changeSearchText('旧操作的新文本');
  expect(query).toHaveBeenCalledTimes(1);
  expect(session.store.getState()).toMatchObject({
    selection: { coordinates: other },
    searchText: '原查询',
  });
  session.cancel();
  await flush();
});

test('重新定位 busy 发布时改选，新选择保留而旧定位回调不派发', async () => {
  const relocate = jest.fn();
  const { session } = open({ onRequestRelocate: relocate });
  const unsubscribe = session.store.subscribe((state) => {
    if (state.relocateBusy && !state.selection)
      session.controls.setSelection({ coordinates: other });
  });
  await session.requestRelocate();
  expect(relocate).not.toHaveBeenCalled();
  expect(session.store.getState()).toMatchObject({
    relocateBusy: false,
    selection: { coordinates: other },
  });
  unsubscribe();
  session.cancel();
});

test('取消后已到队列的搜索计时回调不发旧查询', async () => {
  jest.useFakeTimers();
  try {
    const timers = jest.spyOn(global, 'setTimeout');
    const query = jest.fn();
    const { session } = open({ search: { debounceMs: 100, query } });
    session.changeSearchText('旧查询');
    const scheduled = timers.mock.calls.at(-1)![0];
    session.cancel();
    if (typeof scheduled !== 'function')
      throw new Error('Expected scheduled search callback');
    scheduled();
    expect(query).not.toHaveBeenCalled();
    await flush();
  } finally {
    jest.useRealTimers();
  }
});

test('搜索请求异常只写当前 lane 的安全错误，异步结果观察者异常不复活已结束会话', async () => {
  const { session } = open({
    search: {
      debounceMs: 0,
      query: async () => {
        throw new Error('private search failure');
      },
    },
  });
  session.changeSearchText('查询');
  await flush();
  expect(session.store.getState().search).toMatchObject({
    status: 'exception',
    message: '地点查询失败，请重试',
  });
  session.cancel();
  const onResult = jest.fn(async () => {
    throw new Error('observer failed');
  });
  const ended = createMapPickerSession({}, onResult);
  ended.activate();
  ended.cancel();
  await flush();
  ended.cancel();
  const confirm = jest.fn();
  ended.bindConfirmation(
    { id: 999, options: { title: '旧确认' } },
    confirm,
    jest.fn(),
  )();
  expect(confirm).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(ended.store.getState().result).toEqual({ status: 'cancelled' });
});
