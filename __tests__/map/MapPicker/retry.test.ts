import { getCurrentLocation } from '@amap/location';
import type { PlaceQueryResult, PlaceSearchPage } from '@amap/places';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));

const failed: PlaceQueryResult<PlaceSearchPage> = {
  status: 'failed',
  error: { reason: 'unavailable', message: '服务暂不可用' },
};
const page: PlaceQueryResult<PlaceSearchPage> = {
  status: 'success',
  data: { items: [{ id: 'A', location: origin }] },
};

afterEach(() => jest.useRealTimers());

test('explicit retry runs the failed query once without moving, selecting or confirming', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest
    .fn()
    .mockResolvedValueOnce(failed)
    .mockReturnValue(pending.promise);
  const onSelectionChange = jest.fn();
  const beforeConfirm = jest.fn();
  const onRequestRelocate = jest.fn();
  const { session, map, onResult } = open({
    initialSelection: { coordinates: other },
    onSelectionChange,
    beforeConfirm,
    onRequestRelocate,
  });
  await session.controls.loadCandidates(query);
  await flush();
  expect(query).toHaveBeenCalledTimes(1);
  expect(session.store.getState().scenario.status).toBe('failed');

  const retry = session.retryCandidates();
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[1][0].signal).not.toBe(query.mock.calls[0][0].signal);
  expect(session.store.getState().scenario.status).toBe('loading');
  pending.resolve(page);
  await retry;
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(2);
  expect(session.store.getState().scenario.result).toEqual(page);
  expect(session.store.getState().selection).toEqual({ coordinates: other });
  expect(getCurrentLocation).not.toHaveBeenCalled();
  expect(map.setCenter).not.toHaveBeenCalled();
  expect(map.moveCamera).not.toHaveBeenCalled();
  expect(onRequestRelocate).not.toHaveBeenCalled();
  expect(onSelectionChange).not.toHaveBeenCalled();
  expect(beforeConfirm).not.toHaveBeenCalled();
  expect(onResult).not.toHaveBeenCalled();
});

test('retry uses the displayed lane and the failed search input snapshot', async () => {
  const scenario = jest.fn().mockResolvedValue(failed);
  const search = jest
    .fn()
    .mockResolvedValueOnce(failed)
    .mockResolvedValue(page);
  const { session } = open({
    initialQueryCenter: origin,
    search: { debounceMs: 0, query: search },
  });
  await session.controls.loadCandidates(scenario);
  session.changeSearchText(' 地点 ');
  await flush();
  session.controls.setQueryCenter(other);
  await session.retryCandidates();
  expect(search).toHaveBeenCalledTimes(2);
  expect(search.mock.calls[1][0]).toEqual({
    keyword: '地点',
    queryCenter: origin,
  });
  expect(scenario).toHaveBeenCalledTimes(1);
  expect(session.store.getState()).toMatchObject({
    candidateSource: 'search',
    search: { status: 'success' },
    scenario: { status: 'failed' },
  });

  session.controls.restoreCandidates();
  await session.retryCandidates();
  expect(scenario).toHaveBeenCalledTimes(2);
  expect(search).toHaveBeenCalledTimes(2);
  expect(session.store.getState()).toMatchObject({
    candidateSource: 'scenario',
    searchActive: true,
    scenario: { status: 'failed' },
    search: { status: 'success' },
  });
});

test.each(['throw', 'reject'] as const)(
  'retry presents a query %s in its lane and resolves for the UI',
  async (mode) => {
    const error = new Error('private query input');
    const query = jest.fn(() => {
      if (mode === 'throw') throw error;
      return Promise.reject(error);
    });
    const { session, onResult } = open();
    await expect(session.controls.loadCandidates(query)).rejects.toBe(error);
    await expect(session.retryCandidates()).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(2);
    expect(session.store.getState()).toMatchObject({
      scenario: { status: 'exception', message: '地点查询失败，请重试' },
      localError: null,
    });
    expect(onResult).not.toHaveBeenCalled();
  },
);

test.each([page, { status: 'cancelled' as const }])(
  'a new query invalidates an older failure after %j',
  async (result) => {
    const old = jest.fn().mockResolvedValue(failed);
    const next = jest.fn().mockResolvedValue(result);
    const { session } = open();
    await session.retryCandidates();
    await session.controls.loadCandidates(old);
    await session.controls.loadCandidates(next);
    await session.retryCandidates();
    expect(old).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(session.store.getState().scenario.result).toEqual(result);
  },
);

test('input change invalidates failed search retry before the next debounce dispatch', async () => {
  jest.useFakeTimers();
  const query = jest.fn().mockResolvedValue(failed);
  const { session } = open({ search: { debounceMs: 30, query } });
  session.changeSearchText('old');
  jest.advanceTimersByTime(30);
  await flush();
  session.changeSearchText('new');
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(1);
  expect(session.store.getState().search.status).toBe('idle');
  jest.advanceTimersByTime(30);
  await flush();
  expect(query).toHaveBeenCalledTimes(2);
  expect(query.mock.calls[1][0].keyword).toBe('new');
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(3);
  expect(query.mock.calls[2][0].keyword).toBe('new');
});

