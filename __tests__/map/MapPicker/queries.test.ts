import type { PlaceQueryResult, PlaceSearchPage } from '@amap/places';
import { deferred, flush, open, origin, other } from './runtimeFixtures';
jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));
const page = {
  status: 'success' as const,
  data: { items: [{ id: 'A', location: origin }] },
};
afterEach(() => jest.useRealTimers());

test('scenario/search lanes cancel independently and completions never take display ownership', async () => {
  const scenario = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const search = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest.fn(() => search.promise);
  const { session } = open({ search: { debounceMs: 0, query } });
  let signal: AbortSignal | undefined;
  const scenarioResult = session.controls.loadCandidates((options) => {
    signal = options.signal;
    return scenario.promise;
  });
  session.enterSearch();
  expect(session.store.getState()).toMatchObject({
    candidateSource: 'search',
    search: { status: 'idle' },
  });
  session.changeSearchText('关键词');
  expect(signal?.aborted).toBe(false);
  scenario.resolve(page);
  await scenarioResult;
  expect(session.store.getState().candidateSource).toBe('search');
  session.controls.restoreCandidates();
  expect(session.store.getState()).toMatchObject({
    searchActive: true,
    candidateSource: 'scenario',
    scenario: { result: page },
  });
  search.resolve({ status: 'success', data: { items: [] } });
  await flush();
  expect(session.store.getState().candidateSource).toBe('scenario');
  expect(query).toHaveBeenCalledTimes(1);
  session.controls.exitSearch();
  expect(session.store.getState().candidateSource).toBe('scenario');
});

test('ordinary candidates during search update only scenario; exit does not implicitly restore', async () => {
  const { session } = open({
    search: { debounceMs: 0, query: jest.fn().mockResolvedValue(page) },
  });
  session.changeSearchText('A');
  await flush();
  await session.controls.loadCandidates(async () => ({
    status: 'success',
    data: {},
  }));
  expect(session.store.getState().candidateSource).toBe('search');
  session.controls.exitSearch();
  expect(session.store.getState()).toMatchObject({
    candidateSource: 'search',
    searchActive: false,
    search: { status: 'idle' },
  });
});

test('input change immediately cancels old query; debounce captures current center only at dispatch', async () => {
  jest.useFakeTimers();
  const first = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(page);
  const { session } = open({
    initialQueryCenter: origin,
    search: { debounceMs: 150, query },
  });
  session.changeSearchText(' old ');
  jest.advanceTimersByTime(150);
  expect(query).toHaveBeenCalledTimes(1);
  session.changeSearchText(' new ');
  expect(query.mock.calls[0][1].signal.aborted).toBe(true);
  first.reject(new Error('private old keyword'));
  await flush();
  expect(session.store.getState().search.status).toBe('idle');
  session.controls.setQueryCenter(other);
  jest.advanceTimersByTime(149);
  expect(query).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(query.mock.calls[1][0]).toEqual({
    keyword: 'new',
    queryCenter: other,
  });
  session.controls.setQueryCenter(origin);
  await flush();
  expect(query.mock.calls[1][0].queryCenter).toEqual(other);
  expect(query).toHaveBeenCalledTimes(2);
});

test('search snapshots the observed display center independently and ignores invalid or ended events', async () => {
  const query = jest.fn().mockResolvedValue(page);
  const { session } = open({
    initialCameraPosition: { target: origin },
    initialQueryCenter: other,
    search: { debounceMs: 0, query },
  });

  session.changeSearchText('初始');
  expect(query.mock.calls[0][0]).toEqual({
    keyword: '初始',
    queryCenter: other,
    displayCenter: origin,
  });

  session.events.onCameraIdle!({
    nativeEvent: { cameraPosition: { target: { latitude: 4, longitude: 5 } } },
  } as never);
  session.events.onCameraMove!({
    nativeEvent: { cameraPosition: { target: { latitude: 91, longitude: 5 } } },
  } as never);
  session.changeSearchText('移动后');
  expect(query.mock.calls[1][0]).toEqual({
    keyword: '移动后',
    queryCenter: other,
    displayCenter: { latitude: 4, longitude: 5 },
  });

  session.cancel();
  expect(() =>
    session.events.onCameraIdle!({
      nativeEvent: { cameraPosition: { target: origin } },
    } as never),
  ).not.toThrow();
  const nextQuery = jest.fn().mockResolvedValue(page);
  const next = open({ search: { debounceMs: 0, query: nextQuery } });
  next.session.changeSearchText('新实例');
  expect(nextQuery.mock.calls[0][0]).toEqual({
    keyword: '新实例',
    queryCenter: undefined,
  });
});

test.each([
  { status: 'success' as const, data: { items: [] } },
  { status: 'success' as const, data: {} },
  {
    status: 'failed' as const,
    error: { reason: 'unavailable' as const, message: '原始信息' },
  },
  { status: 'cancelled' as const },
])(
  'query result returned unchanged and its exact data absence retained: %j',
  async (result) => {
    const { session } = open();
    const query = jest.fn().mockResolvedValue(result);
    expect(await session.controls.loadCandidates(query)).toBe(result);
    expect(session.store.getState().scenario.result).toEqual(result);
    expect(query).toHaveBeenCalledTimes(1);
    session.controls.restoreCandidates();
    expect(query).toHaveBeenCalledTimes(1);
  },
);

test('replacement resolves old wait cancelled, aborts signal and observes late rejection', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const { session } = open();
  let signal: AbortSignal | undefined;
  const original = session.controls.loadCandidates((options) => {
    signal = options.signal;
    return pending.promise;
  });
  const second = session.controls.loadCandidates(async () => page);
  expect(await original).toEqual({ status: 'cancelled' });
  expect(signal?.aborted).toBe(true);
  await second;
  pending.reject(new Error('late'));
  await flush();
  expect(session.store.getState().scenario.result).toEqual(page);
});

test('unexpected throw/rejection preserves original exception and safe local query state', async () => {
  const { session, onResult } = open();
  const error = new Error('secret keyword 1,2');
  await expect(
    session.controls.loadCandidates(() => {
      throw error;
    }),
  ).rejects.toBe(error);
  expect(session.store.getState().scenario).toEqual({
    status: 'exception',
    message: '地点查询失败，请重试',
  });
  expect(onResult).not.toHaveBeenCalled();
  await expect(
    session.controls.loadCandidates(() => Promise.reject(error)),
  ).rejects.toBe(error);
});

test('clear and exit notify only corresponding callbacks; empty search never queries or selects', async () => {
  jest.useFakeTimers();
  const query = jest.fn();
  const onClear = jest.fn();
  const onExit = jest.fn();
  const { session } = open({
    initialSelection: { coordinates: origin },
    search: { debounceMs: 50, query, onClear, onExit },
  });
  session.changeSearchText('x');
  session.changeSearchText('');
  jest.runAllTimers();
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onExit).not.toHaveBeenCalled();
  expect(query).not.toHaveBeenCalled();
  session.controls.exitSearch();
  session.controls.exitSearch();
  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(session.store.getState().selection?.coordinates).toEqual(origin);
});

test('end cancels both waits and prevents pending debounce/query dispatch', async () => {
  jest.useFakeTimers();
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest.fn();
  const { session } = open({ search: { debounceMs: 50, query } });
  const result = session.controls.loadCandidates(() => pending.promise);
  session.changeSearchText('x');
  session.cancel();
  expect(await result).toEqual({ status: 'cancelled' });
  jest.runAllTimers();
  expect(query).not.toHaveBeenCalled();
  pending.resolve(page);
  await flush();
  expect(session.store.getState().scenario.result).toBeUndefined();
});
