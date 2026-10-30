import { openMapPicker } from '@amap/MapPicker/openMapPicker';
import { mapPickerRuntime, registerMapPickerHost } from '@amap/MapPicker/state';
import type {
  MapPickerHostBinding,
  MapPickerResult,
  MapPickerSession,
} from '@amap/MapPicker/types';
import { flush } from './runtimeFixtures';

jest.mock('@amap/location', () => ({
  getCurrentLocation: jest.fn(() => {
    throw new Error('Unexpected location request');
  }),
}));

let releaseHost: () => void;
beforeEach(() => {
  const host: MapPickerHostBinding = { mounted: false, generation: 0 };
  releaseHost = registerMapPickerHost(host);
});
afterEach(async () => {
  mapPickerRuntime.getState().presentation?.session.cancel();
  releaseHost();
  await flush();
});

function openWithAbortListener(onAbort: () => void) {
  const result = openMapPicker({ panel: { unselectedTitle: 'A' } });
  const { session } = mapPickerRuntime.getState().presentation!;
  session.activate();
  const query = session.controls.loadCandidates(({ signal }) => {
    signal!.addEventListener('abort', onAbort, { once: true });
    return new Promise(() => {});
  });
  return { result, query };
}

test('真实旧查询 abort listener 重入 C 后，外层 B 不覆盖 C，所有轮次单次结算且不复用序号', async () => {
  const settled: [string, MapPickerResult['status']][] = [];
  let nested!: Promise<MapPickerResult>;
  let nestedSession!: MapPickerSession;
  let nestedId = 0;
  const first = openWithAbortListener(() => {
    nested = openMapPicker({ panel: { unselectedTitle: 'C' } });
    const current = mapPickerRuntime.getState().presentation!;
    nestedSession = current.session;
    nestedId = current.id;
    nested.then((result) => settled.push(['C', result.status]));
  });
  const firstId = mapPickerRuntime.getState().presentation!.id;
  first.result.then((result) => settled.push(['A', result.status]));
  const outer = openMapPicker({ panel: { unselectedTitle: 'B' } });
  outer.then((result) => settled.push(['B', result.status]));
  await flush();
  const visible = mapPickerRuntime.getState().presentation;
  // Keep the failed/red run finite too: assertions, not awaiting an orphan, detect the bug.
  try {
    expect(visible?.session.config.panel?.unselectedTitle).toBe('C');
    expect(visible?.id).toBe(firstId + 2);
    expect(nestedId).toBe(firstId + 2);
    expect(settled).toEqual([
      ['A', 'cancelled'],
      ['B', 'cancelled'],
    ]);
    await expect(first.query).resolves.toEqual({ status: 'cancelled' });
    visible!.session.cancel();
    await expect(nested).resolves.toEqual({ status: 'cancelled' });
    await expect(outer).resolves.toEqual({ status: 'cancelled' });
    await flush();
    expect(settled).toEqual([
      ['A', 'cancelled'],
      ['B', 'cancelled'],
      ['C', 'cancelled'],
    ]);
    expect(mapPickerRuntime.getState().presentation).toBeNull();
  } finally {
    visible?.session.cancel();
    nestedSession!.cancel();
  }
});

test('旧取消过程中本次 signal 已 abort，未展示轮立即 cancelled，不发布已失效地图', async () => {
  const controller = new AbortController();
  const first = openWithAbortListener(() => controller.abort());
  const settled = jest.fn();
  const next = openMapPicker(
    { panel: { unselectedTitle: 'B' } },
    { signal: controller.signal },
  );
  next.then(settled);
  await flush();
  expect(mapPickerRuntime.getState().presentation).toBeNull();
  expect(settled).toHaveBeenCalledTimes(1);
  expect(settled).toHaveBeenCalledWith({ status: 'cancelled' });
  await expect(first.result).resolves.toEqual({ status: 'cancelled' });
});

test('旧取消过程中选中 Host 被释放，未展示轮结束，不发布至失效宿主', async () => {
  const first = openWithAbortListener(() => releaseHost());
  const settled = jest.fn();
  const next = openMapPicker({ panel: { unselectedTitle: 'B' } });
  next.then(settled);
  // Host release marks mounted=false synchronously; its deferred cleanup is not required to stop publication.
  expect(mapPickerRuntime.getState().presentation).toBeNull();
  await flush();
  expect(settled).toHaveBeenCalledTimes(1);
  expect(settled).toHaveBeenCalledWith({ status: 'cancelled' });
  await expect(first.result).resolves.toEqual({ status: 'cancelled' });
});