test.each(['clear', 'exit'] as const)(
  '%s discards failed search retry while preserving the scenario failure',
  async (action) => {
    const scenario = jest.fn().mockResolvedValue(failed);
    const search = jest.fn().mockResolvedValue(failed);
    const { session } = open({ search: { debounceMs: 0, query: search } });
    await session.controls.loadCandidates(scenario);
    session.changeSearchText('x');
    await flush();
    if (action === 'clear') session.changeSearchText('');
    else session.controls.exitSearch();
    await session.retryCandidates();
    expect(search).toHaveBeenCalledTimes(1);
    expect(session.store.getState().search.status).toBe('idle');
    session.controls.restoreCandidates();
    await session.retryCandidates();
    expect(scenario).toHaveBeenCalledTimes(2);
  },
);

test('replacement cancels a retry and its late failure cannot replace newer retry ownership', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const old = jest
    .fn()
    .mockResolvedValueOnce(failed)
    .mockReturnValue(pending.promise);
  const next = jest.fn().mockResolvedValue(failed);
  const { session } = open();
  await session.controls.loadCandidates(old);
  const retry = session.retryCandidates();
  await session.controls.loadCandidates(next);
  await retry;
  expect(old.mock.calls[1][0].signal.aborted).toBe(true);
  pending.reject(new Error('late old failure'));
  await flush();
  await session.retryCandidates();
  expect(old).toHaveBeenCalledTimes(2);
  expect(next).toHaveBeenCalledTimes(2);
  expect(session.store.getState().scenario.result).toEqual(failed);
});

test('a new query from a failure notification becomes the only retryable query', async () => {
  const old = jest.fn().mockResolvedValue(failed);
  const next = jest.fn().mockResolvedValue(failed);
  const { session } = open();
  let replacement: Promise<PlaceQueryResult<PlaceSearchPage>> | undefined;
  const unsubscribe = session.store.subscribe((state) => {
    if (state.scenario.status === 'failed') {
      unsubscribe();
      replacement = session.controls.loadCandidates(next);
    }
  });
  await session.controls.loadCandidates(old);
  await replacement;
  await session.retryCandidates();
  expect(old).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledTimes(2);
  expect(session.store.getState().scenario.result).toEqual(failed);
});

test.each(['cancelled state', 'abort signal'] as const)(
  'a query started from %s keeps ownership over the query that triggered cancellation',
  async (source) => {
    const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
    const newest = jest.fn().mockResolvedValue(failed);
    const replaced = jest.fn().mockResolvedValue(page);
    const { session } = open();
    let nested: Promise<PlaceQueryResult<PlaceSearchPage>> | undefined;
    const startNewest = () => {
      nested = session.controls.loadCandidates(newest);
    };
    const original = session.controls.loadCandidates((options) => {
      if (source === 'abort signal') {
        options.signal?.addEventListener('abort', startNewest, { once: true });
      }
      return pending.promise;
    });
    const unsubscribe = session.store.subscribe((state) => {
      if (
        source === 'cancelled state' &&
        state.scenario.status === 'cancelled'
      ) {
        unsubscribe();
        startNewest();
      }
    });
    expect(await session.controls.loadCandidates(replaced)).toEqual({
      status: 'cancelled',
    });
    expect(await original).toEqual({ status: 'cancelled' });
    await nested;
    await session.retryCandidates();
    expect(replaced).not.toHaveBeenCalled();
    expect(newest).toHaveBeenCalledTimes(2);
    pending.resolve(page);
    await flush();
    expect(session.store.getState().scenario.result).toEqual(failed);
    unsubscribe();
  },
);

test('loading notification may cancel the round before a retry dispatches', async () => {
  const query = jest.fn().mockResolvedValue(failed);
  const { session, onResult } = open();
  await session.controls.loadCandidates(query);
  const unsubscribe = session.store.subscribe((state) => {
    if (state.scenario.status === 'loading') session.cancel();
  });
  await session.retryCandidates();
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  unsubscribe();
});

test('the ended round invalidates pending retry and any later retry request', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const query = jest
    .fn()
    .mockResolvedValueOnce(failed)
    .mockReturnValue(pending.promise);
  const { session, onResult } = open();
  await session.controls.loadCandidates(query);
  const retry = session.retryCandidates();
  session.deactivate();
  await session.retryCandidates();
  await retry;
  expect(query.mock.calls[1][0].signal.aborted).toBe(true);
  pending.resolve(page);
  await flush();
  await session.retryCandidates();
  expect(query).toHaveBeenCalledTimes(2);
  expect(session.store.getState().scenario.result).toBeUndefined();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});
