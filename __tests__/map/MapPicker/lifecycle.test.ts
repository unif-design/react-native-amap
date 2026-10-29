import { getCurrentLocation } from '@amap/location';
import type { GetCurrentLocationResult } from '@amap/location';
import type { PlaceQueryResult, PlaceSearchPage } from '@amap/places';
import { createMapPickerSession } from '@amap/MapPicker/createMapPickerSession';
import { deferred, flush, open, origin, other } from './runtimeFixtures';

jest.mock('@amap/location', () => ({ getCurrentLocation: jest.fn() }));

test('queued successful validation cannot confirm after cleanup begins', async () => {
  const check = deferred<{ canConfirm: true }>();
  const options = jest.fn(() => ({ title: '确认' }));
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    beforeConfirm: () => check.promise,
    getConfirmationOptions: options,
  });
  const completion = session.complete();
  check.resolve({ canConfirm: true });
  session.deactivate();
  await completion;
  await flush();
  expect(options).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});

test('queued confirm true cannot finish after cleanup begins', async () => {
  const confirmed = deferred<boolean>();
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = session.complete();
  const release = jest.fn();
  session.bindConfirmation(
    session.store.getState().confirmation!,
    () => confirmed.promise,
    release,
  );
  await flush();
  confirmed.resolve(true);
  session.deactivate();
  await completion;
  await flush();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

test('queued confirmation adapter cannot start a public confirm during cleanup', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = session.complete();
  const confirm = jest.fn().mockResolvedValue(true);
  session.bindConfirmation(
    session.store.getState().confirmation!,
    confirm,
    jest.fn(),
  );
  session.deactivate();
  await completion;
  expect(confirm).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});

test('queued initial location cannot move map, publish center or notify after cleanup', async () => {
  const location = deferred<GetCurrentLocationResult>();
  jest.mocked(getCurrentLocation).mockReturnValue(location.promise);
  const observed = jest.fn();
  const { session, map, onResult } = open({
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: observed,
  });
  const adopted = jest.fn();
  session.store.subscribe((state) => {
    if (state.queryCenter) {
      adopted();
    }
  });
  location.resolve({ status: 'success', location: origin });
  session.deactivate();
  await flush();
  expect(map.setCenter).not.toHaveBeenCalled();
  expect(observed).not.toHaveBeenCalled();
  expect(adopted).not.toHaveBeenCalled();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
});

test('queued candidates return their original result but cannot publish during cleanup', async () => {
  const pending = deferred<PlaceQueryResult<PlaceSearchPage>>();
  const { session } = open();
  const result = session.controls.loadCandidates(() => pending.promise);
  const adopted = jest.fn();
  session.store.subscribe((state) => {
    if (state.scenario.status === 'success') {
      adopted();
    }
  });
  const page = { status: 'success' as const, data: { items: [] } };
  pending.resolve(page);
  session.deactivate();
  expect(await result).toBe(page);
  await flush();
  expect(adopted).not.toHaveBeenCalled();
  expect(session.store.getState().scenario.result).toBeUndefined();
});

test('new controls and actions stop immediately at cleanup while prior native result stays original', async () => {
  const pending = deferred<{ zoom: number }>();
  const relocate = jest.fn();
  const query = jest.fn();
  const selection = jest.fn();
  const { session, map } = open({
    onRequestRelocate: relocate,
    onSelectionChange: selection,
    search: { debounceMs: 0, query },
  });
  jest.mocked(map.getCameraPosition).mockReturnValue(pending.promise);
  const read = session.controls.getCameraPosition();
  session.deactivate();
  const before = session.store.getState();
  session.failUnavailable();
  session.controls.setSelection({ coordinates: other });
  session.controls.setQueryCenter(other);
  session.controls.updateDisplay({ zoomGesturesEnabled: false });
  session.enterSearch();
  session.changeSearchText('x');
  session.controls.restoreCandidates();
  session.selectCandidate({ location: other });
  const relocateCall = session.requestRelocate();
  const load = session.controls.loadCandidates(query);
  const move = session.controls.setCenter(other);
  expect(session.store.getState()).toBe(before);
  pending.resolve({ zoom: 11 });
  await expect(move).rejects.toThrow();
  expect(await load).toEqual({ status: 'cancelled' });
  expect(await read).toEqual({ zoom: 11 });
  await relocateCall;
  expect(query).not.toHaveBeenCalled();
  expect(relocate).not.toHaveBeenCalled();
  expect(selection).not.toHaveBeenCalled();
  expect(map.setCenter).not.toHaveBeenCalled();
});

test('queued operation errors do not notify store during cleanup', async () => {
  const pending = deferred<void>();
  const { session } = open({ onRequestRelocate: () => pending.promise });
  const operation = session.requestRelocate();
  const errors = jest.fn();
  session.store.subscribe((state) => {
    if (state.localError) {
      errors();
    }
  });
  pending.reject(new Error('private'));
  session.deactivate();
  await operation;
  await flush();
  expect(errors).not.toHaveBeenCalled();
});

test('synchronous replay keeps queued completion and location in same round without a second request', async () => {
  const location = deferred<GetCurrentLocationResult>();
  jest.mocked(getCurrentLocation).mockReturnValue(location.promise);
  const check = deferred<{ canConfirm: true }>();
  const observed = jest.fn();
  const { session, onResult } = open({
    initialSelection: { coordinates: other },
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: observed,
    beforeConfirm: () => check.promise,
  });
  const completion = session.complete();
  location.resolve({ status: 'success', location: origin });
  check.resolve({ canConfirm: true });
  session.deactivate();
  session.activate();
  await completion;
  await flush();
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
  expect(observed).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({
    status: 'success',
    selection: { coordinates: other },
  });
});

test('ref/load facts before first activate remain usable without a second load event', async () => {
  jest
    .mocked(getCurrentLocation)
    .mockResolvedValue({ status: 'success', location: origin });
  const ready = jest.fn();
  const observed = jest.fn();
  const load = jest.fn();
  const session = createMapPickerSession(
    {
      initialLocationRequest: { includeAddress: false },
      onReady: ready,
      onLoad: load,
      onInitialLocationResult: observed,
    },
    jest.fn(),
  );
  const { map } = open();
  session.attachMap(map);
  const event = { nativeEvent: {} } as never;
  session.events.onLoad!(event);
  expect(ready).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledWith(event);
  expect(getCurrentLocation).not.toHaveBeenCalled();
  session.activate();
  await flush();
  expect(observed).toHaveBeenCalledTimes(1);
  expect(map.setCenter).toHaveBeenCalledWith(origin);
});

test('location/query facts received in suspension can be adopted by replay before final cancellation', async () => {
  const location = deferred<GetCurrentLocationResult>();
  const candidates = deferred<PlaceQueryResult<PlaceSearchPage>>();
  jest.mocked(getCurrentLocation).mockReturnValue(location.promise);
  const observed = jest.fn();
  const { session, map, onResult } = open({
    initialLocationRequest: { includeAddress: false },
    onInitialLocationResult: observed,
  });
  const result = session.controls.loadCandidates(() => candidates.promise);
  const mutations = jest.fn();
  session.store.subscribe(mutations);
  location.resolve({ status: 'success', location: origin });
  candidates.resolve({ status: 'success', data: { items: [] } });
  const resume = Promise.resolve().then(() => {
    expect(mutations).not.toHaveBeenCalled();
    expect(map.setCenter).not.toHaveBeenCalled();
    expect(observed).not.toHaveBeenCalled();
    session.activate();
  });
  session.deactivate();
  await resume;
  await result;
  await flush();
  expect(getCurrentLocation).toHaveBeenCalledTimes(1);
  expect(observed).toHaveBeenCalledTimes(1);
  expect(session.store.getState().queryCenter).toEqual(origin);
  expect(session.store.getState().scenario.status).toBe('success');
  expect(onResult).not.toHaveBeenCalled();
});

test('exact queued validation without confirmation options delivers cancelled after unmount', async () => {
  const check = deferred<{ canConfirm: true }>();
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    beforeConfirm: () => check.promise,
  });
  const completion = session.complete();
  check.resolve({ canConfirm: true });
  session.deactivate();
  await completion;
  await flush();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(onResult).toHaveBeenCalledTimes(1);
});

test('confirmation already settled true cannot commit its queued completion after cleanup', async () => {
  const confirmed = deferred<boolean>();
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = session.complete();
  session.bindConfirmation(
    session.store.getState().confirmation!,
    () => confirmed.promise,
    jest.fn(),
  );
  await flush();
  const cleanup = confirmed.promise.then(() => session.deactivate());
  confirmed.resolve(true);
  await cleanup;
  await completion;
  await flush();
  expect(onResult).toHaveBeenCalledWith({ status: 'cancelled' });
  expect(onResult).toHaveBeenCalledTimes(1);
});

test('child confirmation binding can replay before parent reactivation without duplicate confirm or cancellation', async () => {
  const { session, onResult } = open({
    initialSelection: { coordinates: origin },
    getConfirmationOptions: () => ({ title: '确认' }),
  });
  const completion = session.complete();
  const request = session.store.getState().confirmation!;
  const first = jest.fn().mockResolvedValue(true);
  const second = jest.fn().mockResolvedValue(true);
  const cleanup = session.bindConfirmation(request, first, jest.fn());
  cleanup();
  session.deactivate();
  session.bindConfirmation(request, second, jest.fn());
  session.activate();
  await completion;
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
  expect(onResult).toHaveBeenCalledWith({
    status: 'success',
    selection: { coordinates: origin },
  });
});

test('map ref/load received in pause only notify once parent reactivates', async () => {
  const onReady = jest.fn();
  const onLoad = jest.fn();
  const session = createMapPickerSession({ onReady, onLoad }, jest.fn());
  const { map } = open();
  session.activate();
  session.deactivate();
  session.attachMap(map);
  const event = { nativeEvent: {} } as never;
  session.events.onLoad!(event);
  expect(onReady).not.toHaveBeenCalled();
  expect(onLoad).not.toHaveBeenCalled();
  session.activate();
  await flush();
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onLoad).toHaveBeenCalledWith(event);
});
